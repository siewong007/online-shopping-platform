ALTER TABLE orders
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'received';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS fulfillment_method TEXT NOT NULL DEFAULT 'pickup';

CREATE TABLE IF NOT EXISTS order_fulfillment_history (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status  TEXT,
    to_status    TEXT NOT NULL,
    note         TEXT NOT NULL DEFAULT '',
    changed_by   TEXT NOT NULL DEFAULT '',
    happened_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_fulfillment_history_order_id
ON order_fulfillment_history(order_id);
