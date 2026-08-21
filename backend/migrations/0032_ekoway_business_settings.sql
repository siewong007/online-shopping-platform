-- Confirmed Ekoway legal identity and Malaysian operating defaults.
--
-- The previous values were US demonstration data. Tax stays at zero until the owner confirms
-- Ekoway's SST registration and price-display treatment with its accountant; the application
-- must not add the old 7.25% US test rate to customer orders.

INSERT INTO system_settings (key, value, value_type, category, description) VALUES
    ('general.company_name', 'EKOWAY HARDWARE SDN. BHD.', 'string', 'general', 'Registered company name shown on invoices and storefront branding.'),
    ('general.company_registration_number', '1353510-A', 'string', 'general', 'SSM registration number.'),
    ('general.company_address', 'No. 43-44, Ground Floor, Lorong Salim 17, Jalan Salim, 96000 Sibu, Sarawak', 'string', 'general', 'Registered business and mailing address.'),
    ('general.company_phone', '084-253 883', 'string', 'general', 'Store telephone number.'),
    ('general.company_whatsapp', '+60 17-405 6993', 'string', 'general', 'Store WhatsApp number.'),
    ('general.privacy_contact_name', 'James Wong', 'string', 'general', 'Contact person for privacy and personal-data requests.'),
    ('general.privacy_contact_email', 'ekowayhardware@gmail.com', 'string', 'general', 'Email for privacy and personal-data requests.'),
    ('general.currency_code', 'MYR', 'string', 'general', 'ISO currency code used across sales and invoicing.'),
    ('sales.default_tax_rate_bps', '0', 'int', 'sales', 'Default tax rate in basis points. Keep at 0 until SST treatment is confirmed.')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    value_type = EXCLUDED.value_type,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- The first migration contains eight US big-box demonstration products and matching public
-- merchandising copy. They are useful test fixtures but are not Ekoway stock and must never
-- be offered to customers. Exact names keep manually-created products unaffected.
UPDATE products
SET featured = FALSE
WHERE source_item_code = ''
  AND name IN (
      'Milwaukee M18 9-Tool Combo Kit',
      'Pressure-Treated Decking Starter Pack',
      'BEHR Ultra Scuff Defense Interior Paint',
      'Frigidaire Front Control Dishwasher',
      'RYOBI 18V Walk-Behind Lawn Mower Kit',
      'Glacier Bay Shaila Vanity Combo',
      'Pavestone Patio Project Pallet',
      'Husky Heavy-Duty Storage Tote 2-Pack'
  );

DELETE FROM promotions
WHERE label IN ('Spring Black Friday', 'Fast Free Delivery', 'Special Buy Of The Day');

DELETE FROM services
WHERE name IN ('Home Services', 'Tool & Truck Rental', 'Pro Desk Support');

DELETE FROM pro_stats
WHERE label IN ('pickup-ready average', 'rental and service touchpoints', 'pro quote turnaround');

UPDATE categories
SET teaser = 'Browse products available from Ekoway Hardware.'
WHERE slug = 'all';

-- Delivery rates in the original seed are demonstration values, not owner-approved Ekoway
-- charges. Pickup remains usable; delivery can be enabled from Settings after zones, rates,
-- limits and lead times are confirmed.
UPDATE system_settings
SET value = 'false',
    description = CASE key
        WHEN 'shipping.standard.enabled' THEN 'Enable standard delivery only after Ekoway approves its real rates and coverage.'
        ELSE 'Enable express delivery only after Ekoway approves its real rates and coverage.'
    END,
    updated_at = now()
WHERE key IN ('shipping.standard.enabled', 'shipping.express.enabled');
