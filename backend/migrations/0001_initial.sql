CREATE TABLE IF NOT EXISTS categories (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    teaser TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category_slug TEXT NOT NULL REFERENCES categories(slug),
    price_cents INTEGER NOT NULL,
    badge TEXT NOT NULL,
    description TEXT NOT NULL,
    tone TEXT NOT NULL,
    featured BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pro_stats (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_metrics (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    detail TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    department TEXT NOT NULL,
    on_hand TEXT NOT NULL,
    lead_region TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fulfillment_items (
    id SERIAL PRIMARY KEY,
    stage TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_options (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_items (
    id SERIAL PRIMARY KEY,
    happened_at TEXT NOT NULL,
    detail TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

TRUNCATE TABLE
    activity_items,
    campaign_options,
    fulfillment_items,
    inventory_items,
    admin_metrics,
    pro_stats,
    services,
    products,
    promotions,
    categories
RESTART IDENTITY CASCADE;

INSERT INTO categories (slug, name, teaser, sort_order) VALUES
    ('all', 'Shop All Departments', 'Browse the homepage the way Home Depot customers expect to shop it.', 1),
    ('tools', 'Tools', 'Cordless systems, combo kits and garage-ready essentials.', 2),
    ('lumber', 'Lumber', 'Deck boards, framing packs and project quantities.', 3),
    ('paint', 'Paint', 'Interior refreshes, primers and color-matched finishes.', 4),
    ('appliances', 'Appliances', 'Kitchen upgrades with delivery and haul-away support.', 5),
    ('garden', 'Garden Center', 'Outdoor power, mulch, planters and spring prep.', 6),
    ('bath', 'Bath', 'Vanities, toilets and fixtures for quick bathroom resets.', 7),
    ('building-materials', 'Building Materials', 'Pavers, patio packs and bulky project essentials.', 8),
    ('storage', 'Storage', 'Totes, shelving and organization for garages and sheds.', 9);

INSERT INTO promotions (label, title, description, sort_order) VALUES
    ('Spring Black Friday', 'Big savings for the season''s busiest projects', 'Outdoor power, patio, grills and pro tool deals arranged around urgency and seasonal demand.', 1),
    ('Fast Free Delivery', 'Appliances and oversized orders moving faster', 'Bring Home Depot-style freight confidence to dishwashers, laundry and kitchen refresh packages.', 2),
    ('Special Buy Of The Day', 'Daily value moments that feel merchandised, not random', 'Use dense retail offer blocks to spotlight compelling product stories without losing the category flow.', 3);

INSERT INTO products (name, category_slug, price_cents, badge, description, tone, featured, sort_order) VALUES
    ('Milwaukee M18 9-Tool Combo Kit', 'tools', 64900, 'Special Buy', 'Two batteries, charger and contractor bag for garages, remodels and everyday doer jobs.', 'Milwaukee', TRUE, 1),
    ('Pressure-Treated Decking Starter Pack', 'lumber', 54900, 'Weekend Project', 'Deck boards, posts and hardware grouped for a cleaner project kickoff.', 'Deck Build', TRUE, 2),
    ('BEHR Ultra Scuff Defense Interior Paint', 'paint', 4298, 'Top Rated', 'Low-sheen interior coverage with durable washability for high-traffic spaces.', 'BEHR', TRUE, 3),
    ('Frigidaire Front Control Dishwasher', 'appliances', 29900, 'Fast Delivery', 'Stainless finish, quiet operation and install-friendly scheduling for kitchen updates.', 'Frigidaire', TRUE, 4),
    ('RYOBI 18V Walk-Behind Lawn Mower Kit', 'garden', 26900, 'Spring Black Friday', 'Battery mower bundle for smaller yards, weekend touchups and low-maintenance storage.', 'RYOBI', TRUE, 5),
    ('Glacier Bay Shaila Vanity Combo', 'bath', 39800, 'Bath Refresh', 'Sink, cabinet and mirror styling arranged for a quick bathroom overhaul.', 'Glacier Bay', TRUE, 6),
    ('Pavestone Patio Project Pallet', 'building-materials', 64900, 'Bulk Savings', 'A patio-ready paver assortment for outdoor living upgrades and curb appeal.', 'Pavestone', TRUE, 7),
    ('Husky Heavy-Duty Storage Tote 2-Pack', 'storage', 2798, 'Everyday Value', 'Garage, attic and jobsite storage with durable lids and stackable footprints.', 'Husky', TRUE, 8);

INSERT INTO services (name, description, sort_order) VALUES
    ('Home Services', 'Book measurements, quotes and installation for flooring, appliances, doors and more.', 1),
    ('Tool & Truck Rental', 'Reserve equipment, trucks and project tools without leaving the storefront experience.', 2),
    ('Pro Desk Support', 'Manage quotes, volume pricing, delivery coordination and contractor-friendly purchasing.', 3);

INSERT INTO pro_stats (label, value, sort_order) VALUES
    ('pickup-ready average', '2 hrs', 1),
    ('rental and service touchpoints', '1,300+', 2),
    ('pro quote turnaround', '30 min', 3);

INSERT INTO admin_metrics (label, value, detail, sort_order) VALUES
    ('Online revenue today', '$482,400', '+18.2% vs last Tuesday', 1),
    ('Orders ready for pickup', '1,284', '72 are tagged for priority lanes', 2),
    ('Low-stock spring SKUs', '94', '12 require urgent replenishment', 3),
    ('Install consultations', '231', 'Bath and appliance demand are leading', 4);

INSERT INTO inventory_items (department, on_hand, lead_region, status, note, sort_order) VALUES
    ('Cordless Tools', '412 units', 'South', 'Healthy', 'Promo inventory stable', 1),
    ('Deck Boards', '88 bundles', 'Northeast', 'Low', 'Rush transfer queued', 2),
    ('Interior Paint', '235 cans', 'Midwest', 'Healthy', 'Tinting lane clear', 3),
    ('Dishwashers', '46 units', 'West', 'Watch', 'Vendor ETA under review', 4),
    ('Outdoor Power', '124 units', 'South', 'Healthy', 'Spring event in stock', 5),
    ('Vanities', '29 units', 'West', 'Low', 'Install demand spike', 6);

INSERT INTO fulfillment_items (stage, title, detail, sort_order) VALUES
    ('Picking', 'Milwaukee combo pallet', 'Store 118 · 14 items', 1),
    ('Picking', 'Deck board transfer', 'Cross-dock by 10:40', 2),
    ('Staging', 'Patio pickup bundle', 'Curbside lane 2', 3),
    ('Staging', 'Paint contractor order', 'Color match complete', 4),
    ('Delivery', 'Appliance install route', 'Truck 9 · ETA 12:25', 5),
    ('Delivery', 'Paver drop shipment', 'Jobsite gate code verified', 6);

INSERT INTO campaign_options (name, description, sort_order) VALUES
    ('Spring Black Friday', 'Daily merchandising updates for outdoor power, patio and spring demand peaks.', 1),
    ('Patio and Garden', 'Seasonal placement strategy for outdoor refresh projects and add-on bulk items.', 2),
    ('Kitchen Refresh', 'Appliance-forward pricing and install messaging for fast-converting remodel traffic.', 3);

INSERT INTO activity_items (happened_at, detail, sort_order) VALUES
    ('08:10', 'Milwaukee battery promo moved to the hero slot for western stores.', 1),
    ('08:42', 'Pro desk quote approved for Falcon Builders deck materials order.', 2),
    ('09:05', 'Dishwasher install route synced with updated delivery windows.', 3);
