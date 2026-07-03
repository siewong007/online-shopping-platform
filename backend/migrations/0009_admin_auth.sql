CREATE TABLE IF NOT EXISTS admin_users (
    id             SERIAL PRIMARY KEY,
    username       TEXT NOT NULL UNIQUE,
    display_name   TEXT NOT NULL,
    password_hash  TEXT NOT NULL,
    role_id        INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id             SERIAL PRIMARY KEY,
    token          TEXT NOT NULL UNIQUE,
    admin_user_id  INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
    ON admin_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id
    ON admin_sessions(admin_user_id);
