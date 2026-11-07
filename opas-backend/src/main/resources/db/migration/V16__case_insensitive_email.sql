-- Emails are matched case-insensitively: the app lower-cases every address it receives,
-- and this index stops Bob@x.fi and bob@x.fi from ever being two accounts.

-- Bring existing addresses in line, unless the lower-cased form already belongs to someone.
UPDATE users u
SET email = lower(u.email)
WHERE u.email <> lower(u.email)
  AND NOT EXISTS (SELECT 1 FROM users o WHERE o.email = lower(u.email));

CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));
