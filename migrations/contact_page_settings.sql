ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS phone_main        text,
  ADD COLUMN IF NOT EXISTS phone_support     text,
  ADD COLUMN IF NOT EXISTS email_sales       text,
  ADD COLUMN IF NOT EXISTS business_hours    text,
  ADD COLUMN IF NOT EXISTS map_embed_url     text;

NOTIFY pgrst, 'reload schema';
