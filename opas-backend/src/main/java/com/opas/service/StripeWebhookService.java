package com.opas.service;

import com.opas.repository.SubscriptionRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Price;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StripeWebhookService {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookService.class);

    private final SubscriptionRepository subscriptionRepository;
    private final String webhookSecret;

    public StripeWebhookService(SubscriptionRepository subscriptionRepository,
            @Value("${opas.stripe.webhook-secret}") String webhookSecret) {
        this.subscriptionRepository = subscriptionRepository;
        this.webhookSecret = webhookSecret;
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
                    sub.setTier("premium");
                    sub.setStatus("active");
                    subscriptionRepository.save(sub);
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
                sub.setTier(tier);
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
        });
    }

    private void handleInvoicePaid(Event event) {
        com.stripe.model.Subscription stripeSub = deserialize(event, com.stripe.model.Subscription.class);
        if (stripeSub == null)
            return;

        subscriptionRepository.findByStripeSubscriptionId(stripeSub.getId()).ifPresent(sub -> {
            if (stripeSub.getCurrentPeriodEnd() != null) {
                sub.setCurrentPeriodEnd(Instant.ofEpochSecond(stripeSub.getCurrentPeriodEnd()));
            }
            subscriptionRepository.save(sub);
        });
    }

    @Nullable
    private static String extractTier(com.stripe.model.Subscription stripeSub) {
        var items = stripeSub.getItems().getData();
        if (items == null || items.isEmpty())
            return null;
        Price price = items.get(0).getPrice();
        if (price == null || price.getProduct() == null)
            return null;
        String productId = price.getProduct();
        return productId != null && productId.contains("premium") ? "premium" : "free";
    }
}
