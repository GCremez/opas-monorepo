import { Platform } from 'react-native';

/**
 * Whether Premium can be bought in this build.
 *
 * False on iOS: App Store guideline 3.1.1 doesn't allow selling Premium through Stripe
 * Checkout inside an iOS app, so until Premium is offered through In-App Purchase the
 * iOS app shows no prices, upgrade buttons or checkout.
 *
 * Android still opens Stripe Checkout, but Google Play also requires Play Billing for
 * digital subscriptions unless the app is enrolled in its EEA alternative billing
 * programme. Resolve that before selling on Android (docs/launch-plan.md, P1-6).
 */
export const CAN_PURCHASE = Platform.OS !== 'ios';
