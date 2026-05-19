-- ตารางขนส่ง (พร้อมกฎราคา)
CREATE TABLE IF NOT EXISTS public.carriers (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  phone        TEXT    NOT NULL DEFAULT '',
  base_weight  NUMERIC NOT NULL DEFAULT 20,   -- kg ที่รวมในราคาฐาน
  base_price   NUMERIC NOT NULL DEFAULT 0,    -- ราคาฐาน (บาท)
  extra_per_kg NUMERIC NOT NULL DEFAULT 0,    -- บาทต่อ kg ที่เกิน
  is_active    BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT    NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ตารางโซนพื้นที่ (ค่าธรรมเนียมเพิ่ม)
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  surcharge   NUMERIC NOT NULL DEFAULT 0,    -- ค่าเพิ่ม (บาท)
  description TEXT    NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- เพิ่มฟิลด์ขนส่งใน delivery_orders
ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS weight_kg       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zone_name       TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS zone_surcharge  NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost   NUMERIC DEFAULT 0;
