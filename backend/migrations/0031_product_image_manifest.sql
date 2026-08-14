-- Tracks the evidence behind every product image published through the bulk manifest.
-- Pending candidates stay in the working CSV; only approved A/B matches reach this table.

CREATE TABLE IF NOT EXISTS product_image_metadata (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    source_owner TEXT NOT NULL,
    source_page_url TEXT NOT NULL DEFAULT '',
    rights_status TEXT NOT NULL CHECK (
        rights_status IN ('owned', 'supplier-approved', 'manufacturer-approved')
    ),
    match_confidence TEXT NOT NULL CHECK (match_confidence IN ('A', 'B')),
    review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status = 'approved'),
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_image_history (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    previous_image_url TEXT NOT NULL,
    new_image_url TEXT NOT NULL,
    source_owner TEXT NOT NULL,
    source_page_url TEXT NOT NULL DEFAULT '',
    rights_status TEXT NOT NULL,
    match_confidence TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_image_history_product_idx
    ON product_image_history (product_id, changed_at DESC);
