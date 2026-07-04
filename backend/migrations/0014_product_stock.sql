-- Add stock and low_stock_threshold columns to products table
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 10;

-- Update existing products with seed stock quantities
UPDATE products SET
    stock_quantity = CASE
        WHEN sort_order = 1 THEN 25
        WHEN sort_order = 2 THEN 12
        WHEN sort_order = 3 THEN 48
        WHEN sort_order = 4 THEN 8
        WHEN sort_order = 5 THEN 16
        WHEN sort_order = 6 THEN 3
        WHEN sort_order = 7 THEN 20
        WHEN sort_order = 8 THEN 52
        ELSE 0
    END,
    low_stock_threshold = CASE
        WHEN sort_order IN (3, 8) THEN 10
        ELSE 5
    END
WHERE sort_order BETWEEN 1 AND 8;

-- Create supplier_info table
CREATE TABLE IF NOT EXISTS supplier_info (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT
);

-- Create product_supplier link table
CREATE TABLE IF NOT EXISTS product_supplier (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES supplier_info(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, supplier_id)
);

-- Insert sample supplier
INSERT INTO supplier_info (name, email, phone) VALUES
    ('Hardware Supply Co', 'orders@hardwaresupply.com', '555-0100')
ON CONFLICT DO NOTHING;
