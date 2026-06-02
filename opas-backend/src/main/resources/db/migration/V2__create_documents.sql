CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id),
    filename        VARCHAR(255) NOT NULL,
    s3_key          VARCHAR(512) NOT NULL,
    content_type    VARCHAR(127),
    file_size       BIGINT,
    status          VARCHAR(32)  NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_user_id ON documents (user_id);
CREATE INDEX idx_documents_status  ON documents (status);
