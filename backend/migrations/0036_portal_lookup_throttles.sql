CREATE TABLE portal_lookup_attempts (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    source_ip TEXT NOT NULL DEFAULT '',
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_lookup_attempts_email_time
    ON portal_lookup_attempts (email, attempted_at);

CREATE INDEX idx_portal_lookup_attempts_ip_time
    ON portal_lookup_attempts (source_ip, attempted_at);
