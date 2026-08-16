-- CI-only business data seed for the restore integration jobs (test-restore-atomicity.sh,
-- test-restore-proof-negative.sh, restore-proof.sh) so a restored target has real positive data
-- to prove parity against.
--
-- The production migrations contain NO seed INSERTs (verified), so the CI source database is built
-- by: applying backend/migrations/*.sql -> creating app_schema_migrations -> inserting the ledger
-- rows -> running THIS file. It is a test fixture, never shipped or run in production.
BEGIN;

-- is_super_admin must be false for both: migration 0003's partial unique index
-- idx_roles_single_super_admin allows exactly one super-admin role (already 'Super Admin').
INSERT INTO roles (name, description, is_super_admin) VALUES
  ('owner', 'Platform owner', false),
  ('support', 'Customer support', false);

INSERT INTO categories (slug, name, teaser, sort_order) VALUES
  ('keyboards', 'Keyboards', 'Custom mechanical keyboards', 1),
  ('switches', 'Switches', 'Mechanical switch sets', 2),
  ('cables', 'Cables', 'Keyboard cables', 3),
  ('desk-mats', 'Desk Mats', 'Desk mats', 4),
  ('keycaps', 'Keycaps', 'Keycap sets', 5);

INSERT INTO products (name, category_slug, price_cents, badge, description, tone, sort_order) VALUES
  ('75% Hotswap Keyboard', 'keyboards', 29900, 'Featured', 'A compact 75% board', 'neutral', 1),
  ('Linear Switch Set (90)', 'switches', 12900, 'New', 'Gateron-style linear switches', 'neutral', 2),
  ('Coiled Aviator Cable', 'cables', 8900, '', 'Detachable coiled cable', 'warm', 3),
  ('Large Desk Mat', 'desk-mats', 6900, '', '900x400mm desk mat', 'cool', 4),
  ('Cherry-profile Keycap Set', 'keycaps', 19900, 'Featured', 'Double-shot keycaps', 'neutral', 5),
  ('60% Hotswap Keyboard', 'keyboards', 25900, '', 'Compact 60% board', 'neutral', 6);

INSERT INTO customer_accounts (email, password_hash, display_name) VALUES
  ('ada@example.com', 'ci-seed-hash', 'Ada'),
  ('grace@example.com', 'ci-seed-hash', 'Grace');

INSERT INTO admin_users (username, display_name, password_hash, role_id) VALUES
  ('ci-owner', 'CI Owner', 'ci-seed-hash', (SELECT id FROM roles WHERE name = 'owner')),
  ('ci-support', 'CI Support', 'ci-seed-hash', (SELECT id FROM roles WHERE name = 'support'));

INSERT INTO orders (customer_name, customer_email, subtotal_cents, customer_account_id) VALUES
  ('Ada Lovelace', 'ada@example.com', 42800, (SELECT id FROM customer_accounts WHERE email = 'ada@example.com')),
  ('Grace Hopper', 'grace@example.com', 12900, (SELECT id FROM customer_accounts WHERE email = 'grace@example.com')),
  ('Walk-in', 'walkin@example.com', 8900, NULL);

INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity) VALUES
  ((SELECT id FROM orders WHERE customer_email = 'ada@example.com' AND subtotal_cents = 42800),
   (SELECT id FROM products WHERE name = '75% Hotswap Keyboard'), '75% Hotswap Keyboard', 29900, 1),
  ((SELECT id FROM orders WHERE customer_email = 'ada@example.com' AND subtotal_cents = 42800),
   (SELECT id FROM products WHERE name = 'Coiled Aviator Cable'), 'Coiled Aviator Cable', 8900, 1),
  ((SELECT id FROM orders WHERE customer_email = 'grace@example.com' AND subtotal_cents = 12900),
   (SELECT id FROM products WHERE name = 'Linear Switch Set (90)'), 'Linear Switch Set (90)', 12900, 1);

-- status must be a value in the base payments CHECK constraint from migration 0005
-- ('Pending','Captured','Refunded','Failed','Void'); 'succeeded' is not allowed there.
INSERT INTO payments (order_id, idempotency_key, amount_cents, method, status) VALUES
  ((SELECT id FROM orders WHERE customer_email = 'ada@example.com' AND subtotal_cents = 42800),
   'ci-pay-ada', 42800, 'manual', 'Captured'),
  ((SELECT id FROM orders WHERE customer_email = 'grace@example.com' AND subtotal_cents = 12900),
   'ci-pay-grace', 12900, 'manual', 'Captured');

COMMIT;