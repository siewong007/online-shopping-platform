CREATE INDEX IF NOT EXISTS orders_customer_email_lower_idx
    ON orders (lower(customer_email));
