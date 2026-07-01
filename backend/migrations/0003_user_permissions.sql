CREATE TABLE IF NOT EXISTS roles (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    description     TEXT NOT NULL DEFAULT '',
    is_super_admin  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_single_super_admin
    ON roles (is_super_admin)
    WHERE is_super_admin = TRUE;

CREATE TABLE IF NOT EXISTS permission_pages (
    id           SERIAL PRIMARY KEY,
    slug         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    sort_order   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS role_page_permissions (
    role_id     INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    page_id     INTEGER NOT NULL REFERENCES permission_pages(id) ON DELETE CASCADE,
    can_create  BOOLEAN NOT NULL DEFAULT FALSE,
    can_read    BOOLEAN NOT NULL DEFAULT FALSE,
    can_update  BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (role_id, page_id)
);

INSERT INTO roles (name, description, is_super_admin) VALUES
    ('Super Admin', 'Ultimate access across every page and action.', TRUE),
    ('Store Manager', 'Daily operations lead with broad store-console access.', FALSE),
    ('Catalog Specialist', 'Maintains departments, products and promotional content.', FALSE),
    ('Fulfillment Lead', 'Owns order flow, pickup readiness and inventory movement.', FALSE)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_super_admin = EXCLUDED.is_super_admin;

INSERT INTO permission_pages (slug, name, description, sort_order) VALUES
    ('admin-overview', 'Overview', 'Store operations dashboard.', 1),
    ('admin-inventory', 'Inventory', 'Inventory health and replenishment.', 2),
    ('admin-fulfillment', 'Fulfillment', 'Order flow by fulfillment stage.', 3),
    ('admin-campaigns', 'Campaigns', 'Promotional planning controls.', 4),
    ('admin-catalog', 'Catalog', 'Category and product management.', 5),
    ('admin-orders', 'Orders', 'Checkout order book.', 6),
    ('admin-permissions', 'Permissions', 'Role and page permission management.', 7),
    ('storefront', 'Storefront', 'Customer-facing shopping experience.', 8)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, TRUE
FROM roles
CROSS JOIN permission_pages
WHERE roles.is_super_admin = TRUE
ON CONFLICT (role_id, page_id) DO UPDATE SET
    can_create = TRUE,
    can_read = TRUE,
    can_update = TRUE,
    can_delete = TRUE;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id,
    CASE WHEN permission_pages.slug IN ('admin-catalog', 'admin-campaigns') THEN TRUE ELSE FALSE END,
    TRUE,
    CASE WHEN permission_pages.slug IN ('admin-overview', 'admin-inventory', 'admin-fulfillment', 'admin-campaigns', 'admin-catalog', 'admin-orders') THEN TRUE ELSE FALSE END,
    CASE WHEN permission_pages.slug = 'admin-catalog' THEN TRUE ELSE FALSE END
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Store Manager'
ON CONFLICT (role_id, page_id) DO NOTHING;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id,
    CASE WHEN permission_pages.slug = 'admin-catalog' THEN TRUE ELSE FALSE END,
    CASE WHEN permission_pages.slug IN ('admin-overview', 'admin-campaigns', 'admin-catalog', 'admin-orders', 'storefront') THEN TRUE ELSE FALSE END,
    CASE WHEN permission_pages.slug IN ('admin-campaigns', 'admin-catalog') THEN TRUE ELSE FALSE END,
    CASE WHEN permission_pages.slug = 'admin-catalog' THEN TRUE ELSE FALSE END
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Catalog Specialist'
ON CONFLICT (role_id, page_id) DO NOTHING;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id,
    CASE WHEN permission_pages.slug = 'admin-fulfillment' THEN TRUE ELSE FALSE END,
    CASE WHEN permission_pages.slug IN ('admin-overview', 'admin-inventory', 'admin-fulfillment', 'admin-orders') THEN TRUE ELSE FALSE END,
    CASE WHEN permission_pages.slug IN ('admin-inventory', 'admin-fulfillment', 'admin-orders') THEN TRUE ELSE FALSE END,
    FALSE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Fulfillment Lead'
ON CONFLICT (role_id, page_id) DO NOTHING;
