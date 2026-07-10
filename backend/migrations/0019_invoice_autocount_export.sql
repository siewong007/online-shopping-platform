ALTER TABLE invoices
    ADD COLUMN exported_to_autocount_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_exported_to_autocount_at
    ON invoices(exported_to_autocount_at);
