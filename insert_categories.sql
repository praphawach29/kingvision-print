INSERT INTO categories (id, name, slug) VALUES 
('743abd71-2aef-41e8-a1e8-ace8f722ab03', 'อุปกรณ์เสริม', 'อุปกรณ์เสริม'),
('141cbbd1-95dc-4650-a657-7ed99bb5950d', 'หมึกพิมพ์', 'หมึกพิมพ์'),
('9785ea0d-845f-4c68-a5ce-da71088144ab', 'เครื่องปริ้นเตอร์', 'เครื่องปริ้นเตอร์')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;