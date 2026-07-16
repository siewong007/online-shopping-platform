ALTER TABLE promotions
    ADD COLUMN discount_type TEXT,
    ADD COLUMN discount_value INTEGER,
    ADD COLUMN minimum_subtotal_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN starts_at TIMESTAMPTZ,
    ADD COLUMN ends_at TIMESTAMPTZ,
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN is_stackable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN max_redemptions INTEGER,
    ADD COLUMN redemption_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD CONSTRAINT promotions_discount_type_check
        CHECK (discount_type IS NULL OR discount_type IN ('fixed_cents', 'percent_bps')),
    ADD CONSTRAINT promotions_discount_value_pair_check
        CHECK ((discount_type IS NULL) = (discount_value IS NULL)),
    ADD CONSTRAINT promotions_discount_value_positive_check
        CHECK (discount_type IS NULL OR discount_value > 0),
    ADD CONSTRAINT promotions_percent_bps_check
        CHECK (discount_type IS DISTINCT FROM 'percent_bps' OR discount_value <= 10000),
    ADD CONSTRAINT promotions_minimum_subtotal_cents_check
        CHECK (minimum_subtotal_cents >= 0),
    ADD CONSTRAINT promotions_max_redemptions_check
        CHECK (max_redemptions IS NULL OR max_redemptions > 0),
    ADD CONSTRAINT promotions_redemption_count_check
        CHECK (redemption_count >= 0),
    ADD CONSTRAINT promotions_active_window_check
        CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at);

CREATE INDEX idx_promotions_active_window
    ON promotions (starts_at, ends_at)
    WHERE is_active;

CREATE TABLE vouchers (
    id                      SERIAL PRIMARY KEY,
    code                    TEXT NOT NULL,
    title                   TEXT NOT NULL,
    description             TEXT NOT NULL,
    discount_type           TEXT NOT NULL,
    discount_value          INTEGER NOT NULL,
    minimum_subtotal_cents  INTEGER NOT NULL DEFAULT 0,
    starts_at               TIMESTAMPTZ,
    ends_at                 TIMESTAMPTZ,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_stackable            BOOLEAN NOT NULL DEFAULT FALSE,
    max_redemptions         INTEGER,
    redemption_count        INTEGER NOT NULL DEFAULT 0,
    is_public               BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT vouchers_discount_type_check
        CHECK (discount_type IN ('fixed_cents', 'percent_bps')),
    CONSTRAINT vouchers_discount_value_positive_check
        CHECK (discount_value > 0),
    CONSTRAINT vouchers_percent_bps_check
        CHECK (discount_type <> 'percent_bps' OR discount_value <= 10000),
    CONSTRAINT vouchers_minimum_subtotal_cents_check
        CHECK (minimum_subtotal_cents >= 0),
    CONSTRAINT vouchers_max_redemptions_check
        CHECK (max_redemptions IS NULL OR max_redemptions > 0),
    CONSTRAINT vouchers_redemption_count_check
        CHECK (redemption_count >= 0),
    CONSTRAINT vouchers_active_window_check
        CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at)
);

CREATE UNIQUE INDEX idx_vouchers_code_lower_unique
    ON vouchers (lower(code));

CREATE INDEX idx_vouchers_active_window
    ON vouchers (starts_at, ends_at)
    WHERE is_active;

CREATE TABLE order_offer_redemptions (
    id                      SERIAL PRIMARY KEY,
    order_id                INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    promotion_id            INTEGER REFERENCES promotions(id),
    voucher_id              INTEGER REFERENCES vouchers(id),
    discount_snapshot_cents INTEGER NOT NULL CHECK (discount_snapshot_cents >= 0),
    label_snapshot          TEXT NOT NULL,
    code_snapshot           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT order_offer_redemptions_exactly_one_source_check
        CHECK (
            (promotion_id IS NOT NULL AND voucher_id IS NULL)
            OR (promotion_id IS NULL AND voucher_id IS NOT NULL)
        )
);

CREATE UNIQUE INDEX idx_order_offer_redemptions_order_promotion_unique
    ON order_offer_redemptions (order_id, promotion_id)
    WHERE promotion_id IS NOT NULL;

CREATE UNIQUE INDEX idx_order_offer_redemptions_order_voucher_unique
    ON order_offer_redemptions (order_id, voucher_id)
    WHERE voucher_id IS NOT NULL;

ALTER TABLE order_sales_meta
    ADD COLUMN manual_discount_cents INTEGER NOT NULL DEFAULT 0
        CHECK (manual_discount_cents >= 0);

UPDATE order_sales_meta
SET manual_discount_cents = discount_cents;
