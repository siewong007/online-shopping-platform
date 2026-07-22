ALTER TABLE customer_sessions
    ADD COLUMN user_agent TEXT,
    ADD COLUMN last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX customer_sessions_customer_account_last_seen_idx
    ON customer_sessions (customer_account_id, last_seen_at DESC);
