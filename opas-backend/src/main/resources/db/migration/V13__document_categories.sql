-- Built-in document categories (tax, kela, residence, ...) become real folders per user,
-- marked by category_key, so documents can be filed into them like any custom folder.
-- Custom folders keep category_key NULL.
ALTER TABLE folders ADD COLUMN category_key VARCHAR(32);
CREATE UNIQUE INDEX uq_folders_user_category
    ON folders (user_id, category_key)
    WHERE category_key IS NOT NULL;

-- The AI pre-files a decoded document into a category, but never over a choice the
-- user made themselves (including choosing "unfiled").
ALTER TABLE documents ADD COLUMN folder_set_by_user BOOLEAN NOT NULL DEFAULT false;
