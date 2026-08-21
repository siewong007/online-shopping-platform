CREATE TABLE admin_login_failures (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    source_ip TEXT NOT NULL DEFAULT '',
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_login_failures_username_time
    ON admin_login_failures (username, attempted_at);

CREATE INDEX idx_admin_login_failures_ip_time
    ON admin_login_failures (source_ip, attempted_at);
