CREATE TABLE customer_accounts (
    id            SERIAL PRIMARY KEY,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customer_accounts_email_lower_idx ON customer_accounts (lower(email));

CREATE TABLE customer_sessions (
    id                  SERIAL PRIMARY KEY,
    token               TEXT NOT NULL UNIQUE,
    customer_account_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL
);

CREATE INDEX customer_sessions_expires_at_idx ON customer_sessions (expires_at);
CREATE INDEX customer_sessions_customer_account_id_idx ON customer_sessions (customer_account_id);

ALTER TABLE customer_portal_profiles
    ADD COLUMN customer_account_id INTEGER REFERENCES customer_accounts(id);

ALTER TABLE orders
    ADD COLUMN customer_account_id INTEGER REFERENCES customer_accounts(id);
