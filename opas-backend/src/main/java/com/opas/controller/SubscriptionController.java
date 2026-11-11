package com.opas.controller;

import com.opas.dto.CheckoutRequest;
import com.opas.dto.CheckoutResponse;
import com.opas.dto.SubscriptionResponse;
import com.opas.dto.UsageResponse;
import com.opas.service.DecodeService;
import com.opas.service.DraftLetterService;
import com.opas.service.SubscriptionService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
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
    private final DraftLetterService draftLetterService;
    private final boolean remindersFreeForEveryone;

    public SubscriptionController(SubscriptionService subscriptionService, DecodeService decodeService,
            DraftLetterService draftLetterService,
            @Value("${opas.reminders.free-for-everyone:false}") boolean remindersFreeForEveryone) {
        this.subscriptionService = subscriptionService;
        this.decodeService = decodeService;
        this.draftLetterService = draftLetterService;
        this.remindersFreeForEveryone = remindersFreeForEveryone;
    }

    @GetMapping("/plans")
    public ResponseEntity<java.util.List<String>> getPlans() {
        return ResponseEntity.ok(subscriptionService.getPlans());
    }

    @GetMapping("/usage")
    public ResponseEntity<UsageResponse> getUsage(Authentication authentication) {
        String userId = authentication.getName();
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        UUID uid = UUID.fromString(userId);
        long remaining = decodeService.getRemainingDecodes(uid);
        int limit = decodeService.resolveLimit(uid);
        // Deadline reminders are Premium; during the beta they're on for everyone. The
        // reminders themselves are scheduled on the phone, which reads this flag.
        boolean remindersIncluded = remindersFreeForEveryone || subscriptionService.isPremium(uid);
        return ResponseEntity.ok(new UsageResponse(remaining, limit, "monthly",
                draftLetterService.draftsIncluded(uid), remindersIncluded));
    }

    @GetMapping
    public ResponseEntity<SubscriptionResponse> getSubscription(Authentication authentication) {
        String userId = authentication.getName();
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(SubscriptionResponse.from(subscriptionService.getSubscription(UUID.fromString(userId))));
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