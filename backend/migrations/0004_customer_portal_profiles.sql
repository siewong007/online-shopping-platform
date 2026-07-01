CREATE TABLE IF NOT EXISTS customer_portal_profiles (
    id                       SERIAL PRIMARY KEY,
    customer_name            TEXT NOT NULL,
    customer_email           TEXT NOT NULL UNIQUE,
    membership_tier          TEXT NOT NULL DEFAULT 'Bronze',
    points_balance           INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_purchase_cents  INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_purchase_cents >= 0),
    total_orders             INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
    last_purchase_at         TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_portal_profiles_updated_at
    ON customer_portal_profiles(updated_at DESC);

INSERT INTO customer_portal_profiles
    (customer_name, customer_email, membership_tier, points_balance, lifetime_purchase_cents, total_orders, last_purchase_at)
VALUES
    ('Falcon Builders', 'ap@falconbuilders.com', 'Pro Xtra', 1840, 184000, 3, '2026-06-29 08:42:00+00'),
    ('Dana Whitfield', 'dana.w@example.com', 'Silver', 649, 64900, 1, '2026-06-29 07:15:00+00')
ON CONFLICT (customer_email) DO NOTHING;

INSERT INTO customer_portal_profiles
    (customer_name, customer_email, membership_tier, points_balance, lifetime_purchase_cents, total_orders, last_purchase_at)
SELECT
    MAX(customer_name),
    lower(customer_email),
    'Bronze',
    (SUM(subtotal_cents)::integer / 100),
    SUM(subtotal_cents)::integer,
    COUNT(*)::integer,
    MAX(created_at)
FROM orders
GROUP BY lower(customer_email)
ON CONFLICT (customer_email) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    points_balance = GREATEST(customer_portal_profiles.points_balance, EXCLUDED.points_balance),
    lifetime_purchase_cents = EXCLUDED.lifetime_purchase_cents,
    total_orders = EXCLUDED.total_orders,
    last_purchase_at = EXCLUDED.last_purchase_at,
    updated_at = now();

INSERT INTO permission_pages (slug, name, description, sort_order) VALUES
    ('admin-customers', 'Customers', 'Customer portal membership, points and purchase controls.', 7)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

UPDATE permission_pages
SET sort_order = 8
WHERE slug = 'admin-permissions' AND sort_order = 7;

UPDATE permission_pages
SET sort_order = 9
WHERE slug = 'storefront' AND sort_order = 8;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, TRUE
FROM roles
CROSS JOIN permission_pages
WHERE roles.is_super_admin = TRUE AND permission_pages.slug = 'admin-customers'
ON CONFLICT (role_id, page_id) DO UPDATE SET
    can_create = TRUE,
    can_read = TRUE,
    can_update = TRUE,
    can_delete = TRUE;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, TRUE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Store Manager' AND permission_pages.slug = 'admin-customers'
ON CONFLICT (role_id, page_id) DO NOTHING;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, FALSE, TRUE, FALSE, FALSE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name IN ('Catalog Specialist', 'Fulfillment Lead') AND permission_pages.slug = 'admin-customers'
ON CONFLICT (role_id, page_id) DO NOTHING;
