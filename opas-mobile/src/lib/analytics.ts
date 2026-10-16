// Thin PostHog wrapper. One module-level client so non-React code (zustand stores,
// the axios interceptor) can emit events without a hook. We deliberately do NOT use
// PostHogProvider / autocapture / session replay: this app shows scanned government
// letters, and autocapture or replay would ship that on-screen text (PII) to PostHog.
//
// Config comes from EXPO_PUBLIC_* env vars, which Expo inlines into the bundle at
// build time. With no key set (e.g. local dev), every call is a safe no-op.
//
// GDPR: users are in Finland — default to the EU cloud, never US.
import PostHog from 'posthog-react-native';

// PostHog only accepts JSON-serializable property values (no `undefined`).
type Props = Record<string, string | number | boolean | null>;

let client: PostHog | null = null;

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

export function initAnalytics(): void {
  if (client || !KEY) return;
  client = new PostHog(KEY, {
    host: HOST,
    // Batch and flush on our terms; keep it modest so beta events arrive promptly.
    flushAt: 20,
    flushInterval: 10_000,
    // App lifecycle (open/background) is useful and PII-free; leave it on.
    captureAppLifecycleEvents: true,
  });
}

export function identify(userId: string, properties?: Props): void {
  client?.identify(userId, properties);
}

export function track(event: string, properties?: Props): void {
  // Stamp platform on every event so mobile vs any future web/back-end events are
  // distinguishable in PostHog. NEVER pass name/email/document content here.
  client?.capture(event, { ...properties, platform: 'mobile' });
}

export function reset(): void {
  client?.reset();
}

export function flush(): void {
  client?.flush();
}
