-- Which wording of the AI consent the user agreed to (a date, e.g. 2026-11-08), so we can
-- show exactly what they saw (GDPR Art. 7(1)). Earlier consents have none and are asked again.
ALTER TABLE users ADD COLUMN ai_consent_version VARCHAR(10);
