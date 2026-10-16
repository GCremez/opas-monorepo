-- Email verification: an account must prove ownership of its email address before
-- it can be used. Until now anyone could register with any (unowned) email and log
-- straight in — this closes that gap with a hard login gate.

-- No existing account has ever proven ownership of its address, so every current
-- row starts unverified and must verify on next login. (There is no real user data
-- yet; if that changes, backfill known-good accounts to true instead.)
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;

-- One active verification code per user. Re-requesting a code overwrites the row
-- (upsert on the PK), so an account never has more than one live code. The plaintext
-- code is emailed to the user and never stored — only its SHA-256 hex digest is kept.
CREATE TABLE email_verification_codes (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash   VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    attempts    INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
