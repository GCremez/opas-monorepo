-- "Your letter is ready": a push goes out the moment a decode finishes, and an email
-- follows if the result is still unopened ten minutes later.
--
-- result_seen_at:      first time the owner fetched the finished result (GET .../decode).
-- ready_email_sent_at: when the backup email went out, so it is only ever sent once.
ALTER TABLE documents
    ADD COLUMN result_seen_at      TIMESTAMPTZ,
    ADD COLUMN ready_email_sent_at TIMESTAMPTZ;

-- Letters read before this existed are not news; never email about them.
UPDATE documents SET result_seen_at = updated_at WHERE status = 'ready';

-- The email job only ever looks for ready documents nobody has opened yet.
CREATE INDEX idx_documents_result_unseen ON documents (updated_at)
    WHERE status = 'ready' AND result_seen_at IS NULL AND ready_email_sent_at IS NULL;
