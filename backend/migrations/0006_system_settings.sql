CREATE TABLE IF NOT EXISTS system_settings (
    key           TEXT PRIMARY KEY,
    value         TEXT NOT NULL,
    value_type    TEXT NOT NULL,
    category      TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO system_settings (key, value, value_type, category, description) VALUES
    ('general.company_name', 'Project Depot', 'string', 'general', 'Company name shown on invoices and storefront branding.'),
    ('general.company_address', '2455 Paces Ferry Road, Atlanta, GA 30339', 'string', 'general', 'Company mailing address shown on invoices.'),
    ('general.currency_code', 'USD', 'string', 'general', 'ISO currency code used across sales and invoicing.'),
    ('sales.default_tax_rate_bps', '725', 'int', 'sales', 'Default sales tax rate in basis points (725 = 7.25%).'),
    ('invoicing.number_prefix', 'INV-', 'string', 'invoicing', 'Prefix applied to generated invoice numbers.'),
    ('invoicing.next_sequence', '1001', 'int', 'invoicing', 'Next invoice sequence number to allocate.'),
    ('invoicing.payment_terms_days', '30', 'int', 'invoicing', 'Default number of days until an invoice is due.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO permission_pages (slug, name, description, sort_order) VALUES
    ('admin-settings', 'Settings', 'System-wide configuration for tax, invoicing and branding.', 9)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

UPDATE permission_pages
SET sort_order = 10
WHERE slug = 'admin-permissions' AND sort_order = 9;

UPDATE permission_pages
SET sort_order = 11
WHERE slug = 'storefront' AND sort_order = 10;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, TRUE
FROM roles
CROSS JOIN permission_pages
WHERE roles.is_super_admin = TRUE AND permission_pages.slug = 'admin-settings'
ON CONFLICT (role_id, page_id) DO UPDATE SET
    can_create = TRUE,
    can_read = TRUE,
    can_update = TRUE,
    can_delete = TRUE;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, FALSE, TRUE, FALSE, FALSE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Store Manager' AND permission_pages.slug = 'admin-settings'
ON CONFLICT (role_id, page_id) DO NOTHING;
