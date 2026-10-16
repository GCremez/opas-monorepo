-- Password reset: prove ownership of the account's email before allowing a new
-- password to be set. Mirrors email_verification_codes exactly — a one-time
-- 6-digit code is emailed, single active code per user, only the SHA-256 hex
-- digest is stored (the plaintext code is never persisted).
CREATE TABLE password_reset_codes (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash   VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    attempts    INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
