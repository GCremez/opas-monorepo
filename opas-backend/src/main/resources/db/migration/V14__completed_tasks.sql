-- Deadlines and actions from a document that the user has marked done (Alerts "Done",
-- the document's Actions checklist). A task is identified by a key the app derives from
-- the decode, e.g. "deadline:2026-11-30:Report income changes" or "action:Read the decision".
CREATE TABLE completed_tasks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    task_key     VARCHAR(512) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_completed_tasks_document_key UNIQUE (document_id, task_key)
);
