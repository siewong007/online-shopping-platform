# Catalogue Hard Cases (Step 1 — Task B)

## Provenance

- **Endpoint:** `GET /api/storefront` (`http://127.0.0.1:4000/api/storefront`)
- **Retrieval date:** 2026-07-31
- **Verification:** the root-level `catalogue.json` (4,975 bytes) is byte-identical to a
  fresh `curl http://127.0.0.1:4000/api/storefront` taken today — it is a live, current
  snapshot, not stale sample data.
- **Related endpoint:** `GET /api/offers` currently returns `{"promotions":[],"vouchers":[]}`
  — empty. The homepage "promotions" content shown to shoppers comes entirely from the
  `promotions` array embedded in `/api/storefront`, not from `/api/offers`. Any redesign
  work that wires an offers rail to `/api/offers` must render a real empty state, not
  assume data will be there.

## Counts

| Entity | Count |
|---|---|
| Categories (incl. the `all` umbrella tile) | 9 |
| Real product categories (excl. `all`) | 8 |
| Products | 8 |
| Promotions | 3 |
| Services | 3 |
| `pro_stats` tiles | 3 |

**The catalogue has exactly one product per category.** There is no category with zero,
two, or many products — every "N products in this category" and "top N in category" UI
pattern has only ever been exercised against N=1 in real data.

## Longest product names

| Chars | Name |
|---|---|
| 39 | BEHR Ultra Scuff Defense Interior Paint |
| 37 | Pressure-Treated Decking Starter Pack |
| 36 | RYOBI 18V Walk-Behind Lawn Mower Kit |
| 36 | Husky Heavy-Duty Storage Tote 2-Pack |
| 35 | Frigidaire Front Control Dishwasher |

Card and list layouts must survive a ~40-character product name without truncating in a
way that hides the brand or the distinguishing word (e.g. "2-Pack", "9-Tool").

## Prices (`price_cents`)

| | Product | price_cents | Display |
|---|---|---|---|
| Lowest | Husky Heavy-Duty Storage Tote 2-Pack | 2,798 | $27.98 |
| Highest (tie) | Milwaukee M18 9-Tool Combo Kit | 64,900 | $649.00 |
| Highest (tie) | Pavestone Patio Project Pallet | 64,900 | $649.00 |

Full spread: $27.98 → $649.00 (23x range). Two products tie for highest price — any
"best/highest price" or single-winner sort logic must have a defined, stable tie-break
(e.g. by id), not rely on price alone. No product reaches six figures in cents (i.e.
no $1,000+ item) in the current data, but the three-digit-dollar case ($649.00) is real
today and layouts must not assume prices stay two digits.

## Images

**All 8 of 8 products have `image_url: ""`.** This is not a partial gap — the missing-image
state is the *default* state for every product card and every product-detail page in the
current dataset. The redesign cannot treat "no image" as a rare edge case; it is the
primary case that must look intentional, not broken.

## Stock

- **Out of stock (`stock_quantity == 0`):** none currently.
- **Low stock (`stock_quantity <= low_stock_threshold`):** 1 product —
  "Glacier Bay Shaila Vanity Combo" (qty 3, threshold 5).
- All other products sit comfortably above their threshold (8–52 units).

Because nothing is currently out of stock, the out-of-stock UI state cannot be visually
verified against live data during this step — it must be checked against a temporarily
edited local value or a mock, and re-checked once real out-of-stock data exists.

## Ratings / reviews

**All 8 of 8 products have `avg_rating: null` and `review_count: 0`.** No product has any
review data at all. Notably, product id 3 (BEHR Ultra Scuff Defense Interior Paint) carries
the badge **"Top Rated"** while having zero reviews and a null rating — the badge text and
the underlying data actively contradict each other. Any rating/stars UI must render
correctly for the all-null case, since that's 100% of current products, and copy like
"Top Rated" should not be trusted to imply review data exists.

## Badges vs. `promotions[].label`

Only 1 of 8 product badges matches an actual entry in the `promotions` array:

| Product | badge | Matches a promotion label? |
|---|---|---|
| Milwaukee M18 9-Tool Combo Kit | "Special Buy" | No (promotions has "Special Buy Of The Day") |
| Pressure-Treated Decking Starter Pack | "Weekend Project" | No |
| BEHR Ultra Scuff Defense Interior Paint | "Top Rated" | No |
| Frigidaire Front Control Dishwasher | "Fast Delivery" | No (promotions has "Fast Free Delivery") |
| RYOBI 18V Walk-Behind Lawn Mower Kit | "Spring Black Friday" | **Yes** |
| Glacier Bay Shaila Vanity Combo | "Bath Refresh" | No |
| Pavestone Patio Project Pallet | "Bulk Savings" | No |
| Husky Heavy-Duty Storage Tote 2-Pack | "Everyday Value" | No |

