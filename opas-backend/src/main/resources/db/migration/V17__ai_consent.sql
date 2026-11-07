-- When the user agreed to letters being read by the AI provider (Anthropic). Null means
-- they haven't, and decodes and drafts are refused until they do (App Store 5.1.2(i)).
ALTER TABLE users ADD COLUMN ai_consent_at TIMESTAMPTZ;
