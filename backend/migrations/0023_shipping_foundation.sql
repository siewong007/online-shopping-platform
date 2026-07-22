ALTER TABLE products
    ADD COLUMN IF NOT EXISTS shipping_class TEXT NOT NULL DEFAULT 'parcel'
    CHECK (shipping_class IN ('parcel', 'bulky', 'freight', 'pickup_only'));

CREATE TABLE shipping_services (
    id                SERIAL PRIMARY KEY,
    code              TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    carrier           TEXT NOT NULL,
    min_delivery_days INTEGER NOT NULL CHECK (min_delivery_days >= 0),
    max_delivery_days INTEGER NOT NULL CHECK (max_delivery_days >= min_delivery_days),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order        INTEGER NOT NULL
);

CREATE TABLE shipping_service_rates (
    service_id     INTEGER NOT NULL REFERENCES shipping_services(id) ON DELETE CASCADE,
    shipping_class TEXT NOT NULL CHECK (shipping_class IN ('parcel', 'bulky', 'freight')),
    base_cents     INTEGER NOT NULL CHECK (base_cents >= 0),
    per_item_cents INTEGER NOT NULL CHECK (per_item_cents >= 0),
    PRIMARY KEY (service_id, shipping_class)
);

INSERT INTO shipping_services
    (code, name, carrier, min_delivery_days, max_delivery_days, sort_order)
VALUES
    ('standard', 'Standard delivery', 'Online Shopping Delivery', 3, 5, 1),
    ('express', 'Express delivery', 'Online Shopping Delivery', 1, 2, 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO shipping_service_rates (service_id, shipping_class, base_cents, per_item_cents)
SELECT shipping_services.id, rates.shipping_class, rates.base_cents, rates.per_item_cents
FROM shipping_services
JOIN (
    VALUES
        ('standard', 'parcel', 699, 99),
        ('standard', 'bulky', 2499, 499),
        ('standard', 'freight', 7999, 1499),
        ('express', 'parcel', 1299, 149),
        ('express', 'bulky', 3999, 799)
) AS rates(service_code, shipping_class, base_cents, per_item_cents)
    ON rates.service_code = shipping_services.code
ON CONFLICT (service_id, shipping_class) DO NOTHING;

CREATE TABLE order_shipping_addresses (
    order_id       INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    phone          TEXT NOT NULL,
    address_line1  TEXT NOT NULL,
    address_line2  TEXT NOT NULL DEFAULT '',
    city           TEXT NOT NULL,
    state          TEXT NOT NULL,
    postal_code    TEXT NOT NULL,
    country_code   TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipments (
    id                    SERIAL PRIMARY KEY,
    order_id              INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shipping_service_code TEXT NOT NULL,
    shipping_service_name TEXT NOT NULL,
    carrier               TEXT NOT NULL,
    shipping_cents        INTEGER NOT NULL CHECK (shipping_cents >= 0),
    status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'canceled')),
    tracking_number       TEXT NOT NULL DEFAULT '',
    tracking_url          TEXT NOT NULL DEFAULT '',
    estimated_delivery_at TIMESTAMPTZ,
    shipped_at            TIMESTAMPTZ,
    delivered_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shipments_order_id_idx ON shipments (order_id);
CREATE INDEX shipments_status_idx ON shipments (status, id DESC);

CREATE TABLE shipment_events (
    id          SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    status      TEXT NOT NULL,
    detail      TEXT NOT NULL DEFAULT '',
    happened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shipment_events_shipment_id_idx ON shipment_events (shipment_id, happened_at, id);

ALTER TABLE order_sales_meta
    ADD COLUMN IF NOT EXISTS shipping_cents INTEGER NOT NULL DEFAULT 0;