If the redesign links product badges to promotion detail pages/sections by exact label
match, 7 of 8 products will fail to link. Treat badge text as free-form merchandising
copy, not a foreign key into `promotions`.

## Missing or sparse fields

- `image_url`: present as `""` (empty string, not `null`) on every product — code must
  treat empty string as "no image," not just check for `null`/`undefined`.
- `avg_rating`: `null` on every product.
- `review_count`: `0` on every product.
- No product is missing `name`, `price_cents`, `description`, `category_slug`, `tone`,
  `stock_quantity`, or `low_stock_threshold` — those fields are consistently populated,
  just always populated *thinly* (short one-sentence descriptions, no bullet specs, no
  dimensions/weight/materials fields exist in the schema at all). There is no spec-table
  data anywhere in this payload — a "spec row" component (called for in the workflow's
  Step 3 component list) has nothing granular to render yet beyond `tone` (brand-ish
  string) and the free-text `description`.

## Filter/search combinations likely to return zero results

Because there is exactly one product per category and no overlapping facets:

- **Category + price band that excludes that category's single item** — e.g.
  `category=bath` (only item is $398.00) `+ price < $300` → 0 results.
- **Category + out-of-stock filter** — every category's one product is in stock, so
  `category=<any> + in_stock=false` → 0 results for all 8 categories.
- **Category + low-stock filter**, for any category except `bath` — only the Glacier Bay
  item qualifies, so `category=tools + low_stock=true` (etc.) → 0 results for the other 7.
- **Any free-text search term not present in the 8 names/descriptions** — e.g. "hammer",
  "drill bit", "faucet" → 0 results, and this is the *common* case given the catalogue's
  size, not a rare one.
- **Badge/promotion-label filter** for any of the 7 non-matching badges above, if promo
  filtering is implemented as an exact-label join.
- **Category `all` as a literal filter value** — `all` exists as a category *record*
  (used for the homepage umbrella tile) but no product's `category_slug` is `all`;
  filtering products by `category_slug=all` literally would incorrectly return 0 rather
  than "everything."

The empty-results state is not a rare edge case for this catalogue — it is the *likely*
outcome of most naive filter combinations and must be designed as a first-class state,
not an afterthought.

## Generic, placeholder-like, or incorrectly branded wording

The site is branded **Ekoway**, but catalogue copy repeatedly references a different,
generic-sounding brand name, **"Online Shopping"**, verbatim:

- Category `all` teaser: *"Browse the homepage the way **Online Shopping** customers
  expect to shop it."*
- Promotion "Fast Free Delivery" description: *"Bring **Online Shopping**-style freight
  confidence to dishwashers, laundry and kitchen refresh packages."*

This reads as leftover template/placeholder copy naming the wrong brand, not Ekoway-specific
merchandising language. It should be flagged to the owner before or during copy work in
later steps — the redesign should not silently ship real customer-facing text that names
the wrong retailer. (Per this step's scope, this is a documented finding only — no catalogue
or backend data was changed.)

Beyond that specific branding issue, the rest of the descriptions and promotion copy read
as plausible, product-specific retail copy (not obviously Lorem-ipsum-style placeholder) —
e.g. "Two batteries, charger and contractor bag for garages, remodels and everyday doer
jobs" is concrete and product-appropriate. The `tone` field (`"Milwaukee"`, `"BEHR"`,
`"Deck Build"`, etc.) is a mix of real brand names and short campaign-style labels; it is
not a formal "brand" field and should not be presented to shoppers as one without
checking with the owner what it's meant to drive.

## Exact real-data cases the redesign must survive

1. A product card/detail page with **no image** — true for 100% of products today.
2. A product name at **~40 characters** without truncating the meaningful part.
3. A price at **$649.00 exactly**, including the **tied-highest-price** case (two products
   at 64,900 cents) for any "highest price" or single-item sort/badge logic.
4. A **low-stock** badge/state on real data (Glacier Bay Shaila Vanity Combo, qty 3 of
   threshold 5) — but no real **out-of-stock** case exists yet; that state needs a
   temporary/mock check.
5. **Zero reviews, null rating** on every product, including one explicitly badged
   "Top Rated" despite having no rating data.
6. A **badge that names a promotion that doesn't exist verbatim** in `promotions[]` (7 of
   8 products) — badge display must not depend on an exact promotion-label match.
7. A **category with exactly one product** — any "N items" or grid-density design must
   look correct at N=1, not just at N=12+.
8. A **free-text search with zero matches** — the common case, not the rare one, given an
   8-product catalogue.
9. An **empty `/api/offers` response** — the promotions/offers rail must have a real,
   non-broken empty state.
10. Catalogue copy naming the wrong brand ("Online Shopping") in at least two places —
    a content risk independent of the visual redesign.

No catalogue or backend data was modified to produce this document.
