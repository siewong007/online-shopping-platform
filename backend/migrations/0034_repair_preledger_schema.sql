-- Repairs production schema objects from migrations 0023-0026 that were mistakenly marked as
-- applied when the migration ledger was first baselined. Every operation is idempotent so a
-- correctly migrated database is unchanged. No delivery service or price is seeded here:
-- Ekoway remains pickup-only until owner-approved shipping configuration exists.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS shipping_class TEXT NOT NULL DEFAULT 'parcel'
    CHECK (shipping_class IN ('parcel', 'bulky', 'freight', 'pickup_only'));

CREATE TABLE IF NOT EXISTS shipping_services (
    id                SERIAL PRIMARY KEY,
    code              TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    carrier           TEXT NOT NULL,
    min_delivery_days INTEGER NOT NULL CHECK (min_delivery_days >= 0),
    max_delivery_days INTEGER NOT NULL CHECK (max_delivery_days >= min_delivery_days),
    is_active         BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_service_rates (
    service_id     INTEGER NOT NULL REFERENCES shipping_services(id) ON DELETE CASCADE,
    shipping_class TEXT NOT NULL CHECK (shipping_class IN ('parcel', 'bulky', 'freight')),
    base_cents     INTEGER NOT NULL CHECK (base_cents >= 0),
    per_item_cents INTEGER NOT NULL CHECK (per_item_cents >= 0),
    PRIMARY KEY (service_id, shipping_class)
);

CREATE TABLE IF NOT EXISTS order_shipping_addresses (
    order_id       INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    phone          TEXT NOT NULL,
    address_line1  TEXT NOT NULL,
    address_line2  TEXT NOT NULL DEFAULT '',
    city            TEXT NOT NULL,
    state           TEXT NOT NULL,
    postal_code     TEXT NOT NULL,
    country_code    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
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

CREATE INDEX IF NOT EXISTS shipments_order_id_idx ON shipments (order_id);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON shipments (status, id DESC);

CREATE TABLE IF NOT EXISTS shipment_events (
    id          SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    status      TEXT NOT NULL,
    detail      TEXT NOT NULL DEFAULT '',
    happened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipment_events_shipment_id_idx
    ON shipment_events (shipment_id, happened_at, id);

ALTER TABLE order_sales_meta
    ADD COLUMN IF NOT EXISTS shipping_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE customer_sessions
    ADD COLUMN IF NOT EXISTS user_agent TEXT,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS customer_sessions_customer_account_last_seen_idx
    ON customer_sessions (customer_account_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS admin_mfa_factors (
    admin_user_id       INTEGER PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
    secret_ciphertext   BYTEA NOT NULL,
    nonce               BYTEA NOT NULL,
    key_version         SMALLINT NOT NULL DEFAULT 1,
    last_accepted_step  BIGINT,
    enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_mfa_recovery_codes (
    id              SERIAL PRIMARY KEY,
    admin_user_id   INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    code_hash       TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at         TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_mfa_recovery_codes_active_hash_idx
    ON admin_mfa_recovery_codes (admin_user_id, code_hash)
    WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_mfa_challenges (
    id                  UUID PRIMARY KEY,
    admin_user_id       INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash          TEXT NOT NULL,
    purpose             TEXT NOT NULL CHECK (purpose IN ('enrollment', 'login', 'disable')),
    secret_ciphertext   BYTEA,
    nonce               BYTEA,
    attempts            SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_mfa_challenges_active_user_idx
    ON admin_mfa_challenges (admin_user_id, expires_at)
    WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS customer_mfa_factors (
    customer_account_id INTEGER PRIMARY KEY REFERENCES customer_accounts(id) ON DELETE CASCADE,
    secret_ciphertext   BYTEA NOT NULL,
    nonce               BYTEA NOT NULL,
    key_version         SMALLINT NOT NULL DEFAULT 1,
    last_accepted_step  BIGINT,
    enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS customer_mfa_recovery_codes (
    id                  SERIAL PRIMARY KEY,
    customer_account_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    code_hash           TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at             TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_mfa_recovery_codes_active_hash_idx
    ON customer_mfa_recovery_codes (customer_account_id, code_hash)
    WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS customer_mfa_challenges (
    id                  UUID PRIMARY KEY,
    customer_account_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    token_hash          TEXT NOT NULL,
    purpose             TEXT NOT NULL CHECK (purpose IN ('enrollment', 'login', 'disable')),
    secret_ciphertext   BYTEA,
    nonce               BYTEA,
    attempts            SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_mfa_challenges_active_user_idx
    ON customer_mfa_challenges (customer_account_id, expires_at)
    WHERE consumed_at IS NULL;

ALTER TABLE admin_sessions
    ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ;

ALTER TABLE customer_sessions
    ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ;

UPDATE permission_pages
SET description = 'System-wide configuration for tax, invoicing, shipping, and branding.'
WHERE slug = 'admin-settings';
