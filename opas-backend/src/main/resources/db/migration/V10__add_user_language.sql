-- Stores the interface language the user signed up with so transactional email
-- (verification codes) can be sent in Finnish, Swedish, or English.
ALTER TABLE users ADD COLUMN language VARCHAR(8) NOT NULL DEFAULT 'en';
