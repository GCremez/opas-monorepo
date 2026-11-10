/**
 * Whether Premium can be bought inside this app. False on every platform for now: the
 * app shows no prices, upgrade buttons or checkout, and Premium-only actions stay
 * hidden for people who don't already have Premium.
 *
 * - iOS: App Store guideline 3.1.1 requires In-App Purchase for digital subscriptions,
 *   so Stripe Checkout isn't allowed in the app.
 * - Android: Google Play likewise requires Play Billing for digital subscriptions,
 *   unless the app is enrolled in Google's EEA alternative billing programme.
 *
 * The beta doesn't need payments: reply drafts are free for everyone on the server
 * (opas.drafts.free-for-everyone). Turn this on per platform once store billing is in
 * place (docs/launch-plan.md, P1-6).
 */
export const CAN_PURCHASE = false;
