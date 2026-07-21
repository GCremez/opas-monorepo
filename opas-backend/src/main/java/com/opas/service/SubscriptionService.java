package com.opas.service;

import com.opas.domain.Subscription;
import com.opas.domain.User;
import com.opas.repository.SubscriptionRepository;
import com.opas.repository.UserRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.param.billingportal.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final boolean stripeEnabled;
    private final String stripeSecretKey;
    private final String returnBaseUrl;

    public SubscriptionService(SubscriptionRepository subscriptionRepository,
            UserRepository userRepository,
            @Value("${opas.stripe.enabled}") boolean stripeEnabled,
            @Value("${opas.stripe.secret-key}") String stripeSecretKey,
            @Value("${opas.stripe.return-base-url:https://opas.app}") String returnBaseUrl) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.stripeEnabled = stripeEnabled;
        this.stripeSecretKey = stripeSecretKey;
        this.returnBaseUrl = returnBaseUrl;
    }

    @PostConstruct
    void initStripe() {
        if (stripeEnabled) {
            Stripe.apiKey = stripeSecretKey;
            log.info("Stripe integration enabled");
        } else {
            log.warn("Stripe integration disabled — checkout/portal will return mock URLs");
        }
    }

    @Transactional(readOnly = true)
    public Subscription getSubscription(UUID userId) {
        return subscriptionRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));
    }

    @Transactional
    public String createCheckoutSession(UUID userId, String priceId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!stripeEnabled) {
            log.info("Mock checkout: userId={}, priceId={}", userId, priceId);
            return returnBaseUrl + "/subscription/success?session_id=mock_session_" + userId;
        }

        var params = com.stripe.param.checkout.SessionCreateParams.builder()
                .setMode(com.stripe.param.checkout.SessionCreateParams.Mode.SUBSCRIPTION)
                .setClientReferenceId(userId.toString())
                .setCustomerEmail(user.getEmail())
                .setSuccessUrl(returnBaseUrl + "/subscription/success?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(returnBaseUrl + "/subscription/cancel")
                .addLineItem(com.stripe.param.checkout.SessionCreateParams.LineItem.builder()
                        .setPrice(priceId)
                        .setQuantity(1L)
                        .build())
                .build();

        try {
            var session = com.stripe.model.checkout.Session.create(params);
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Failed to create Stripe checkout session", e);
            throw new RuntimeException("Failed to initiate checkout", e);
        }
    }

    @Transactional
    public String createPortalSession(UUID userId) {
        Subscription subscription = getSubscription(userId);

        if (!stripeEnabled) {
            log.info("Mock portal: userId={}", userId);
            return returnBaseUrl + "/profile";
        }

        String customerId = subscription.getStripeCustomerId();
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("No active subscription to manage");
        }

        var params = SessionCreateParams.builder()
                .setCustomer(customerId)
                .setReturnUrl(returnBaseUrl + "/profile")
                .build();

        try {
            var session = com.stripe.model.billingportal.Session.create(params);
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Failed to create Stripe portal session", e);
            throw new RuntimeException("Failed to open manage subscription", e);
        }
    }
}