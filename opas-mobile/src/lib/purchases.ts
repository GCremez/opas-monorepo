// Whether this build may sell Premium. Off unless EXPO_PUBLIC_PURCHASES_ENABLED=true.
//
// Premium is sold through Stripe Checkout in the browser, which neither store allows for a
// digital subscription bought inside the app (Apple 3.1.1, Google Play Payments policy).
// Until Play Billing / in-app purchase is in, store builds offer no upgrade at all: every
// path that leads to the paywall is hidden, and people simply stay on the free tier.
export const CAN_PURCHASE = process.env.EXPO_PUBLIC_PURCHASES_ENABLED === 'true';
