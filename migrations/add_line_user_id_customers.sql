-- เพิ่ม line_user_id ใน customers table เพื่อ link ลูกค้ากับ LINE OA
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS line_user_id TEXT DEFAULT NULL;

-- Index สำหรับ lookup เร็ว
CREATE INDEX IF NOT EXISTS idx_customers_line_user_id
  ON public.customers (line_user_id)
  WHERE line_user_id IS NOT NULL;
