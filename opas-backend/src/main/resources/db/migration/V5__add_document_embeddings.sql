ALTER TABLE documents ADD COLUMN embedding vector(384);
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
