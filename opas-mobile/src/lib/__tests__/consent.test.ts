import { describe, expect, it } from '@jest/globals';
import { AI_CONSENT_VERSION, hasCurrentConsent } from '../consent';

describe('hasCurrentConsent', () => {
  it('accepts consent to the current wording or a later one', () => {
    expect(hasCurrentConsent('2026-11-08T10:00:00Z', AI_CONSENT_VERSION)).toBe(true);
    expect(hasCurrentConsent('2026-11-08T10:00:00Z', '2099-01-01')).toBe(true);
  });

  it('asks again when the consent predates the current wording', () => {
    expect(hasCurrentConsent('2026-11-01T10:00:00Z', '2020-01-01')).toBe(false);
    expect(hasCurrentConsent('2026-11-01T10:00:00Z', null)).toBe(false);
  });

  it('treats a withdrawn or missing consent as none', () => {
    expect(hasCurrentConsent(null, AI_CONSENT_VERSION)).toBe(false);
    expect(hasCurrentConsent(undefined, undefined)).toBe(false);
  });
});
