CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL PRIMARY KEY,
    customer_name   TEXT NOT NULL,
    customer_email  TEXT NOT NULL,
    subtotal_cents  INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id                SERIAL PRIMARY KEY,
    order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id        INTEGER NOT NULL REFERENCES products(id),
    product_name      TEXT NOT NULL,
    unit_price_cents  INTEGER NOT NULL,
    quantity          INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
