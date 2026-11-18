ALTER TABLE discount_codes ADD COLUMN product_id TEXT;
ALTER TABLE discount_codes ADD COLUMN fixed_unit_price REAL;
INSERT INTO discount_codes(code,percent,is_active,product_id,fixed_unit_price) VALUES ('P100',1,1,'XPH-204',100);
