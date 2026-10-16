// Crash + error reporting. For a beta this is the single most valuable signal — a
// JS exception or native crash that a tester never reports otherwise.
//
// DSN comes from EXPO_PUBLIC_SENTRY_DSN (inlined at build time). With no DSN set,
// init is a no-op, so local dev and CI don't ship errors anywhere.
//
// PII: users scan government letters. Do NOT enable sendDefaultPii, and keep the
// default beforeSend minimal — we never attach document content or user email.
import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    // Off by default — never let Sentry attach IP/email/etc. automatically.
    sendDefaultPii: false,
    // Beta: sample a slice of transactions for basic perf without noise/cost.
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export { Sentry };
