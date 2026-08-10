-- Pickup orders captured only an email address, so there was no way to phone a customer
-- when their order was ready for collection. Delivery orders already carry a phone on
-- order_shipping_addresses; this gives every order one regardless of fulfillment method.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '';
