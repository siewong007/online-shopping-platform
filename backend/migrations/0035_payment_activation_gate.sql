-- Server-side production payment activation gate. In `controlled` mode a new payment may only be
-- initiated by presenting a short-lived, single-use authorization issued here; every other new
-- initiation is rejected before an order, payment row, stock hold or gateway request is created.
--
-- Only the SHA-256 digest of the authorization secret is stored. The raw secret exists once, in
-- the issuing response, and is never persisted or logged. Replay protection lives in the database
-- rather than in process memory so it survives restarts and holds across multiple API processes.

CREATE TABLE IF NOT EXISTS payment_activation_grants (
    id            BIGSERIAL PRIMARY KEY,
    token_sha256  TEXT NOT NULL UNIQUE,
    label         TEXT NOT NULL DEFAULT '',
    issued_by     TEXT NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    consumed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
