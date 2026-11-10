package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Runs the Finnish ad-hoc patterns PresidioService sends to Presidio over
 * redaction/sample-letters.txt, with the flags Presidio applies (IGNORECASE, DOTALL,
 * MULTILINE). Every [[span]] must be fully matched; no match may touch a {{span}}.
 *
 * Presidio's own built-in recognizers (the English NER model, IBAN, email) aren't run
 * here. The IBAN line in the samples is left to Presidio's IBAN recognizer.
 */
class FinnishPiiPatternsTest {

    private static final int FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.DOTALL | Pattern.MULTILINE;
    private static final Pattern MARK = Pattern.compile("\\[\\[(.+?)]]|\\{\\{(.+?)}}");

    record Span(int start, int end, String text) {
    }

    record Letter(String accountName, String text, List<Span> remove, List<Span> keep) {
    }

    @Test
    void sampleLettersAreRedactedWithoutLosingReferences() throws IOException {
        List<Letter> letters = load();
        assertEquals(20, letters.size(), "the test set should have 20 letters");

        List<String> failures = new ArrayList<>();
        for (Letter letter : letters) {
            List<Pattern> patterns = new ArrayList<>();
            for (PresidioService.AdHocRecognizer r : PresidioService.finnishRecognizers("en")) {
                r.patterns().forEach(p -> patterns.add(Pattern.compile(p.regex(), FLAGS)));
            }
            PresidioService.knownPerson("en", List.of(letter.accountName()))
                    .ifPresent(r -> r.patterns().forEach(p -> patterns.add(Pattern.compile(p.regex(), FLAGS))));

            List<int[]> matches = new ArrayList<>();
            for (Pattern p : patterns) {
                Matcher m = p.matcher(letter.text());
                while (m.find()) {
                    matches.add(new int[] {m.start(), m.end()});
                }
            }
            for (Span s : letter.remove()) {
                if (isIbanLine(s)) {
                    continue;
                }
                boolean covered = coveredBy(s, matches);
                if (!covered) {
                    failures.add("not removed: \"" + s.text() + "\" (" + letter.accountName() + ")");
                }
            }
            for (Span s : letter.keep()) {
                for (int[] m : matches) {
                    if (m[0] < s.end() && s.start() < m[1]) {
                        failures.add("removed but needed: \"" + s.text() + "\" by \""
                                + letter.text().substring(m[0], m[1]) + "\" (" + letter.accountName() + ")");
                    }
                }
            }
        }
        assertTrue(failures.isEmpty(), String.join("\n", failures));
    }

    @Test
    void shortNamesMatchOnlyWhole() {
        var recognizer = PresidioService.knownPerson("en", List.of("Li Wei")).orElseThrow();
        List<Pattern> patterns = recognizer.patterns().stream().map(p -> Pattern.compile(p.regex(), FLAGS)).toList();
        assertTrue(patterns.stream().anyMatch(p -> p.matcher("Hei Li Wei").find()));
        assertFalse(patterns.stream().anyMatch(p -> p.matcher("Liite 1").find()), "\"Li\" must not remove \"Liite\"");
    }

    @Test
    void noNameMeansNoNameRecognizer() {
        assertTrue(PresidioService.knownPerson("en", java.util.Collections.singletonList(null)).isEmpty());
        assertTrue(PresidioService.knownPerson("en", List.of(" ")).isEmpty());
    }

    // IBANs are left to Presidio's built-in IBAN_CODE recognizer.
    private static boolean isIbanLine(Span s) {
        return s.text().matches("FI\\d{2}( ?\\d{4}){3} ?\\d{2}");
    }

    private static boolean coveredBy(Span s, List<int[]> matches) {
        boolean[] hit = new boolean[s.end() - s.start()];
        for (int[] m : matches) {
            for (int i = Math.max(m[0], s.start()); i < Math.min(m[1], s.end()); i++) {
                hit[i - s.start()] = true;
            }
        }
        for (int i = 0; i < hit.length; i++) {
            if (!hit[i] && !Character.isWhitespace(s.text().charAt(i)) && s.text().charAt(i) != ',') {
                return false;
            }
        }
        return true;
    }

    private static List<Letter> load() throws IOException {
        String all;
        try (InputStream in = FinnishPiiPatternsTest.class.getResourceAsStream("/redaction/sample-letters.txt")) {
            all = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        List<Letter> letters = new ArrayList<>();
        for (String block : all.split("(?m)^=== ")) {
            if (block.isBlank() || block.startsWith("#")) {
                continue;
            }
            int nl = block.indexOf('\n');
            String name = block.substring(0, nl).trim();
            String marked = block.substring(nl + 1);
            StringBuilder text = new StringBuilder();
            List<Span> remove = new ArrayList<>();
            List<Span> keep = new ArrayList<>();
            Matcher m = MARK.matcher(marked);
            int last = 0;
            while (m.find()) {
                text.append(marked, last, m.start());
                String inner = m.group(1) != null ? m.group(1) : m.group(2);
                Span span = new Span(text.length(), text.length() + inner.length(), inner);
                (m.group(1) != null ? remove : keep).add(span);
                text.append(inner);
                last = m.end();
            }
            text.append(marked.substring(last));
            letters.add(new Letter(name, text.toString(), remove, keep));
        }
        return letters;
    }
}
