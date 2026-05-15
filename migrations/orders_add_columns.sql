-- Add missing columns to orders table (safe to run multiple times)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_id        uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS address        text,
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS tracking_number   text,
  ADD COLUMN IF NOT EXISTS shipping_provider text,
  ADD COLUMN IF NOT EXISTS shipped_at     timestamptz,
  ADD COLUMN IF NOT EXISTS email          text,
  ADD COLUMN IF NOT EXISTS note           text,
  ADD COLUMN IF NOT EXISTS shipping_method text,
  ADD COLUMN IF NOT EXISTS shipping_cost  numeric DEFAULT 0;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
