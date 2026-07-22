CREATE TABLE admin_mfa_factors (
    admin_user_id       INTEGER PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
    secret_ciphertext    BYTEA NOT NULL,
    nonce                BYTEA NOT NULL,
    key_version          SMALLINT NOT NULL DEFAULT 1,
    last_accepted_step   BIGINT,
    enrolled_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at          TIMESTAMPTZ
);

CREATE TABLE admin_mfa_recovery_codes (
    id              SERIAL PRIMARY KEY,
    admin_user_id   INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    code_hash       TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at         TIMESTAMPTZ
);

CREATE UNIQUE INDEX admin_mfa_recovery_codes_active_hash_idx
    ON admin_mfa_recovery_codes (admin_user_id, code_hash)
    WHERE used_at IS NULL;

CREATE TABLE admin_mfa_challenges (
    id                  UUID PRIMARY KEY,
    admin_user_id       INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash          TEXT NOT NULL,
    purpose             TEXT NOT NULL CHECK (purpose IN ('enrollment', 'login', 'disable')),
    secret_ciphertext   BYTEA,
    nonce               BYTEA,
    attempts            SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_mfa_challenges_active_user_idx
    ON admin_mfa_challenges (admin_user_id, expires_at)
    WHERE consumed_at IS NULL;

CREATE TABLE customer_mfa_factors (
    customer_account_id INTEGER PRIMARY KEY REFERENCES customer_accounts(id) ON DELETE CASCADE,
    secret_ciphertext    BYTEA NOT NULL,
    nonce                BYTEA NOT NULL,
    key_version          SMALLINT NOT NULL DEFAULT 1,
    last_accepted_step   BIGINT,
    enrolled_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at          TIMESTAMPTZ
);

CREATE TABLE customer_mfa_recovery_codes (
    id                  SERIAL PRIMARY KEY,
    customer_account_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    code_hash           TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at             TIMESTAMPTZ
);

CREATE UNIQUE INDEX customer_mfa_recovery_codes_active_hash_idx
    ON customer_mfa_recovery_codes (customer_account_id, code_hash)
    WHERE used_at IS NULL;

CREATE TABLE customer_mfa_challenges (
    id                  UUID PRIMARY KEY,
    customer_account_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    token_hash          TEXT NOT NULL,
    purpose             TEXT NOT NULL CHECK (purpose IN ('enrollment', 'login', 'disable')),
    secret_ciphertext   BYTEA,
    nonce               BYTEA,
    attempts            SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX customer_mfa_challenges_active_user_idx
    ON customer_mfa_challenges (customer_account_id, expires_at)
    WHERE consumed_at IS NULL;

ALTER TABLE admin_sessions ADD COLUMN mfa_verified_at TIMESTAMPTZ;
ALTER TABLE customer_sessions ADD COLUMN mfa_verified_at TIMESTAMPTZ;

DELETE FROM admin_sessions;
