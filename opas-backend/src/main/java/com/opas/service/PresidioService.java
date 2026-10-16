package com.opas.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Collections;
import java.util.List;
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
    private final RestClient restClient;
    private final String language;

    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 500;

    public PresidioService(RestClient.Builder restClientBuilder, @Value("${opas.presidio.url}") String presidioUrl,
            @Value("${opas.presidio.language:en}") String language,
            @Value("${opas.presidio.fail-open:false}") boolean failOpen) {
        this.restClient = restClientBuilder.baseUrl(presidioUrl).build();
        this.language = language;
        this.failOpen = failOpen;
    }

    public List<AnalysisResult> analyze(String text) {
        return executeWithRetry(() -> {
            List<AnalysisResult> results = restClient.post().uri("/analyze").body(new AnalyzeRequest(text, language))
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
        List<AnalysisResult> results = analyze(text);
        if (results.isEmpty()) {
            return text;
        }
        try {
            var response = executeWithRetry(() -> restClient.post().uri("/anonymize")
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

    record AnalyzeRequest(String text, String language) {
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
