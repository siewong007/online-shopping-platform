INSERT INTO system_settings (key, value, value_type, category, description)
SELECT
    'shipping.' || code || '.enabled',
    is_active::text,
    'bool',
    'shipping',
    'Whether ' || name || ' is available to customers at checkout.'
FROM shipping_services
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, value_type, category, description)
SELECT
    'shipping.' || shipping_services.code || '.' || shipping_service_rates.shipping_class || '.base_cents',
    shipping_service_rates.base_cents::text,
    'int',
    'shipping',
    shipping_services.name || ' base charge for ' || shipping_service_rates.shipping_class || ' items, in cents.'
FROM shipping_service_rates
JOIN shipping_services ON shipping_services.id = shipping_service_rates.service_id
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, value_type, category, description)
SELECT
    'shipping.' || shipping_services.code || '.' || shipping_service_rates.shipping_class || '.per_item_cents',
    shipping_service_rates.per_item_cents::text,
    'int',
    'shipping',
    shipping_services.name || ' charge per ' || shipping_service_rates.shipping_class || ' item, in cents.'
FROM shipping_service_rates
JOIN shipping_services ON shipping_services.id = shipping_service_rates.service_id
ON CONFLICT (key) DO NOTHING;

UPDATE permission_pages
SET description = 'System-wide configuration for tax, invoicing, shipping, and branding.'
WHERE slug = 'admin-settings';
