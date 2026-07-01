CREATE TABLE IF NOT EXISTS payments (
    id               SERIAL PRIMARY KEY,
    order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    idempotency_key  TEXT NOT NULL UNIQUE,
    amount_cents     INTEGER NOT NULL CHECK (amount_cents > 0),
    method           TEXT NOT NULL,
    status           TEXT NOT NULL CHECK (status IN ('Pending', 'Captured', 'Refunded', 'Failed', 'Void')),
    reference        TEXT NOT NULL DEFAULT '',
    notes            TEXT NOT NULL DEFAULT '',
    processed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

INSERT INTO permission_pages (slug, name, description, sort_order) VALUES
    ('admin-payments', 'Payments', 'Payment ledger, tender status and transaction controls.', 7)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

UPDATE permission_pages
SET sort_order = 8
WHERE slug = 'admin-customers' AND sort_order < 8;

UPDATE permission_pages
SET sort_order = 9
WHERE slug = 'admin-permissions' AND sort_order < 9;

UPDATE permission_pages
SET sort_order = 10
WHERE slug = 'storefront' AND sort_order < 10;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, TRUE
FROM roles
CROSS JOIN permission_pages
WHERE roles.is_super_admin = TRUE AND permission_pages.slug = 'admin-payments'
ON CONFLICT (role_id, page_id) DO UPDATE SET
    can_create = TRUE,
    can_read = TRUE,
    can_update = TRUE,
    can_delete = TRUE;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, TRUE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Store Manager' AND permission_pages.slug = 'admin-payments'
ON CONFLICT (role_id, page_id) DO NOTHING;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, FALSE, TRUE, TRUE, FALSE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Fulfillment Lead' AND permission_pages.slug = 'admin-payments'
ON CONFLICT (role_id, page_id) DO NOTHING;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, FALSE, TRUE, FALSE, FALSE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Catalog Specialist' AND permission_pages.slug = 'admin-payments'
ON CONFLICT (role_id, page_id) DO NOTHING;
