package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;

@ExtendWith(MockitoExtension.class)
class PresidioServiceTest {

    @Mock
    private RestClient.Builder restClientBuilder;
    @Mock
    private RestClient restClient;
    @Mock
    private RestClient.RequestBodyUriSpec uriSpec;
    @Mock
    private RestClient.ResponseSpec responseSpec;

    private PresidioService service;

    @BeforeEach
    void setUp() {
        when(restClientBuilder.baseUrl(anyString())).thenReturn(restClientBuilder);
        when(restClientBuilder.build()).thenReturn(restClient);
        service = new PresidioService(restClientBuilder, "http://localhost:5001", "en");
    }

    private void mockPostChain() {
        when(restClient.post()).thenReturn(uriSpec);
        when(uriSpec.body(any(Object.class))).thenReturn(uriSpec);
        when(uriSpec.retrieve()).thenReturn(responseSpec);
    }

    @SuppressWarnings("unchecked")
    @Test
    void analyzeReturnsResults() {
        mockPostChain();
        when(uriSpec.uri("/analyze")).thenReturn(uriSpec);
        var results = List.of(new PresidioService.AnalysisResult("PERSON", 0, 5, 0.99));
        when(responseSpec.body(any(ParameterizedTypeReference.class))).thenReturn(results);

        List<PresidioService.AnalysisResult> actual = service.analyze("John Doe");
        assertEquals(1, actual.size());
        assertEquals("PERSON", actual.getFirst().entityType());
    }

    @SuppressWarnings("unchecked")
    @Test
    void analyzeThrowsOnException() {
        // Fail closed: a transport error must NOT be reported as "no PII found".
        mockPostChain();
        when(uriSpec.uri("/analyze")).thenReturn(uriSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenThrow(new RuntimeException("Connection refused"));

        assertThrows(PresidioUnavailableException.class, () -> service.analyze("John Doe"));
    }

    @SuppressWarnings("unchecked")
    @Test
    void containsPiiReturnsTrueWhenResultsExist() {
        mockPostChain();
        when(uriSpec.uri("/analyze")).thenReturn(uriSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenReturn(List.of(new PresidioService.AnalysisResult("EMAIL", 0, 10, 0.95)));

        assertTrue(service.containsPii("test@example.com"));
    }

    @SuppressWarnings("unchecked")
    @Test
    void containsPiiReturnsFalseWhenEmpty() {
        mockPostChain();
        when(uriSpec.uri("/analyze")).thenReturn(uriSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class))).thenReturn(List.of());

        assertFalse(service.containsPii("Hello world"));
    }

    @SuppressWarnings("unchecked")
    @Test
    void scrubPiiReturnsAnonymizedText() {
        // First call: analyze
        mockPostChain();
        when(uriSpec.uri("/analyze")).thenReturn(uriSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenReturn(List.of(new PresidioService.AnalysisResult("PERSON", 0, 8, 0.99)));

        // Second call: anonymize
        when(uriSpec.uri("/anonymize")).thenReturn(uriSpec);
        when(responseSpec.body(PresidioService.AnonymizeResponse.class))
                .thenReturn(new PresidioService.AnonymizeResponse("<ANONYMIZED>"));

        assertEquals("<ANONYMIZED>", service.scrubPii("John Doe"));
    }

    @SuppressWarnings("unchecked")
    @Test
    void scrubPiiReturnsOriginalWhenNoPiiFound() {
        mockPostChain();
        when(uriSpec.uri("/analyze")).thenReturn(uriSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class))).thenReturn(List.of());

        assertEquals("Hello world", service.scrubPii("Hello world"));
    }

    @SuppressWarnings("unchecked")
    @Test
    void scrubPiiThrowsOnAnonymizeFailure() {
        // Fail closed: if anonymization fails after PII was detected, the caller must
        // abort — never return the original (un-scrubbed) text.
        mockPostChain();
        when(uriSpec.uri("/analyze")).thenReturn(uriSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenReturn(List.of(new PresidioService.AnalysisResult("PERSON", 0, 8, 0.99)));

        when(uriSpec.uri("/anonymize")).thenReturn(uriSpec);
        when(responseSpec.body(PresidioService.AnonymizeResponse.class)).thenThrow(new RuntimeException("Timeout"));

        assertThrows(PresidioUnavailableException.class, () -> service.scrubPii("John Doe"));
    }
}
