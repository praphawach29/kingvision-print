-- Add payment info columns to store_settings
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS promptpay_id text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS bank_account_name text;

-- Add payment slip URL to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_slip_url text;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
