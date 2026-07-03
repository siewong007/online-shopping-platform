CREATE TABLE IF NOT EXISTS audit_events (
    id           SERIAL PRIMARY KEY,
    actor        TEXT NOT NULL,
    action       TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_id    TEXT NOT NULL DEFAULT '',
    detail       TEXT NOT NULL DEFAULT '',
    happened_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_happened_at_idx ON audit_events (happened_at DESC);
