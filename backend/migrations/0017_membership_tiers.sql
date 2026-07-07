-- Membership tiers and their benefits for the customer portal.
-- customer_portal_profiles.membership_tier stays TEXT (no FK); tiers are joined by name.

CREATE TABLE IF NOT EXISTS membership_tiers (
    id                            SERIAL PRIMARY KEY,
    name                          TEXT UNIQUE NOT NULL,
    rank                          INTEGER UNIQUE NOT NULL,
    min_lifetime_purchase_cents   INTEGER NOT NULL DEFAULT 0 CHECK (min_lifetime_purchase_cents >= 0),
    points_multiplier             NUMERIC(4, 2) NOT NULL DEFAULT 1.00 CHECK (points_multiplier > 0),
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membership_benefits (
    id           SERIAL PRIMARY KEY,
    tier_id      INTEGER NOT NULL REFERENCES membership_tiers(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_membership_benefits_tier_id ON membership_benefits(tier_id);

-- Tiers cover every value seeded in customer_portal_profiles.membership_tier
-- (Bronze, Silver, Pro Xtra), plus Gold slotted between Silver and Pro Xtra.
INSERT INTO membership_tiers (name, rank, min_lifetime_purchase_cents, points_multiplier) VALUES
    ('Bronze',   1,        0, 1.00),
    ('Silver',   2,    50000, 1.25),
    ('Gold',     3,   150000, 1.50),
    ('Pro Xtra', 4,   300000, 2.00)
ON CONFLICT (name) DO NOTHING;

-- 2-4 benefits per tier, Home-Depot-style.
INSERT INTO membership_benefits (tier_id, title, description, sort_order)
SELECT membership_tiers.id, benefit.title, benefit.description, benefit.sort_order
FROM membership_tiers
JOIN (
    VALUES
        ('Bronze',   'Member pricing',        'Access to members-only prices on select items.',            0),
        ('Bronze',   'Order history',         'Track every past order and reorder in one click.',           1),
        ('Bronze',   '1x points',             'Earn 1 point per dollar on every purchase.',                 2),

        ('Silver',   'Free delivery over $45','Free standard delivery on eligible orders above $45.',        0),
        ('Silver',   '1.25x points',          'Earn 25% more points on every purchase.',                    1),
        ('Silver',   'Extended returns',      '90-day returns on most items.',                              2),

        ('Gold',     'Free delivery over $25','Free standard delivery on eligible orders above $25.',        0),
        ('Gold',     '1.5x points',           'Earn 50% more points on every purchase.',                    1),
        ('Gold',     'Early access to sales', 'Shop seasonal and holiday sales before everyone else.',       2),
        ('Gold',     'Priority support',      'Faster response times from our support team.',               3),

        ('Pro Xtra', 'Free delivery',         'Free standard delivery on all eligible orders.',              0),
        ('Pro Xtra', '2x points',             'Earn double points on every purchase.',                      1),
        ('Pro Xtra', 'Volume pricing',        'Bulk and Pro pricing on qualifying quantities.',              2),
        ('Pro Xtra', 'Dedicated Pro desk',    'A dedicated account team and dedicated support line.',        3)
) AS benefit(tier_name, title, description, sort_order)
    ON benefit.tier_name = membership_tiers.name
WHERE NOT EXISTS (
    SELECT 1 FROM membership_benefits
    WHERE membership_benefits.tier_id = membership_tiers.id
      AND membership_benefits.title = benefit.title
);
