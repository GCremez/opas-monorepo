package com.opas.controller;

import com.opas.domain.Subscription;
import com.opas.dto.CheckoutRequest;
import com.opas.dto.CheckoutResponse;
import com.opas.dto.UsageResponse;
import com.opas.service.DecodeService;
import com.opas.service.SubscriptionService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/subscription")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final DecodeService decodeService;

    public SubscriptionController(SubscriptionService subscriptionService, DecodeService decodeService) {
        this.subscriptionService = subscriptionService;
        this.decodeService = decodeService;
    }

    @GetMapping("/usage")
    public ResponseEntity<UsageResponse> getUsage(Authentication authentication) {
        String userId = authentication.getName();
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        UUID uid = UUID.fromString(userId);
        long remaining = decodeService.getRemainingDecodes(uid);
        int limit = decodeService.resolveLimit(uid);
        return ResponseEntity.ok(new UsageResponse(remaining, limit, "monthly"));
    }

    @GetMapping
    public ResponseEntity<Subscription> getSubscription(Authentication authentication) {
        String userId = authentication.getName();
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(subscriptionService.getSubscription(UUID.fromString(userId)));
    }

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> createCheckoutSession(Authentication authentication,
            @Valid @RequestBody CheckoutRequest request) {
        String userId = authentication.getName();
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String url = subscriptionService.createCheckoutSession(UUID.fromString(userId), request.priceId());
        return ResponseEntity.ok(new CheckoutResponse(url));
    }

    @PostMapping("/portal")
    public ResponseEntity<CheckoutResponse> createPortalSession(Authentication authentication) {
        String userId = authentication.getName();
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String url = subscriptionService.createPortalSession(UUID.fromString(userId));
        return ResponseEntity.ok(new CheckoutResponse(url));
    }
}