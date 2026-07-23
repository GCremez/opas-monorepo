package com.opas.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Collections;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class PresidioService {

    private final RestClient restClient;

    public PresidioService(RestClient.Builder restClientBuilder, @Value("${opas.presidio.url}") String presidioUrl) {
        this.restClient = restClientBuilder.baseUrl(presidioUrl).build();
    }

    public List<AnalysisResult> analyze(String text) {
        try {
            List<AnalysisResult> results = restClient.post().uri("/analyze").body(new AnalyzeRequest(text, "en"))
                    .retrieve().body(new ParameterizedTypeReference<>() {
                    });
            return results != null ? results : Collections.emptyList();
        } catch (Exception e) {
            // Do NOT swallow and return empty — an empty result is indistinguishable
            // from "no PII found", which would make the caller proceed with raw text.
            throw new PresidioUnavailableException("Presidio analyze failed", e);
        }
    }

    public boolean containsPii(String text) {
        return !analyze(text).isEmpty();
    }

    /**
     * Returns the anonymized text. Fails closed: if Presidio is unreachable or errors,
     * this throws {@link PresidioUnavailableException} rather than returning the
     * original (un-scrubbed) text, so a scrub-requested decode aborts instead of
     * leaking PII to the LLM.
     */
    public String scrubPii(String text) {
        List<AnalysisResult> results = analyze(text);
        if (results.isEmpty()) {
            return text;
        }
        try {
            var response = restClient.post().uri("/anonymize").body(new AnonymizeRequest(text, results)).retrieve()
                    .body(AnonymizeResponse.class);
            if (response == null) {
                throw new PresidioUnavailableException("Presidio anonymize returned no body", null);
            }
            return response.text();
        } catch (PresidioUnavailableException e) {
            throw e;
        } catch (Exception e) {
            throw new PresidioUnavailableException("Presidio anonymize failed", e);
        }
    }

    record AnalyzeRequest(String text, String language) {
    }

    record AnonymizeRequest(String text, List<AnalysisResult> analyzerResults) {
    }

    record AnonymizeResponse(String text) {
    }

    public record AnalysisResult(@JsonProperty("entity_type") String entityType, int start, int end, double score) {
    }
}
