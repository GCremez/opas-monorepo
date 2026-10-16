package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.domain.Subscription;
import com.opas.repository.SubscriptionRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StripeWebhookServiceTest {

    @Mock
    private SubscriptionRepository subscriptionRepository;
    private StripeWebhookService service;

    @BeforeEach
    void setUp() {
        service = new StripeWebhookService(subscriptionRepository,
                new io.micrometer.core.instrument.simple.SimpleMeterRegistry(), "whsec_test",
                "price_premium_monthly, price_premium_yearly");
    }

    @Test
    void verifySignatureSucceeds() throws Exception {
        try (MockedStatic<Webhook> webhook = mockStatic(Webhook.class)) {
            Event expected = mock(Event.class);
            webhook.when(() -> Webhook.constructEvent("{}", "sig", "whsec_test")).thenReturn(expected);

            Event result = service.verifySignature("{}", "sig");
            assertSame(expected, result);
        }
    }

    @Test
    void verifySignatureThrowsOnInvalid() throws Exception {
        try (MockedStatic<Webhook> webhook = mockStatic(Webhook.class)) {
            webhook.when(() -> Webhook.constructEvent("{}", "bad-sig", "whsec_test"))
                    .thenThrow(SignatureVerificationException.class);

            assertThrows(IllegalArgumentException.class, () -> service.verifySignature("{}", "bad-sig"));
        }
    }

    private Event mockCheckoutEvent(String customerId, String subscriptionId, String clientReferenceId) {
        Event event = mock(Event.class);
        when(event.getType()).thenReturn("checkout.session.completed");

        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        Session session = mock(Session.class);
        when(session.getPaymentStatus()).thenReturn("paid");
        when(session.getCustomer()).thenReturn(customerId);
        when(session.getSubscription()).thenReturn(subscriptionId);
        when(session.getClientReferenceId()).thenReturn(clientReferenceId);
        when(deserializer.getObject()).thenReturn(Optional.of(session));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        return event;
    }

    @Test
    void handleCheckoutCompletedFindsByStripeCustomerIdFirst() {
        Event event = mockCheckoutEvent("cus_123", "sub_456", UUID.randomUUID().toString());

        Subscription sub = new Subscription();
        sub.setId(UUID.randomUUID());
        sub.setTier("free");
        sub.setStatus("incomplete");

        when(subscriptionRepository.findByStripeCustomerId("cus_123")).thenReturn(Optional.of(sub));

        service.handleEvent(event);

        verify(subscriptionRepository).findByStripeCustomerId("cus_123");
        verify(subscriptionRepository, never()).findByUserId(any());
        assertEquals("active", sub.getStatus());
        assertEquals("premium", sub.getTier());
        assertEquals("cus_123", sub.getStripeCustomerId());
        assertEquals("sub_456", sub.getStripeSubscriptionId());
    }

    @Test
    void handleCheckoutCompletedFallsBackToClientReferenceId() {
        UUID userId = UUID.randomUUID();
        Event event = mockCheckoutEvent("cus_999", "sub_456", userId.toString());

        when(subscriptionRepository.findByStripeCustomerId("cus_999")).thenReturn(Optional.empty());
        Subscription sub = new Subscription();
        sub.setId(UUID.randomUUID());
        sub.setTier("free");
        sub.setStatus("incomplete");
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.of(sub));

        service.handleEvent(event);

        verify(subscriptionRepository).findByUserId(userId);
        assertEquals("active", sub.getStatus());
        assertEquals("premium", sub.getTier());
    }

    @Test
    void handleCheckoutCompletedIgnoresUnpaidSession() {
        Event event = mock(Event.class);
        when(event.getType()).thenReturn("checkout.session.completed");
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        Session session = mock(Session.class);
        when(session.getPaymentStatus()).thenReturn("unpaid");
        when(session.getId()).thenReturn("cs_test_unpaid");
        when(deserializer.getObject()).thenReturn(Optional.of(session));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);

        service.handleEvent(event);

        // An unpaid / $0 / incomplete checkout must never grant premium.
        verify(subscriptionRepository, never()).save(any());
        verify(subscriptionRepository, never()).findByStripeCustomerId(any());
        verify(subscriptionRepository, never()).findByUserId(any());
    }

    private Event mockSubscriptionEvent(String type, String subscriptionId) {
        Event event = mock(Event.class);
        when(event.getType()).thenReturn(type);

        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        com.stripe.model.Subscription stripeSub = mock(com.stripe.model.Subscription.class);
        when(stripeSub.getId()).thenReturn(subscriptionId);
        when(deserializer.getObject()).thenReturn(Optional.of(stripeSub));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        return event;
    }

    @Test
    void handleSubscriptionUpdatedUpdatesStatusAndPeriod() {
        com.stripe.model.Subscription stripeSub = mock(com.stripe.model.Subscription.class);
        when(stripeSub.getId()).thenReturn("sub_456");
        when(stripeSub.getStatus()).thenReturn("active");
        when(stripeSub.getCurrentPeriodStart()).thenReturn(1000L);
        when(stripeSub.getCurrentPeriodEnd()).thenReturn(2000L);

        var items = mock(com.stripe.model.SubscriptionItemCollection.class);
        when(stripeSub.getItems()).thenReturn(items);
        when(items.getData()).thenReturn(java.util.Collections.emptyList());

        Event event = mock(Event.class);
        when(event.getType()).thenReturn("customer.subscription.updated");
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(stripeSub));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);

        Subscription sub = new Subscription();
        sub.setId(UUID.randomUUID());
        sub.setStatus("active");
        sub.setTier("premium");

        when(subscriptionRepository.findByStripeSubscriptionId("sub_456")).thenReturn(Optional.of(sub));

        service.handleEvent(event);

        verify(subscriptionRepository).save(sub);
    }

    @Test
    void handleSubscriptionDeletedSetsCanceled() {
        Event event = mockSubscriptionEvent("customer.subscription.deleted", "sub_456");

        Subscription sub = new Subscription();
        sub.setId(UUID.randomUUID());
        sub.setStatus("active");
        sub.setTier("premium");

        when(subscriptionRepository.findByStripeSubscriptionId("sub_456")).thenReturn(Optional.of(sub));

        service.handleEvent(event);

        assertEquals("canceled", sub.getStatus());
        assertEquals("free", sub.getTier());
        verify(subscriptionRepository).save(sub);
    }

    @Test
    void handleInvoicePaidUpdatesPeriodEnd() {
        Invoice invoice = mock(Invoice.class);
        when(invoice.getSubscription()).thenReturn("sub_456");
        when(invoice.getPeriodEnd()).thenReturn(3000L);

        Event event = mock(Event.class);
        when(event.getType()).thenReturn("invoice.paid");
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(invoice));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);

        Subscription sub = new Subscription();
        sub.setId(UUID.randomUUID());
        sub.setCurrentPeriodEnd(null);

        when(subscriptionRepository.findByStripeSubscriptionId("sub_456")).thenReturn(Optional.of(sub));

        service.handleEvent(event);

        assertNotNull(sub.getCurrentPeriodEnd());
        verify(subscriptionRepository).save(sub);
    }

    @Test
    void unhandledEventTypeIsLogged() {
        Event event = mock(Event.class);
        when(event.getType()).thenReturn("charge.succeeded");

        service.handleEvent(event);
        verify(subscriptionRepository, never()).save(any());
    }

    // --- tier mapping ---

    private static com.stripe.model.Subscription stripeSubWithPrice(String status, String priceId) {
        com.stripe.model.Subscription stripeSub = mock(com.stripe.model.Subscription.class);
        lenient().when(stripeSub.getId()).thenReturn("sub_1");
        when(stripeSub.getStatus()).thenReturn(status);
        var price = mock(com.stripe.model.Price.class);
        lenient().when(price.getId()).thenReturn(priceId);
        // Opaque product id, as Stripe issues them: it must not drive the tier.
        lenient().when(price.getProduct()).thenReturn("prod_Qx81mZa3");
        var item = mock(com.stripe.model.SubscriptionItem.class);
        lenient().when(item.getPrice()).thenReturn(price);
        var items = mock(com.stripe.model.SubscriptionItemCollection.class);
        lenient().when(items.getData()).thenReturn(java.util.List.of(item));
        lenient().when(stripeSub.getItems()).thenReturn(items);
        return stripeSub;
    }

    @Test
    void allowlistedPriceMapsToPremiumEvenWithOpaqueProductId() {
        assertEquals("premium", service.extractTier(stripeSubWithPrice("active", "price_premium_yearly")));
    }

    @Test
    void pastDueKeepsPremiumDuringStripeRetries() {
        assertEquals("premium", service.extractTier(stripeSubWithPrice("past_due", "price_premium_monthly")));
    }

    @Test
    void unknownPriceMapsToFree() {
        assertEquals("free", service.extractTier(stripeSubWithPrice("active", "price_something_else")));
    }

    @Test
    void endedSubscriptionMapsToFree() {
        assertEquals("free", service.extractTier(stripeSubWithPrice("unpaid", "price_premium_monthly")));
        assertEquals("free", service.extractTier(stripeSubWithPrice("canceled", "price_premium_monthly")));
    }

    @Test
    void missingAllowlistLeavesTierUnchanged() {
        var unconfigured = new StripeWebhookService(subscriptionRepository,
                new io.micrometer.core.instrument.simple.SimpleMeterRegistry(), "whsec_test", "");
        assertNull(unconfigured.extractTier(stripeSubWithPrice("active", "price_premium_monthly")));
    }

    @Test
    void renewalUpdateKeepsPremiumUserPremium() {
        // Regression: the old product-id check downgraded every premium user on the
        // customer.subscription.updated event Stripe sends after checkout and each renewal.
        var stripeSub = stripeSubWithPrice("active", "price_premium_monthly");
        Event event = mock(Event.class);
        when(event.getType()).thenReturn("customer.subscription.updated");
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(stripeSub));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        Subscription sub = new Subscription();
        sub.setTier("premium");
        when(subscriptionRepository.findByStripeSubscriptionId("sub_1")).thenReturn(Optional.of(sub));

        service.handleEvent(event);

        assertEquals("premium", sub.getTier());
    }
}
