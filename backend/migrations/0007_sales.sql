CREATE TABLE IF NOT EXISTS order_sales_meta (
    order_id        INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'confirmed',
    payment_status  TEXT NOT NULL DEFAULT 'unpaid',
    channel         TEXT NOT NULL DEFAULT 'web',
    sales_rep       TEXT NOT NULL DEFAULT '',
    discount_cents  INTEGER NOT NULL DEFAULT 0,
    tax_cents       INTEGER NOT NULL DEFAULT 0,
    total_cents     INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_status_history (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status  TEXT,
    to_status    TEXT NOT NULL,
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    note         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_sales_status_history_order_id ON sales_status_history(order_id);

-- Backfill a sales record for every order that predates this migration.
INSERT INTO order_sales_meta (order_id, status, payment_status, channel, total_cents)
SELECT id, 'confirmed', 'unpaid', 'web', subtotal_cents
FROM orders
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO permission_pages (slug, name, description, sort_order) VALUES
    ('admin-sales', 'Sales', 'Sales pipeline status, channel and payment tracking.', 10)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

UPDATE permission_pages
SET sort_order = 11
WHERE slug = 'admin-permissions' AND sort_order = 10;

UPDATE permission_pages
SET sort_order = 12
WHERE slug = 'storefront' AND sort_order = 11;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, TRUE
FROM roles
CROSS JOIN permission_pages
WHERE roles.is_super_admin = TRUE AND permission_pages.slug = 'admin-sales'
ON CONFLICT (role_id, page_id) DO UPDATE SET
    can_create = TRUE,
    can_read = TRUE,
    can_update = TRUE,
    can_delete = TRUE;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, FALSE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Store Manager' AND permission_pages.slug = 'admin-sales'
ON CONFLICT (role_id, page_id) DO NOTHING;
