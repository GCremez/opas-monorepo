package com.opas.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class PresidioService {

    private static final Logger log = LoggerFactory.getLogger(PresidioService.class);

    /**
     * When true, Presidio unavailability degrades gracefully: the decode proceeds
     * with unredacted text and a warning is logged. When false (default), a
     * Presidio outage blocks all decodes that request PII scrubbing — the decode
     * fails and the user must retry. Set {@code opas.presidio.fail-open=true} to
     * prefer availability over privacy when the sidecar is down.
     */
    private final boolean failOpen;
    // Presidio's analyzer and anonymizer are separate services; /anonymize doesn't exist
    // on the analyzer, so sending both calls to one URL failed every scrub with a 404.
    private final RestClient analyzer;
    private final RestClient anonymizer;
    /** Used when the letter's language isn't one the Presidio image has a model for. */
    private final String language;
    /** Languages the Presidio image has models for (PRESIDIO_LANGUAGES), e.g. en,fi,sv. */
    private final Set<String> languages;

    /**
     * The only entity types removed. Asking for everything (Presidio's default) also
     * removed dates (DATE_TIME), so deadlines never reached the AI, and tagged words like
     * "Kela" and "Päätös" as nationalities (NRP). Dates, amounts, organisations and
     * reference numbers must stay: Opas needs them to explain the letter.
     */
    static final List<String> ENTITIES = loadEntities();

    /** Authorities and services named in letters, never removed (resources/presidio/allow-list.txt). */
    static final List<String> ALLOW_LIST = loadAllowList();

    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 500;

    public PresidioService(RestClient.Builder restClientBuilder, @Value("${opas.presidio.url}") String analyzerUrl,
            @Value("${opas.presidio.anonymizer-url}") String anonymizerUrl,
            @Value("${opas.presidio.language:en}") String language,
            @Value("${opas.presidio.languages:}") String languages,
            @Value("${opas.presidio.fail-open:false}") boolean failOpen) {
        // build() snapshots the builder, so the same builder can produce both clients.
        this.analyzer = restClientBuilder.baseUrl(analyzerUrl).build();
        this.anonymizer = restClientBuilder.baseUrl(anonymizerUrl).build();
        this.language = language;
        Set<String> enabled = new LinkedHashSet<>();
        for (String l : languages.split(",")) {
            if (!l.isBlank()) {
                enabled.add(l.trim().toLowerCase(java.util.Locale.ROOT));
            }
        }
        this.languages = enabled;
        this.failOpen = failOpen;
    }

    /** The language to analyse in: the letter's own if the image has a model for it. */
    String languageFor(String text) {
        String detected = detectLanguage(text);
        return languages.contains(detected) ? detected : language;
    }

    public List<AnalysisResult> analyze(String text) {
        return analyze(text, List.of());
    }

    /**
     * Finds personal data, including Finnish formats the stock English models miss, and
     * any of {@code knownNames} (the account holder's own name, the one most likely to
     * be on their letters).
     */
    public List<AnalysisResult> analyze(String text, Collection<String> knownNames) {
        String lang = languageFor(text);
        List<AdHocRecognizer> recognizers = new ArrayList<>(finnishRecognizers(lang));
        knownPerson(lang, knownNames).ifPresent(recognizers::add);
        AnalyzeRequest request = new AnalyzeRequest(text, lang, ENTITIES, ALLOW_LIST, recognizers);
        return executeWithRetry(() -> {
            List<AnalysisResult> results = analyzer.post().uri("/analyze").body(request)
                    .retrieve().body(new ParameterizedTypeReference<>() {
                    });
            return results != null ? results : Collections.emptyList();
        }, "analyze");
    }

    public boolean containsPii(String text) {
        return !analyze(text).isEmpty();
    }

    /**
     * Returns the anonymized text. Retries transient failures before giving up.
     * When {@code fail-open=true}, a Presidio outage after retries returns the
     * original text with a warning so the decode can proceed without scrubbing.
     * When {@code fail-open=false} (default), throws
     * {@link PresidioUnavailableException} so the decode aborts — fail-closed for
     * privacy.
     */
    public String scrubPii(String text) {
        return scrubPii(text, List.of());
    }

    /** Like {@link #scrubPii(String)}, also removing any of {@code knownNames}. */
    public String scrubPii(String text, Collection<String> knownNames) {
        List<AnalysisResult> results = analyze(text, knownNames);
        if (results.isEmpty()) {
            return text;
        }
        try {
            var response = executeWithRetry(() -> anonymizer.post().uri("/anonymize")
                    .body(new AnonymizeRequest(text, results)).retrieve()
                    .body(AnonymizeResponse.class), "anonymize");
            if (response == null) {
                throw new PresidioUnavailableException("Presidio anonymize returned no body", null);
            }
            return response.text();
        } catch (PresidioUnavailableException e) {
            if (failOpen) {
                log.warn("Presidio unavailable after retries, proceeding without PII scrubbing "
                        + "(fail-open mode): {}", e.getMessage());
                return text;
            }
            throw e;
        }
    }

    private <T> T executeWithRetry(java.util.function.Supplier<T> operation, String operationName) {
        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return operation.get();
            } catch (Exception e) {
                lastException = e;
                if (attempt < MAX_RETRIES) {
                    long delay = INITIAL_BACKOFF_MS * (1L << (attempt - 1));
                    log.warn("Presidio {} failed (attempt {}/{}), retrying in {}ms: {}",
                            operationName, attempt, MAX_RETRIES, delay, e.getMessage());
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new PresidioUnavailableException(
                                "Interrupted during Presidio retry", ie);
                    }
                }
            }
        }
        throw new PresidioUnavailableException(
                "Presidio " + operationName + " failed after " + MAX_RETRIES + " attempts", lastException);
    }

    // Finnish personal data patterns live in resources/presidio/patterns.json, shared with
    // the Presidio image test (opas-infra/presidio/test) so the two can't drift apart:
    // - the henkilötunnus (Presidio has no recognizer for it; the built-in models matched
    //   only part of it, so its last four characters reached the AI),
    // - street addresses (Mannerheimintie 12 A 5) and postcode + town (00100 HELSINKI),
    // - Finnish mobile numbers (040…, 050…) and +358 numbers.
    // Presidio runs them with Python's re and IGNORECASE. Word edges are spelled out
    // instead of \b, which treats Finnish letters (ä, ö, å) differently in Java and Python.
    // Latin letters with accents (Latin-1 and Latin Extended-A): å ä ö, but also í ñ ç ł ő…
    static final String LETTERS = "A-Za-zÀ-ÖØ-öø-ÿĀ-ž";
    private static final String WORD_START = "(?<![" + LETTERS + "0-9])";
    private static final String WORD_END = "(?![" + LETTERS + "0-9])";

    private record PatternDef(String name, String entity, String pattern, double score, String regex) {
    }

    private static final List<PatternDef> FINNISH_PATTERNS = loadPatterns();

    static List<AdHocRecognizer> finnishRecognizers(String language) {
        return FINNISH_PATTERNS.stream()
                .map(d -> new AdHocRecognizer(d.name(), language, d.entity(),
                        List.of(new Pattern(d.pattern(), d.regex(), d.score()))))
                .toList();
    }

    static AdHocRecognizer finnishPersonalId(String language) {
        return finnishRecognizers(language).stream()
                .filter(r -> r.supportedEntity().equals("FI_PERSONAL_ID")).findFirst().orElseThrow();
    }

    private static com.fasterxml.jackson.databind.JsonNode patternsJson() {
        try (var in = PresidioService.class.getResourceAsStream("/presidio/patterns.json")) {
            if (in == null) {
                throw new IllegalStateException("presidio/patterns.json is missing");
            }
            return new com.fasterxml.jackson.databind.ObjectMapper().readTree(in);
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Couldn't read presidio/patterns.json", e);
        }
    }

    private static List<String> loadEntities() {
        List<String> entities = new ArrayList<>();
        patternsJson().get("entities").forEach(e -> entities.add(e.asText()));
        return List.copyOf(entities);
    }

    private static List<PatternDef> loadPatterns() {
        List<PatternDef> defs = new ArrayList<>();
        for (var r : patternsJson().get("recognizers")) {
            defs.add(new PatternDef(r.get("name").asText(), r.get("entity").asText(), r.get("pattern").asText(),
                    r.get("score").asDouble(), r.get("regex").asText()));
        }
        return List.copyOf(defs);
    }


    /**
     * Matches the given names and, for names of 4+ letters, Finnish case endings on them
     * (Priya → Priyalle, Sharma → Sharman). Shorter names match only exactly, or "Li"
     * would also remove "liite". Stem changes (Matti → Matin) aren't caught.
     */
    static java.util.Optional<AdHocRecognizer> knownPerson(String language, Collection<String> names) {
        Set<String> longNames = new LinkedHashSet<>();
        Set<String> shortNames = new LinkedHashSet<>();
        for (String name : names) {
            if (name == null) {
                continue;
            }
            for (String token : name.split("[\\s,]+")) {
                // Letters, hyphens and apostrophes only, so nothing needs regex escaping.
                String clean = token.replaceAll("[^" + LETTERS + "'-]", "");
                long letters = clean.chars().filter(Character::isLetter).count();
                if (letters >= 4) {
                    longNames.add(clean);
                } else if (letters >= 2) {
                    shortNames.add(clean);
                }
            }
        }
        List<Pattern> patterns = new ArrayList<>();
        if (!longNames.isEmpty()) {
            patterns.add(new Pattern("known_name_inflected", WORD_START + "(?:" + String.join("|", longNames) + ")["
                    + LETTERS + "]{0,6}" + WORD_END, 0.85));
        }
        if (!shortNames.isEmpty()) {
            patterns.add(new Pattern("known_name_exact", WORD_START + "(?:" + String.join("|", shortNames) + ")"
                    + WORD_END, 0.85));
        }
        return patterns.isEmpty() ? java.util.Optional.empty()
                : java.util.Optional.of(new AdHocRecognizer("Account holder's name", language, "PERSON", patterns));
    }

    record AnalyzeRequest(String text, String language, List<String> entities,
            @JsonProperty("allow_list") List<String> allowList,
            @JsonProperty("ad_hoc_recognizers") List<AdHocRecognizer> adHocRecognizers) {
    }

    private static final Set<String> FI_WORDS = Set.of("ja", "on", "että", "ei", "tai", "sinun", "päätös",
            "hakemus", "mennessä", "kuluessa", "olemme", "voit", "tämä", "sinulle", "lisätietoja", "myös", "asia");
    private static final Set<String> SV_WORDS = Set.of("och", "att", "är", "inte", "eller", "din", "ditt",
            "beslut", "ansökan", "senast", "inom", "vi", "du", "kan", "för", "med", "på", "har", "om");
    private static final Set<String> EN_WORDS = Set.of("the", "and", "is", "your", "you", "of", "to",
            "decision", "application", "by", "within", "was", "on", "at");

    /**
     * Finnish, Swedish or English, by counting common words. Good enough to pick the
     * language model; defaults to Finnish, the language most letters are in.
     */
    static String detectLanguage(String text) {
        int fi = 0;
        int sv = 0;
        int en = 0;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("[a-zåäöé]+")
                .matcher(text.toLowerCase(java.util.Locale.ROOT));
        while (m.find()) {
            String w = m.group();
            fi += FI_WORDS.contains(w) ? 1 : 0;
            sv += SV_WORDS.contains(w) ? 1 : 0;
            en += EN_WORDS.contains(w) ? 1 : 0;
        }
        if (sv > fi && sv >= en) {
            return "sv";
        }
        if (en > fi && en > sv) {
            return "en";
        }
        return "fi";
    }

    private static List<String> loadAllowList() {
        try (var in = PresidioService.class.getResourceAsStream("/presidio/allow-list.txt")) {
            if (in == null) {
                throw new IllegalStateException("presidio/allow-list.txt is missing");
            }
            return new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).lines()
                    .map(String::trim).filter(l -> !l.isEmpty() && !l.startsWith("#")).toList();
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Couldn't read presidio/allow-list.txt", e);
        }
    }

    record AdHocRecognizer(String name, @JsonProperty("supported_language") String supportedLanguage,
            @JsonProperty("supported_entity") String supportedEntity, List<Pattern> patterns) {
    }

    record Pattern(String name, String regex, double score) {
    }

    // Presidio's anonymizer API is snake_case; a camelCase "analyzerResults" key is
    // ignored and the request is rejected for missing analyzer results.
    record AnonymizeRequest(String text, @JsonProperty("analyzer_results") List<AnalysisResult> analyzerResults) {
    }

    record AnonymizeResponse(String text) {
    }

    public record AnalysisResult(@JsonProperty("entity_type") String entityType, int start, int end, double score) {
    }
}
