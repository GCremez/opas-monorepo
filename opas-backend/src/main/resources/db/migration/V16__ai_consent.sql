-- Consent to sending letters to the AI (App Store guideline 5.1.2(i), GDPR): which
-- version of the consent screen the person agreed to, and when. A new version (when
-- what happens to a letter changes) means asking again.
ALTER TABLE users
    ADD COLUMN ai_consent_version VARCHAR(32),
    ADD COLUMN ai_consent_at      TIMESTAMPTZ;
