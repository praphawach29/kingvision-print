-- Fix order_number: create sequence and set as default so it auto-generates
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

ALTER TABLE orders
  ALTER COLUMN order_number SET DEFAULT nextval('order_number_seq');

NOTIFY pgrst, 'reload schema';
