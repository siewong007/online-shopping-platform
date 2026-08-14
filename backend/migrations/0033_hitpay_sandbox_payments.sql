-- Provider-neutral gateway metadata and audit records needed for strict webhook validation,
-- reconciliation and idempotent refunds. No provider is enabled by this migration.

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS provider_order_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_request_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_payment_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'MYR',
    ADD COLUMN IF NOT EXISTS amount_refunded_cents INTEGER NOT NULL DEFAULT 0
        CHECK (amount_refunded_cents >= 0 AND amount_refunded_cents <= amount_cents);

UPDATE payments
SET provider = lower(method),
    provider_order_id = reference,
    provider_request_id = CASE
        WHEN lower(method) = 'senangpay' THEN reference
        ELSE provider_request_id
    END
WHERE provider = 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_request_id
    ON payments (provider, provider_request_id)
    WHERE provider_request_id <> '';

CREATE TABLE IF NOT EXISTS payment_gateway_events (
    id                    BIGSERIAL PRIMARY KEY,
    payment_id            INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    provider              TEXT NOT NULL,
    event_key             TEXT NOT NULL,
    provider_request_id   TEXT NOT NULL,
    provider_payment_id   TEXT NOT NULL DEFAULT '',
    event_status          TEXT NOT NULL,
    payload_sha256        TEXT NOT NULL,
    outcome               TEXT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, event_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_events_payment
    ON payment_gateway_events (payment_id, created_at);

CREATE TABLE IF NOT EXISTS payment_refunds (
    id                    BIGSERIAL PRIMARY KEY,
    payment_id            INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    provider              TEXT NOT NULL,
    idempotency_key       TEXT NOT NULL,
    provider_refund_id    TEXT NOT NULL DEFAULT '',
    amount_cents          INTEGER NOT NULL CHECK (amount_cents > 0),
    currency              TEXT NOT NULL,
    status                TEXT NOT NULL CHECK (status IN ('Pending', 'Succeeded', 'Failed', 'Unknown')),
    failure_reason        TEXT NOT NULL DEFAULT '',
    requested_by          TEXT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_refunds_provider_id
    ON payment_refunds (provider, provider_refund_id)
    WHERE provider_refund_id <> '';

CREATE TABLE IF NOT EXISTS payment_stock_exceptions (
    id                    BIGSERIAL PRIMARY KEY,
    order_id              INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_id            INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    kind                  TEXT NOT NULL,
    details               TEXT NOT NULL,
    resolved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (payment_id, kind)
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS stock_reacquired_at TIMESTAMPTZ;

INSERT INTO system_settings (key, value, value_type, category, description) VALUES
    (
        'inventory.unpaid_release_minutes',
        '60',
        'int',
        'inventory',
        'Minutes an unpaid order holds stock before release. A verified late payment safely re-acquires stock or creates a visible stock exception without making inventory negative.'
    )
ON CONFLICT (key) DO UPDATE SET
    value = CASE
        WHEN system_settings.value = '0' THEN '60'
        ELSE system_settings.value
    END,
    description = EXCLUDED.description,
    updated_at = now();
