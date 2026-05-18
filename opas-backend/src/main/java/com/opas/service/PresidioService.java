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

    private final RestClient restClient;

    public PresidioService(RestClient.Builder restClientBuilder, @Value("${opas.presidio.url}") String presidioUrl) {
        this.restClient = restClientBuilder.baseUrl(presidioUrl).build();
    }

    public List<AnalysisResult> analyze(String text) {
        try {
            return restClient.post().uri("/analyze").body(new AnalyzeRequest(text, "en")).retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });
        } catch (Exception e) {
            log.warn("Presidio analyze failed, returning empty", e);
            return Collections.emptyList();
        }
    }

    public boolean containsPii(String text) {
        return !analyze(text).isEmpty();
    }

    public String scrubPii(String text) {
        List<AnalysisResult> results = analyze(text);
        if (results.isEmpty()) {
            return text;
        }
        try {
            var response = restClient.post().uri("/anonymize").body(new AnonymizeRequest(text, results)).retrieve()
                    .body(AnonymizeResponse.class);
            return response != null ? response.text() : text;
        } catch (Exception e) {
            log.warn("Presidio anonymize failed, returning original text", e);
            return text;
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
