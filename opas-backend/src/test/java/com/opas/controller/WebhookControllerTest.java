package com.opas.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.opas.config.GlobalExceptionHandler;
import com.opas.repository.SubscriptionRepository;
import com.opas.service.IdempotencyService;
import com.opas.service.StripeWebhookService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Exercises real Stripe signature verification end to end through the controller, with a
 * payload shaped like Stripe's: pretty-printed JSON with newlines.
 */
class WebhookControllerTest {

    private static final String SECRET = "whsec_test_secret";
    private static final String PAYLOAD = """
            {
              "id": "evt_test_1",
              "object": "event",
              "type": "invoice.created",
              "data": {
                "object": {}
              }
            }""";

    private IdempotencyService idempotencyService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        idempotencyService = mock(IdempotencyService.class);
        when(idempotencyService.markProcessed(anyString(), any())).thenReturn(true);
        var service = new StripeWebhookService(mock(SubscriptionRepository.class), new SimpleMeterRegistry(),
                SECRET, "price_premium");
        mvc = MockMvcBuilders.standaloneSetup(new WebhookController(service, idempotencyService))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    private static String signatureHeader(String payload) throws Exception {
        long timestamp = System.currentTimeMillis() / 1000;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] sig = mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
        return "t=" + timestamp + ",v1=" + HexFormat.of().formatHex(sig);
    }

    @Test
    void acceptsCorrectlySignedMultiLinePayload() throws Exception {
        mvc.perform(post("/api/v1/webhooks/stripe").contentType(MediaType.APPLICATION_JSON)
                .header("Stripe-Signature", signatureHeader(PAYLOAD)).content(PAYLOAD))
                .andExpect(status().isOk());
        verify(idempotencyService).markProcessed(eq("evt_test_1"), any());
    }

    @Test
    void rejectsTamperedPayload() throws Exception {
        mvc.perform(post("/api/v1/webhooks/stripe").contentType(MediaType.APPLICATION_JSON)
                .header("Stripe-Signature", signatureHeader(PAYLOAD))
                .content(PAYLOAD.replace("invoice.created", "invoice.paid")))
                .andExpect(status().isBadRequest());
        verify(idempotencyService, never()).markProcessed(anyString(), any());
    }

    @Test
    void rejectsMissingSignature() throws Exception {
        mvc.perform(post("/api/v1/webhooks/stripe").contentType(MediaType.APPLICATION_JSON).content(PAYLOAD))
                .andExpect(status().isBadRequest());
    }
}
