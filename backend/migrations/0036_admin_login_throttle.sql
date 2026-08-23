-- Failed-login ledger for admin throttle. Successful rows stay so an operator can
-- see that a lockout ended; the service only counts succeeded = false inside the
-- window. Unknown usernames are stored lowercased so the same limit applies
-- whether or not the account exists.

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id           BIGSERIAL PRIMARY KEY,
    username_key TEXT NOT NULL,
    client_key   TEXT NOT NULL,
    succeeded    BOOLEAN NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_login_attempts_username_created_idx
    ON admin_login_attempts (username_key, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_login_attempts_client_created_idx
    ON admin_login_attempts (client_key, created_at DESC);
