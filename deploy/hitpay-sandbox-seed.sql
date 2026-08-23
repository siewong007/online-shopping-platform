-- Explicit sandbox-only item for low-value payment UAT. This file is never included in the
-- production deployment bundle and the item remains hidden from any storefront catalogue.
INSERT INTO categories (slug, name, teaser, sort_order)
VALUES ('sandbox-uat', 'Sandbox UAT', 'Payment testing only.', 9999)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    teaser = EXCLUDED.teaser,
    sort_order = EXCLUDED.sort_order;

INSERT INTO products (
    name,
    category_slug,
    price_cents,
    badge,
    description,
    tone,
    featured,
    sort_order,
    stock_quantity,
    low_stock_threshold,
    shipping_class,
    source_item_code,
    source_uom,
    imported_at
)
SELECT
    'HitPay Sandbox UAT Item',
    'sandbox-uat',
    320,
    'TEST ONLY',
    'Sandbox payment verification item; not real Ekoway stock.',
    'neutral',
    FALSE,
    9999,
    10,
    2,
    'pickup_only',
    'SANDBOX-HITPAY-UAT',
    'EA',
    now()
WHERE NOT EXISTS (
    SELECT 1
    FROM products
    WHERE source_item_code = 'SANDBOX-HITPAY-UAT'
      AND source_uom = 'EA'
);
