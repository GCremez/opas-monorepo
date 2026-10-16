package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.opas.domain.Subscription;
import com.opas.repository.SubscriptionRepository;
import com.opas.repository.UserRepository;
import com.stripe.exception.ApiConnectionException;
import com.stripe.exception.InvalidRequestException;
import com.stripe.model.Customer;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

class SubscriptionServiceTest {

    private SubscriptionService service(boolean stripeEnabled) {
        return new SubscriptionService(mock(SubscriptionRepository.class), mock(UserRepository.class), stripeEnabled,
                "sk_test", "https://opas.app", "price_premium");
    }

    private static Subscription withCustomer(String customerId) {
        Subscription sub = new Subscription();
        sub.setStripeCustomerId(customerId);
        return sub;
    }

    @Test
    void deletesStripeCustomerSoBillingStops() throws Exception {
        Customer customer = mock(Customer.class);
        try (MockedStatic<Customer> stripe = mockStatic(Customer.class)) {
            stripe.when(() -> Customer.retrieve("cus_123")).thenReturn(customer);

            service(true).deleteBillingCustomer(withCustomer("cus_123"));

            verify(customer).delete();
        }
    }

    @Test
    void alreadyDeletedCustomerIsFine() {
        try (MockedStatic<Customer> stripe = mockStatic(Customer.class)) {
            stripe.when(() -> Customer.retrieve("cus_gone")).thenThrow(
                    new InvalidRequestException("No such customer", "id", "req_1", "resource_missing", 404, null));

            assertDoesNotThrow(() -> service(true).deleteBillingCustomer(withCustomer("cus_gone")));
        }
    }

    @Test
    void stripeOutageAbortsDeletion() {
        try (MockedStatic<Customer> stripe = mockStatic(Customer.class)) {
            stripe.when(() -> Customer.retrieve("cus_123")).thenThrow(new ApiConnectionException("timeout"));

            assertThrows(IllegalStateException.class, () -> service(true).deleteBillingCustomer(withCustomer("cus_123")));
        }
    }

    @Test
    void noStripeCallWithoutCustomerOrWhenDisabled() {
        try (MockedStatic<Customer> stripe = mockStatic(Customer.class)) {
            service(true).deleteBillingCustomer(withCustomer(null));
            service(false).deleteBillingCustomer(withCustomer("cus_123"));

            stripe.verifyNoInteractions();
        }
    }
}
