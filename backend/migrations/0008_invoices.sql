CREATE TABLE IF NOT EXISTS invoices (
    id                SERIAL PRIMARY KEY,
    invoice_number    TEXT NOT NULL UNIQUE,
    order_id          INTEGER NOT NULL UNIQUE REFERENCES orders(id),
    billing_name      TEXT NOT NULL,
    billing_email     TEXT NOT NULL,
    billing_address   TEXT NOT NULL DEFAULT '',
    subtotal_cents    INTEGER NOT NULL,
    discount_cents    INTEGER NOT NULL DEFAULT 0,
    tax_cents         INTEGER NOT NULL DEFAULT 0,
    total_cents       INTEGER NOT NULL,
    issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at            TIMESTAMPTZ NOT NULL,
    voided_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id                SERIAL PRIMARY KEY,
    invoice_id        INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id        INTEGER NOT NULL,
    product_name      TEXT NOT NULL,
    unit_price_cents  INTEGER NOT NULL,
    quantity          INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

CREATE TABLE IF NOT EXISTS invoice_payments (
    id            SERIAL PRIMARY KEY,
    invoice_id    INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_cents  INTEGER NOT NULL CHECK (amount_cents > 0),
    method        TEXT NOT NULL DEFAULT 'other',
    paid_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    note          TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

INSERT INTO permission_pages (slug, name, description, sort_order) VALUES
    ('admin-invoices', 'Invoices', 'Invoice generation, billing details and payment records.', 11)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

UPDATE permission_pages
SET sort_order = 12
WHERE slug = 'admin-permissions' AND sort_order = 11;

UPDATE permission_pages
SET sort_order = 13
WHERE slug = 'storefront' AND sort_order = 12;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, TRUE
FROM roles
CROSS JOIN permission_pages
WHERE roles.is_super_admin = TRUE AND permission_pages.slug = 'admin-invoices'
ON CONFLICT (role_id, page_id) DO UPDATE SET
    can_create = TRUE,
    can_read = TRUE,
    can_update = TRUE,
    can_delete = TRUE;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, FALSE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Store Manager' AND permission_pages.slug = 'admin-invoices'
ON CONFLICT (role_id, page_id) DO NOTHING;
