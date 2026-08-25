CREATE INDEX IF NOT EXISTS orders_customer_account_id_idx
    ON orders (customer_account_id);
