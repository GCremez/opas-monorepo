// The AI consent wording now shown (a date). Bump it with the backend's
// AiConsentRequiredException.CURRENT_VERSION whenever the wording changes in substance:
// anyone who agreed to an older version is asked again before their next scan.
export const AI_CONSENT_VERSION = '2026-11-08';

/** Whether the stored consent covers the current wording. */
export function hasCurrentConsent(at?: string | null, version?: string | null): boolean {
  return !!at && !!version && version >= AI_CONSENT_VERSION;
}
