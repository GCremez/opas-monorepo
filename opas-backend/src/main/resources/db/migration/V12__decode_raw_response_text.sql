-- raw_response holds the model's verbatim reply, which is prose rather than JSON, so a
-- jsonb column rejected every insert. Store it as text. For any existing jsonb value,
-- #>> '{}' unwraps a JSON string to its plain text and renders objects as JSON text.
ALTER TABLE decode_results
    ALTER COLUMN raw_response TYPE TEXT USING raw_response #>> '{}';
