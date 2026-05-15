ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS price            numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_options jsonb   DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
