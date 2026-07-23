package com.opas.dto;

import com.opas.domain.Subscription;
import java.time.Instant;
import java.util.UUID;
import org.springframework.lang.Nullable;

/**
 * Client-facing view of a subscription. Deliberately omits the related User entity
 * (which carries the bcrypt password hash and email) and the Stripe customer/
 * subscription ids — controllers must never serialize the JPA entity directly.
 */
public record SubscriptionResponse(
        UUID id,
        String tier,
        String status,
        @Nullable Instant currentPeriodStart,
        @Nullable Instant currentPeriodEnd) {

    public static SubscriptionResponse from(Subscription s) {
        return new SubscriptionResponse(s.getId(), s.getTier(), s.getStatus(),
                s.getCurrentPeriodStart(), s.getCurrentPeriodEnd());
    }
}
