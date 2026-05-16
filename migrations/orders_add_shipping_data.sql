ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_data JSONB;

NOTIFY pgrst, 'reload schema';
