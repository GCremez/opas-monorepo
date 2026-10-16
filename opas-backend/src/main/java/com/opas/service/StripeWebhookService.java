package com.opas.service;

import com.opas.repository.SubscriptionRepository;
import com.stripe.exception.SignatureVerificationException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Price;
import com.stripe.model.StripeObject;
import com.stripe.model.Invoice;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import java.time.Instant;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StripeWebhookService {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookService.class);

    /** Stripe statuses after which the customer no longer has a paid plan. */
    private static final Set<String> ENDED_STATUSES = Set.of("canceled", "unpaid", "incomplete_expired");

    private final SubscriptionRepository subscriptionRepository;
    private final String webhookSecret;
    private final Set<String> premiumPriceIds;
    private final Counter upgradedCounter;
    private final Counter downgradedCounter;
    private final Counter cancelledCounter;

    public StripeWebhookService(SubscriptionRepository subscriptionRepository,
            MeterRegistry registry,
            @Value("${opas.stripe.webhook-secret}") String webhookSecret,
            @Value("${opas.stripe.premium-price-ids:}") String premiumPriceIds) {
        this.subscriptionRepository = subscriptionRepository;
        this.webhookSecret = webhookSecret;
        // Same allowlist checkout is restricted to (SubscriptionService), so the tier a
        // subscription maps to always matches what the customer was allowed to buy.
        this.premiumPriceIds = Arrays.stream(premiumPriceIds.split(",")).map(String::trim)
                .filter(id -> !id.isEmpty()).collect(Collectors.toUnmodifiableSet());
        this.upgradedCounter = Counter.builder("opas.subscription.upgraded")
                .description("Subscriptions upgraded to premium").register(registry);
        this.downgradedCounter = Counter.builder("opas.subscription.downgraded")
                .description("Subscriptions downgraded to free").register(registry);
        this.cancelledCounter = Counter.builder("opas.subscription.cancelled")
                .description("Subscriptions cancelled").register(registry);
    }

    public Event verifySignature(String payload, String sigHeader) {
        try {
            return Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            throw new IllegalArgumentException("Invalid webhook signature");
        }
    }

    @Transactional
    public void handleEvent(Event event) {
        switch (event.getType()) {
        case "checkout.session.completed" -> handleCheckoutCompleted(event);
        case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
        case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
        case "invoice.paid" -> handleInvoicePaid(event);
        default -> log.debug("Unhandled event type: {}", event.getType());
        }
    }

    @SuppressWarnings("unchecked")
    @Nullable
    private static <T extends StripeObject> T deserialize(Event event, Class<T> cls) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        if (deserializer.getObject().isPresent()) {
            Object obj = deserializer.getObject().get();
            if (cls.isInstance(obj)) {
                return (T) obj;
            }
        }
        log.warn("Failed to deserialize event data as {}", cls.getSimpleName());
        return null;
    }

    private void handleCheckoutCompleted(Event event) {
        Session session = deserialize(event, Session.class);
        if (session == null)
            return;

        // Defense-in-depth: only upgrade on a genuinely paid checkout. Combined with
        // the server-side price allowlist at session creation, this stops upgrades
        // from unpaid / $0 / incomplete sessions.
        if (!"paid".equals(session.getPaymentStatus())) {
            log.warn("Ignoring checkout session {} with payment_status={}", session.getId(),
                    session.getPaymentStatus());
            return;
        }

        String customerId = session.getCustomer();
        String subscriptionId = session.getSubscription();
        String clientReferenceId = session.getClientReferenceId();

        if (clientReferenceId == null) {
            log.warn("Checkout session missing clientReferenceId");
            return;
        }

        if (customerId == null) {
            log.warn("Checkout session missing customerId");
            return;
        }

        subscriptionRepository.findByStripeCustomerId(customerId)
                .or(() -> subscriptionRepository.findByUserId(java.util.UUID.fromString(clientReferenceId)))
                .ifPresentOrElse(sub -> {
                    sub.setStripeCustomerId(customerId);
                    sub.setStripeSubscriptionId(subscriptionId);
                    boolean wasPremium = "premium".equals(sub.getTier());
                    sub.setTier("premium");
                    sub.setStatus("active");
                    subscriptionRepository.save(sub);
                    if (!wasPremium) {
                        upgradedCounter.increment();
                    }
                }, () -> log.warn("No subscription found for checkout session {}", session.getId()));
    }

    private void handleSubscriptionUpdated(Event event) {
        com.stripe.model.Subscription stripeSub = deserialize(event, com.stripe.model.Subscription.class);
        if (stripeSub == null)
            return;

        subscriptionRepository.findByStripeSubscriptionId(stripeSub.getId()).ifPresent(sub -> {
            sub.setStatus(stripeSub.getStatus());
            if (stripeSub.getCurrentPeriodStart() != null) {
                sub.setCurrentPeriodStart(Instant.ofEpochSecond(stripeSub.getCurrentPeriodStart()));
            }
            if (stripeSub.getCurrentPeriodEnd() != null) {
                sub.setCurrentPeriodEnd(Instant.ofEpochSecond(stripeSub.getCurrentPeriodEnd()));
            }
            String tier = extractTier(stripeSub);
            if (tier != null) {
                String prevTier = sub.getTier();
                sub.setTier(tier);
                if (!tier.equals(prevTier)) {
                    if ("premium".equals(tier)) {
                        upgradedCounter.increment();
                    } else if ("free".equals(tier)) {
                        downgradedCounter.increment();
                    }
                }
            }
            subscriptionRepository.save(sub);
        });
    }

    private void handleSubscriptionDeleted(Event event) {
        com.stripe.model.Subscription stripeSub = deserialize(event, com.stripe.model.Subscription.class);
        if (stripeSub == null)
            return;

        subscriptionRepository.findByStripeSubscriptionId(stripeSub.getId()).ifPresent(sub -> {
            sub.setStatus("canceled");
            sub.setTier("free");
            subscriptionRepository.save(sub);
            cancelledCounter.increment();
        });
    }

    private void handleInvoicePaid(Event event) {
        Invoice invoice = deserialize(event, Invoice.class);
        if (invoice == null)
            return;

        String subscriptionId = invoice.getSubscription();
        if (subscriptionId == null || subscriptionId.isBlank()) {
            log.warn("Invoice {} has no subscription", invoice.getId());
            return;
        }

        subscriptionRepository.findByStripeSubscriptionId(subscriptionId).ifPresent(sub -> {
            Long periodEnd = invoice.getPeriodEnd();
            if (periodEnd != null) {
                sub.setCurrentPeriodEnd(Instant.ofEpochSecond(periodEnd));
            }
            subscriptionRepository.save(sub);
        });
    }

    /**
     * The plan a Stripe subscription entitles the customer to, or null to leave the stored
     * tier unchanged. An ended subscription is always free; otherwise the tier follows the
     * subscribed price. Stripe product ids are opaque ({@code prod_…}), so they can't be
     * used to tell plans apart.
     */
    @Nullable
    String extractTier(com.stripe.model.Subscription stripeSub) {
        if (ENDED_STATUSES.contains(stripeSub.getStatus())) {
            return "free";
        }
        var items = stripeSub.getItems() != null ? stripeSub.getItems().getData() : null;
        if (items == null || items.isEmpty())
            return null;
        Price price = items.get(0).getPrice();
        if (price == null || price.getId() == null)
            return null;
        if (premiumPriceIds.isEmpty()) {
            // Without an allowlist every renewal would look like a downgrade. Leave the
            // tier alone and make the misconfiguration loud instead.
            log.warn("opas.stripe.premium-price-ids is not configured; not changing tier for {}",
                    stripeSub.getId());
            return null;
        }
        return premiumPriceIds.contains(price.getId()) ? "premium" : "free";
    }
}
