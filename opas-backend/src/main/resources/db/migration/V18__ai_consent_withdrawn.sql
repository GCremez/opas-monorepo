-- When the person took back their AI consent (Profile → AI reading, GDPR Art. 7(3)).
-- Set on withdrawal, cleared when they agree again. Scanning and reply drafts are
-- refused while it is set. People who agreed before consent was recorded on the server
-- have NULL here, so they are not blocked.
ALTER TABLE users
    ADD COLUMN ai_consent_withdrawn_at TIMESTAMPTZ;
