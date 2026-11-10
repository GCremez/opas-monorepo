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
        service = new PresidioService(restClientBuilder, "http://localhost:5001", "http://localhost:5002", "en", "", false);
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

    @Test
    void anonymizeRequestUsesPresidioSnakeCaseKeys() throws Exception {
        var request = new PresidioService.AnonymizeRequest("Call 040 123 4567",
                java.util.List.of(new PresidioService.AnalysisResult("PHONE_NUMBER", 5, 17, 0.9)));

        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(request);

        assertTrue(json.contains("\"analyzer_results\""), json);
        assertTrue(json.contains("\"entity_type\":\"PHONE_NUMBER\""), json);
        assertFalse(json.contains("analyzerResults"), json);
    }

    @Test
    void analyzerAndAnonymizerUseTheirOwnServices() {
        // Regression: both calls went to the analyzer URL, which has no /anonymize.
        org.mockito.Mockito.verify(restClientBuilder).baseUrl("http://localhost:5001");
        org.mockito.Mockito.verify(restClientBuilder).baseUrl("http://localhost:5002");
    }

    @Test
    void analyzeRequestCarriesFinnishPersonalIdRecognizer() throws Exception {
        var request = new PresidioService.AnalyzeRequest("x", "fi", PresidioService.ENTITIES,
                PresidioService.ALLOW_LIST, java.util.List.of(PresidioService.finnishPersonalId("fi")));

        var json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(
                new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(request));

        var recognizer = json.get("ad_hoc_recognizers").get(0);
        assertEquals("FI_PERSONAL_ID", recognizer.get("supported_entity").asText());
        assertEquals("fi", recognizer.get("supported_language").asText());
        java.util.regex.Pattern hetu = java.util.regex.Pattern.compile(
                recognizer.get("patterns").get(0).get("regex").asText());
        assertTrue(hetu.matcher("Henkilötunnus 010190-123A").find());
        assertTrue(hetu.matcher("131052A308T").find()); // 2000s century sign
        assertFalse(hetu.matcher("2026/AT/48213").find());
    }

    @SuppressWarnings("unchecked")
    private PresidioService.AnalyzeRequest sentAnalyzeRequest(PresidioService svc, String text) {
        mockPostChain();
        when(uriSpec.uri("/analyze")).thenReturn(uriSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class))).thenReturn(List.of());
        svc.analyze(text, List.of("Priya Sharma"));
        var captor = org.mockito.ArgumentCaptor.forClass(Object.class);
        org.mockito.Mockito.verify(uriSpec).body(captor.capture());
        return (PresidioService.AnalyzeRequest) captor.getValue();
    }

    @Test
    void neverAsksForDatesOrOrganisations() throws Exception {
        var request = sentAnalyzeRequest(service, "Toimita selvitys 14.6.2026 mennessä. Kela");

        // Asking for every entity type removed deadlines (DATE_TIME) and tagged "Kela" as NRP.
        assertFalse(request.entities().contains("DATE_TIME"));
        assertFalse(request.entities().contains("NRP"));
        assertFalse(request.entities().contains("ORGANIZATION"));
        assertTrue(request.entities().containsAll(List.of("PERSON", "FI_PERSONAL_ID", "FI_ADDRESS", "PHONE_NUMBER")));
        assertTrue(request.allowList().containsAll(List.of("Kela", "Migri", "Verohallinto", "Skatteförvaltningen")));

        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(request);
        assertTrue(json.contains("\"allow_list\""), json);
        assertTrue(json.contains("\"entities\""), json);
    }

    @Test
    void usesTheLettersLanguageOnlyWhenTheImageHasIt() {
        String finnish = "Päätös asumistuesta. Toimita selvitys 14.6.2026 mennessä, tai tuki ei jatku.";
        // Stock image (English only): stays on the configured default.
        assertEquals("en", sentAnalyzeRequest(service, finnish).language());

        var multi = new PresidioService(restClientBuilder, "http://localhost:5001", "http://localhost:5002", "en",
                "en, fi, sv", false);
        org.mockito.Mockito.clearInvocations(uriSpec);
        var request = sentAnalyzeRequest(multi, finnish);
        assertEquals("fi", request.language());
        // The Finnish patterns and the account holder's name go in the same language.
        assertTrue(request.adHocRecognizers().stream().allMatch(r -> r.supportedLanguage().equals("fi")));
    }

    @Test
    void detectsFinnishSwedishAndEnglishLetters() {
        assertEquals("fi", PresidioService.detectLanguage("Päätös asumistuesta. Toimita selvitys mennessä, tai tuki ei jatku."));
        assertEquals("sv", PresidioService.detectLanguage("Beslut om skattekort för 2026. Betala senast 31.8.2026 och kontakta oss om du har frågor."));
        assertEquals("en", PresidioService.detectLanguage("Your application was received. The decision will be sent to you by post."));
        assertEquals("fi", PresidioService.detectLanguage("1234/2026"));
    }
}
