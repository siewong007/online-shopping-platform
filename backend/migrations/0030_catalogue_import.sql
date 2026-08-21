-- Catalogue import from AutoCount.
--
-- Products previously had no link back to the source system, so a re-import could only
-- ever duplicate rows. (source_item_code, source_uom) is AutoCount's own natural key:
-- the same item stocked in two units is two sellable products at different prices.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS source_item_code TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS source_uom TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

-- Partial: seeded/demo products carry no source code and must not collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS products_source_key_idx
    ON products (source_item_code, source_uom)
    WHERE source_item_code <> '';

CREATE INDEX IF NOT EXISTS products_imported_at_idx
    ON products (imported_at)
    WHERE source_item_code <> '';

INSERT INTO system_settings (key, value, value_type, category, description) VALUES
    (
        'inventory.import_low_stock_threshold',
        '3',
        'int',
        'inventory',
        'Low-stock threshold applied to products created by the AutoCount catalogue import.'
    )
ON CONFLICT (key) DO NOTHING;
