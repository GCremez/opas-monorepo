CREATE TABLE decode_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID         NOT NULL REFERENCES documents(id),
    user_id         UUID         NOT NULL REFERENCES users(id),
    raw_response    JSONB,
    structured_data JSONB,
    pii_scrubbed    BOOLEAN      NOT NULL DEFAULT false,
    model           VARCHAR(64),
    tokens_in       INTEGER,
    tokens_out      INTEGER,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_decode_results_document_id ON decode_results (document_id);
CREATE INDEX idx_decode_results_user_id     ON decode_results (user_id);
