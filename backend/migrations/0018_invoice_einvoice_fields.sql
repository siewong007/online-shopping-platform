ALTER TABLE invoices
    ADD COLUMN buyer_tin TEXT,
    ADD COLUMN buyer_registration_number TEXT,
    ADD COLUMN buyer_sst_registration_number TEXT;

ALTER TABLE invoice_line_items
    ADD COLUMN tax_code TEXT,
    ADD COLUMN tax_rate_bps INTEGER,
    ADD COLUMN tax_cents INTEGER NOT NULL DEFAULT 0;
