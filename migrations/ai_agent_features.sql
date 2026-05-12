-- Migration: AI Agent Features
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Add AI agent personality settings to store_settings
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS ai_persona_name   text    DEFAULT 'น้องคิง',
  ADD COLUMN IF NOT EXISTS ai_system_prompt  text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_speaking_style text    DEFAULT 'friendly',
  ADD COLUMN IF NOT EXISTS ai_temperature    float   DEFAULT 0.7;

-- 2. Customer insights (cross-session memory)
CREATE TABLE IF NOT EXISTS customer_insights (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid        REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferred_categories text[]      DEFAULT '{}',
  preferred_brands     text[]      DEFAULT '{}',
  budget_range         jsonb       DEFAULT '{}',
  last_inquiries       text[]      DEFAULT '{}',
  notes                text        DEFAULT '',
  updated_at           timestamptz DEFAULT now()
);

-- 3. AI Knowledge Base (custom Q&A for the chatbot)
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  question   text        NOT NULL,
  answer     text        NOT NULL,
  category   text        DEFAULT 'general',
  is_active  boolean     DEFAULT true,
  sort_order int         DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE customer_insights  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base   ENABLE ROW LEVEL SECURITY;

-- Drop before create to avoid duplicates on re-run
DROP POLICY IF EXISTS "service_all_insights"  ON customer_insights;
DROP POLICY IF EXISTS "service_all_kb"        ON ai_knowledge_base;
DROP POLICY IF EXISTS "public_read_kb"        ON ai_knowledge_base;

CREATE POLICY "service_all_insights" ON customer_insights FOR ALL USING (true);
CREATE POLICY "service_all_kb"       ON ai_knowledge_base FOR ALL USING (true);
CREATE POLICY "public_read_kb"       ON ai_knowledge_base FOR SELECT USING (is_active = true);

-- Seed default knowledge base entries
INSERT INTO ai_knowledge_base (question, answer, category, sort_order) VALUES
  ('ร้านเปิดกี่โมง?',            'ร้านเราเปิดวันจันทร์ถึงเสาร์ เวลา 9:00-18:00 น. ครับ วันอาทิตย์หยุดครับ',                                     'general',  1),
  ('มีรับประกันสินค้าไหม?',      'สินค้ามือหนึ่งรับประกัน 1 ปีครับ มือสองรับประกัน 3-6 เดือน ขึ้นอยู่กับรุ่นครับ',                              'warranty', 2),
  ('จัดส่งได้ไหม? ค่าส่งเท่าไหร่?', 'จัดส่งทั่วประเทศผ่าน Kerry Express และ Flash Express ครับ ค่าส่งคิดตามน้ำหนักสินค้าครับ',                  'shipping', 3),
  ('ออกใบกำกับภาษีได้ไหม?',      'ออกใบกำกับภาษีได้ครับ กรุณาแจ้งชื่อบริษัท เลขผู้เสียภาษี และที่อยู่ในหมายเหตุตอนสั่งซื้อนะครับ',            'invoice',  4),
  ('ซ่อมเครื่องพิมพ์ได้ไหม?',    'รับซ่อมครับ ทั้งในและนอกสถานที่ กรุณาติดต่อผ่าน LINE @kingvision เพื่อนัดช่างครับ',                           'service',  5),
  ('มีเครื่องพิมพ์มือสองไหม?',   'มีครับ เครื่องผ่านการตรวจสอบคุณภาพแล้ว มีประกัน 3-6 เดือน ราคาประหยัดกว่ามือหนึ่งมากครับ',                  'product',  6)
ON CONFLICT DO NOTHING;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
