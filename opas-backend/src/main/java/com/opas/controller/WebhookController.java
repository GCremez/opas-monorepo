package com.opas.controller;

import com.opas.service.IdempotencyService;
import com.opas.service.StripeWebhookService;
import com.stripe.model.Event;
import java.time.Duration;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
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
    public ResponseEntity<Void> handleStripeWebhook(
            // The exact bytes Stripe signed. Re-assembling the body line by line drops the
            // newlines of Stripe's pretty-printed JSON and every signature check fails.
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        if (sigHeader == null || sigHeader.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Event event = stripeWebhookService.verifySignature(payload, sigHeader);

        // Claim the event atomically BEFORE handling it. Stripe delivers at-least-once
        // and retries overlap, so a check-then-handle-then-mark sequence lets two
        // concurrent copies of one event both pass the check and both apply the side
        // effect. setIfAbsent returns true only for the copy that wins the claim.
        if (!idempotencyService.markProcessed(event.getId(), Duration.ofHours(24))) {
            return ResponseEntity.ok().build();
        }

        try {
            stripeWebhookService.handleEvent(event);
        } catch (RuntimeException e) {
            // Handling failed after we claimed the key. Release it so Stripe's retry
            // can re-deliver and be processed, instead of being swallowed as "done".
            idempotencyService.release(event.getId());
            throw e;
        }
        return ResponseEntity.ok().build();
    }
}
