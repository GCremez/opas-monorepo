package com.opas.controller;

import com.opas.service.IdempotencyService;
import com.opas.service.StripeWebhookService;
import com.stripe.model.Event;
import jakarta.servlet.http.HttpServletRequest;
import java.io.BufferedReader;
import java.time.Duration;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks")
public class WebhookController {

    private final StripeWebhookService stripeWebhookService;
    private final IdempotencyService idempotencyService;

    public WebhookController(StripeWebhookService stripeWebhookService, IdempotencyService idempotencyService) {
        this.stripeWebhookService = stripeWebhookService;
        this.idempotencyService = idempotencyService;
    }

    @PostMapping("/stripe")
    public ResponseEntity<Void> handleStripeWebhook(HttpServletRequest request) {
        String payload;
        try (BufferedReader reader = request.getReader()) {
            payload = reader.lines().collect(Collectors.joining());
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }

        String sigHeader = request.getHeader("Stripe-Signature");
        if (sigHeader == null || sigHeader.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Event event = stripeWebhookService.verifySignature(payload, sigHeader);

        if (idempotencyService.isProcessed(event.getId())) {
            return ResponseEntity.ok().build();
        }

        stripeWebhookService.handleEvent(event);
        idempotencyService.markProcessed(event.getId(), Duration.ofHours(24));
        return ResponseEntity.ok().build();
    }
}
