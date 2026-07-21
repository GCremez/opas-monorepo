CREATE TABLE folders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_user_id ON folders (user_id);

ALTER TABLE documents ADD COLUMN folder_id UUID REFERENCES folders(id);
CREATE INDEX idx_documents_folder_id ON documents (folder_id);
