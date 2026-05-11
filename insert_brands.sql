INSERT INTO brands (id, name, slug) VALUES 
('af7114d2-ef2d-498c-ab9e-c0c731fcf89b', 'อื่นๆ', 'อื่นๆ'),
('6605c643-2dd3-4e0b-afbd-f979b5788170', 'HP', 'hp'),
('9bf70d5e-8fdf-47e5-a5a9-18f29fe6c08a', 'Brother', 'brother'),
('d186fd7d-8d30-4596-ab2e-c26afe424d84', 'EPSON', 'epson'),
('f5177ec1-db66-4552-adf9-d3cf117d8f7f', 'Canon', 'canon')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;