-- Stock held by an order is taken at checkout but was never given back: deleting an order
-- or abandoning it mid-payment silently consumed the units. This adds the release marker and
-- the sweep interval that close both gaps.

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS stock_released_at TIMESTAMPTZ;

-- Supports the abandoned-order sweep, which only ever scans orders still holding their stock.
CREATE INDEX IF NOT EXISTS idx_orders_stock_release_sweep
    ON orders (created_at)
    WHERE stock_released_at IS NULL;

-- Deliberately seeded at 0 (disabled). Today `payment_status` only leaves 'unpaid' when an
-- admin advances the sales pipeline by hand, so a live sweep would restock legitimate orders
-- that are merely awaiting processing. Raise this only once a payment gateway sets
-- `payment_status` automatically.
INSERT INTO system_settings (key, value, value_type, category, description) VALUES
    (
        'inventory.unpaid_release_minutes',
        '0',
        'int',
        'inventory',
        'Minutes an unpaid order holds its stock before the units are released back to inventory. 0 disables the sweep. Keep at 0 until a payment gateway maintains payment_status automatically.'
    )
ON CONFLICT (key) DO NOTHING;
