# Enhancement Roadmap

Status snapshot for the current tree:

| Area | Status | Evidence |
|------|--------|----------|
| Admin user management | Shipped | `0010_admin_users_case_insensitive_username.sql`, `backend/src/modules/admin_users/` |
| Fulfillment flow | Shipped | `0011_order_fulfillment.sql`, `/api/admin/orders/{order_id}/fulfillment` |
| Customer order lookup | Shipped | `0012_order_email_index.sql`, `/api/customer-portal/lookup` |
| Persistent audit log | Shipped | `0013_audit_events.sql`, `/api/admin/audit-events` |
| Inventory and stock | Shipped | `0014_product_stock.sql`, `/api/admin/inventory/supplier-sync` |
| Customer accounts | Shipped | `0015_customer_accounts.sql`, `/api/account/*` |
| Product images | Shipped, URL-based | `0016_product_images.sql`, catalog image URL fields |
| Membership tiers | Shipped | `0017_membership_tiers.sql`, customer membership endpoints |
| E-invoice readiness | Shipped on feature branch | `0018_invoice_einvoice_fields.sql`, billing validation, export-state tracking |
| CI pipeline | Shipped | `.github/workflows/ci.yml` |
| Mobile hardening | Active next work | `docs/mobile-styling-plan.md` |
| AutoCount export | Shipped on feature branch | `/api/admin/invoices/autocount-export`, invoice CSV download UI |

Current recommended PR themes:

1. Bring docs and onboarding in line with the shipped architecture.
2. Finish mobile usability across storefront, landing, admin navigation, tables, and modals.
3. Replace the generic AutoCount CSV with the user's exact import template once supplied.
4. Add reconciliation/read-back after the accountant confirms the import workflow.
5. Extend customer self-service and admin-scale filtering after the accounting path is usable.

The historical roadmap below is retained as implementation context. Treat shipped sections as
reference notes rather than active backlog unless a regression or follow-up test is called out.

---

Detailed designs for the enhancements proposed after the auth/catalog/tests feature landed
(commit `1d977b9`). Ordered by recommended implementation sequence. Each item follows the
existing conventions: migrations are append-only (numbers below are indicative — always take
the next free number at implementation time), backend modules use the
controller → service → repository → db layering with `ensure_permission` gating, and frontend
panels reuse `ManagementTable` / `RecordModal` / `RecordForm` with `fetchJson` fallback data.

The real payment gateway (Stripe) is intentionally excluded from this document.

---

## 1. Admin user management

**Why.** The only admin account is the startup seed (`admin` / `ADMIN_SEED_PASSWORD`). There is
no way to add staff, deactivate a departed employee, reset a password, or change a role without
raw SQL. Until this exists, everyone shares one super-admin login, which defeats the RBAC system.

**Migration (`0010_admin_user_hardening.sql`).**
- `CREATE UNIQUE INDEX admin_users_username_lower_idx ON admin_users (lower(username));`
  (closes the case-sensitivity gap found in review — lookup is `lower() = lower($1)` but the
  UNIQUE constraint is case-sensitive).
- No new tables needed; `admin_users` already has `is_active`, `role_id`, timestamps.

**Backend.**
- `db.rs`: `fetch_admin_users(pool) -> Vec<AdminUser>` (join `roles` for role name),
  `update_admin_user(pool, id, input)` (display_name, role_id, is_active),
  `update_admin_password(pool, id, password_hash)`,
  and extend `insert_admin_session`'s login path with an opportunistic
  `DELETE FROM admin_sessions WHERE expires_at < now()` (review follow-up: sessions currently
  accumulate forever).
- New endpoints in the `auth` module (or a new `admin_users` module if it grows):
  - `GET    /api/admin/users` — Read on `admin-permissions`
  - `POST   /api/admin/users` — Create on `admin-permissions`; body: username, display_name,
    role_id, initial password (hashed with the existing `auth::service::hash_password`)
  - `PUT    /api/admin/users/{id}` — Update on `admin-permissions`; role/display-name/is_active
  - `POST   /api/admin/users/{id}/password` — Update on `admin-permissions` (admin reset)
  - `POST   /api/admin/me/password` — any authenticated identity; requires current password,
    verifies with `Argon2::verify_password` before setting the new hash
- Rules to enforce in the service layer:
  - Deactivating or demoting the **last active super admin** must fail with a clear error
    (count active users on the super-admin role first).
  - Deactivating a user should also `DELETE FROM admin_sessions WHERE admin_user_id = $1`
    so revocation is immediate, not delayed until token expiry.
  - Changing your own password should invalidate all *other* sessions for that user.
- Deleting users: prefer `is_active = false` over hard delete (the `roles` FK is already
  `ON DELETE RESTRICT`; an `admin_users` hard delete would also orphan future audit rows — see §7).

**Frontend.**
- New "Team" card inside `PermissionsPanel` (or a sibling section on the same tab):
  `ManagementTable` listing username, display name, role, active status, created date;
  `RecordModal` + `RecordForm` for create/edit (role as a `select` sourced from the roles list
  already loaded by the panel); a separate small modal for password reset.
- Signed-in card in the sidebar gains a "Change password" action opening a modal
  (current password + new password + confirm).
- `authApi.ts` gains `fetchAdminUsers`, `createAdminUser`, `updateAdminUser`,
  `resetAdminPassword`, `changeOwnPassword`. Fallback: a single demo user row.
- Also remove the `username: "admin"` prefill in `AdminLoginScreen.tsx:11` (review finding —
  it advertises the seed account).

**Tests.** Extend `backend/tests/admin_api.rs`: create user → login as them → 403 on a page
their role can't read; deactivate → next request 401; last-super-admin guard; own-password
change requires correct current password.

**Verification.** `cargo test`; browser: create a Catalog Specialist user, log in with it in a
second browser profile, confirm nav shows only permitted tabs.

---

## 2. Order fulfillment status flow

**Why.** Orders are created and edited but have no lifecycle. The Fulfillment tab renders static
seed rows from `fulfillment_items`. A real pick/pack/ship flow is the operational core of a
hardware store and unlocks customer order tracking (§4, §11).

**Migration (`0011_order_fulfillment.sql`).**
- `ALTER TABLE orders ADD COLUMN fulfillment_status TEXT NOT NULL DEFAULT 'received';`
- `ALTER TABLE orders ADD COLUMN fulfillment_method TEXT NOT NULL DEFAULT 'pickup';`
  (values: `pickup` | `delivery`)
- `CREATE TABLE order_fulfillment_history (id, order_id FK, from_status, to_status, note,
  changed_by TEXT, happened_at TIMESTAMPTZ DEFAULT now())` — copy the `sales_status_history`
  shape from `0007_sales.sql`, which this codebase already renders and tests.
- Backfill: existing orders stay `received`.

**State machine** (validate in `db.rs`, mirroring `update_sales_status`):

```
received → picking → packed → ready_for_pickup → completed      (pickup)
received → picking → packed → out_for_delivery → delivered      (delivery)
any non-terminal state → canceled
```

Reject skips and backward moves with `bail!("Cannot move from {from} to {to}.")` exactly like
the sales module does; record every transition in the history table with
`identity.username` as `changed_by` (the extractor makes attribution free).

**Backend.**
- `PUT /api/admin/orders/{order_id}/fulfillment` — Update on `admin-orders`; body
  `{ to_status, note }`.
- `GET /api/admin/orders` gains the two new columns in its SELECT and response model.
- Checkout (`POST /api/checkout`) accepts an optional `fulfillment_method`.
- Optional coupling worth doing in the same transaction: when fulfillment reaches
  `completed`/`delivered`, advance `order_sales_meta.status` to `fulfilled` via the existing
  `update_sales_status` logic so the Sales pipeline stays consistent.

**Frontend.**
- `OrderControlPanel`: status pill column (reuse the tone classes used by SalesPanel),
  a "Advance status" action opening a small modal offering only the valid next states, and a
  history drawer/expando per order (same rendering as sales history).
- Replace the static Fulfillment tab contents with a live board grouped by
  `fulfillment_status` (columns of order cards, counts per stage) driven by the same
  `orders` state — no new endpoint needed.
- `orderApi.ts`: `updateOrderFulfillment(orderId, input)`.

**Tests.** Transition matrix test (valid chain passes, skip rejected, canceled is terminal);
history rows written; sales meta advances on completion.

---

## 3. Real inventory (stock quantities) + supplier sync

**Why.** Products have no stock count. The Inventory tab and the "Low-stock spring SKUs"
dashboard card are hardcoded seed data (`inventory_items`, `admin_metrics`). Checkout currently
sells infinite stock. This item makes three fake surfaces real and gives the mocked
"Run Supplier Sync" button a purpose.

**Migration (`0012_product_stock.sql`).**
- `ALTER TABLE products ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0;`
- `ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 5;`
- Seed sensible quantities for the 8 demo products (e.g. 20–200) so local dev looks alive.

**Backend.**
- **Checkout decrement**: inside the existing `create_order` transaction, per item:
  `UPDATE products SET stock_quantity = stock_quantity - $qty
   WHERE id = $id AND stock_quantity >= $qty` — if `rows_affected == 0`,
  `bail!("{name} has only {remaining} left in stock.")` and the transaction rolls back.
  The conditional UPDATE makes overselling impossible under concurrency without extra locking.
- **Admin restock**: `PUT /api/admin/products/{id}/stock` — Update on `admin-catalog`; body
  `{ stock_quantity, low_stock_threshold }`. (Keep it separate from `update_product` so a
  price edit can't silently clobber a concurrent stock adjustment.)
- **Supplier sync**: `POST /api/admin/inventory/supplier-sync` — Update on `admin-overview`
  (matching the button's current permission gate). Local implementation: top every product
  below its threshold back up to a target level and return
  `{ restocked: [{ product_id, name, added }] }`. This replaces the client-side mock in
  `App.tsx` (`runSupplierSync`, which today only writes an activity-feed entry).
- `fetch_admin_catalog` and storefront queries include `stock_quantity`.

**Frontend.**
- `CatalogPanel`: "Stock" column (sortable, red tone below threshold) + a compact restock modal.
- Inventory tab: replace static `inventory_items` rendering with a live table derived from
  `adminCatalog.products` (name, stock, threshold, status pill), so it needs no new fetch.
- Storefront: "Out of stock" badge and a disabled Add-to-Cart when `stock_quantity == 0`;
  cart quantity stepper caps at available stock.
- Checkout error surfaces the backend's per-item message (it already displays mutation errors).

**Tests.** Concurrent-checkout oversell test (two orders totaling more than stock — second
fails, stock never negative); supplier sync restocks only below-threshold items.

---

## 4. Public customer order lookup (storefront account drawer)

**Why.** Locking down `GET /api/admin/orders` closed a PII leak but regressed the storefront
`AccountDrawer` to fallback data for shoppers. This restores it safely.

**Backend.**
- `GET /api/customer-portal/lookup?email=<email>` — **public**, no admin identity:
  returns `{ profile, orders }` filtered to exactly that email
  (`WHERE lower(customer_email) = lower($1)`, newest first, cap at 20).
- Scope discipline: return only that customer's own rows and only the fields the drawer needs
  (order id, created_at, subtotal, item names, fulfillment_status once §2 lands; profile tier
  and points). Never accept a role/token to widen the result.
- Honest caveat to record in code review: email-only lookup is guessable-identifier access.
  Acceptable at this project's stage; the real fix is customer login (§11), at which point
  this endpoint becomes the authenticated "my orders" query.
- Add a `LIMIT`-per-IP-friendly shape now: single indexed query, no wildcard search.
  `CREATE INDEX orders_customer_email_lower_idx ON orders (lower(customer_email));`
  (migration `0013_order_email_index.sql`).

**Frontend.**
- `customerApi.ts`: `lookupCustomer(email)` using `fetchJson` with an empty fallback
  (`{ profile: null, orders: [] }`).
- `AccountDrawer`: email input (pre-filled from the last checkout in this session), "Find my
  orders" button, renders the same order list it used to show from admin data. Keep it
  read-only.

**Tests.** Lookup returns only the matching email's orders; different-email orders never leak;
case-insensitive match.

---

## 5. Storefront search and filtering

**Why.** There is no product search — category browsing only. Even a modest catalog needs
name/description search and price filtering; contractors search by brand and spec.

**Backend.**
- Extend `GET /api/storefront` with optional query params: `q` (text), `category`,
  `min_price_cents`, `max_price_cents`, `sort` (`price_asc|price_desc|name|featured`).
  Implemented with `ILIKE '%' || $1 || '%'` against `name`, `badge`, `description` —
  parameterized, no format!-into-SQL.
- Keep the no-param response shape identical so the existing homepage call and the fallback
  path are untouched (CLAUDE.md: never bypass the fallback).
- Postgres full-text (`to_tsvector` + GIN index) is the upgrade path if the catalog grows past
  a few thousand SKUs; not needed to start. If added later:
  `0014_product_search_index.sql` with a generated `tsv` column.

**Frontend.**
- Search input in the storefront header (debounced ~300 ms) + a filter bar
  (category chips already exist; add price range + sort select).
- When the API is unreachable, filter the already-loaded fallback products client-side with the
  same predicate so search still works in demo mode.
- `storefrontApi.ts`: `fetchStorefront(params?)` builds the query string; no new types beyond
  an optional `StorefrontQuery`.

**Tests.** Backend: `q` matches name and description case-insensitively; price bounds inclusive;
empty result set is a 200 with empty arrays (not 404).

---

## 6. Real dashboard metrics

**Why.** The Overview tab's KPI cards, regional performance, and trade-account radar are static
rows from `admin_metrics` seeded in `0001_initial.sql`, sitting right next to now-real modules.
Stale fake numbers erode trust in the whole console.

**Backend.**
- New `db.rs` aggregate `fetch_live_dashboard_metrics(pool)` computed in one round trip
  (a few scalar subqueries):
  - **Revenue today**: `SUM(total_cents) FROM order_sales_meta JOIN orders … WHERE
    orders.created_at::date = current_date AND status <> 'canceled'` — reuse the aggregation
    style already in `fetch_sales_summary`.
  - **Orders awaiting fulfillment**: count of orders not in a terminal state (needs §2; until
    then, count of today's orders).
  - **Low-stock SKUs**: `COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold`
    (needs §3; until then omit the card rather than fake it).
  - **Unpaid invoices**: count + amount outstanding from the invoices tables.
- `fetch_admin_dashboard` returns these under a new `live_metrics` field alongside the existing
  seed-backed sections (campaigns/activity can stay seeded until §7 replaces activity).
  Additive change → no frontend breakage, fallback file gains matching demo numbers.

**Frontend.**
- KPI cards read `dashboard.live_metrics`; delete the hardcoded card copy
  ("+18.2% vs last Tuesday" etc.) or derive deltas only when a comparison window is actually
  computed (a `yesterday` variant of each scalar is cheap in the same query).
- Cards render nothing-gracefully when a metric is absent (pre-§2/§3 states).

**Tests.** Seed an order + invoice in a `#[sqlx::test]`, assert the aggregates.

---

## 7. Persistent audit log

**Why.** The "Team log" activity feed is client-side React state — it vanishes on refresh and
records nothing about who did what. With `AdminIdentity` now in every mutation handler,
a durable audit trail is nearly free and is the first thing anyone asks for after RBAC.

**Migration (`0015_audit_events.sql`).**
```sql
CREATE TABLE audit_events (
    id           SERIAL PRIMARY KEY,
    actor        TEXT NOT NULL,            -- identity.username; 'system' for seed/sync jobs
    action       TEXT NOT NULL,            -- 'create' | 'update' | 'delete' | 'login' | ...
    entity_type  TEXT NOT NULL,            -- 'product' | 'order' | 'invoice' | 'role' | ...
    entity_id    TEXT NOT NULL DEFAULT '',
    detail       TEXT NOT NULL DEFAULT '',
    happened_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_happened_at_idx ON audit_events (happened_at DESC);
```

**Backend.**
- `db.rs`: `record_audit_event(pool, actor, action, entity_type, entity_id, detail)` —
  fire-and-forget style but awaited inside the same request; failures logged with
  `tracing::warn!` and swallowed (an audit hiccup must never fail the business mutation —
  document this trade-off in the service).
- Call it from each mutation service after success: catalog CRUD, order/payment CRUD, sales
  status changes, invoice create/void/payment, settings updates, role/permission changes,
  admin-user changes (§1), plus `login`/`logout` in the auth service.
- `GET /api/admin/audit-events?limit=50&before=<id>` — Read on `admin-overview`; keyset
  pagination from day one (this table only grows; see §8).

**Frontend.**
- The Overview "Team log" card fetches real events (actor, verb phrase, relative time) with the
  current static seed entries moved to fallback data.
- Optional later: per-entity history ("show changes" on an invoice) filtered by
  `entity_type + entity_id`.

**Tests.** Mutation writes exactly one event with the acting username; audit insert failure
does not fail the mutation (simulate by dropping the table inside a test transaction).

---

## 8. Pagination on admin lists

**Why.** Every admin GET returns the full table. Fine at demo scale; at a few thousand orders
the payloads and table renders will crawl. Descoped from the auth feature; becomes urgent the
moment real data flows.

**Design — keyset, not offset.** All list tables have serial `id` + `created_at`, and every
panel sorts client-side anyway. Keyset (`WHERE id < $before ORDER BY id DESC LIMIT $n`) stays
fast at any depth and is stable under concurrent inserts. Offset pagination is simpler but
degrades and double-shows rows; not worth it when the cursor is one integer.

**Backend.**
- Shared `dto` shape: `Paged<T> { items: Vec<T>, next_cursor: Option<i64> }`.
- Add optional `?limit=<1..=100, default 50>&before=<id>` to: `/api/admin/orders`,
  `/api/admin/payments`, `/api/admin/sales`, `/api/admin/invoices`,
  `/api/admin/customer-portal`, and `/api/admin/audit-events` (§7).
  **Backward compatibility**: when the params are absent, return the flat array exactly as
  today (bounded by a hard cap of e.g. 500) so the frontend can migrate panel-by-panel.
- Invoices need care: line items/payments are aggregated per invoice — paginate the parent
  query first, then fetch children `WHERE invoice_id = ANY($ids)` (two queries, no N+1).

**Frontend.**
- `ManagementTable` gains an optional footer: "Showing N · Load more" wired to a
  `onLoadMore?: () => void` prop; panels append pages into existing state.
- Client-side sorting then applies within loaded rows — acceptable; add a note in the header
  when more rows exist server-side ("sorted within loaded records").
- `fetchJson` fallback path returns the flat fallback array with `next_cursor: null`.

**Tests.** Page boundaries exact (no dup/skip across cursor), cap enforced, legacy no-param
shape unchanged.

---

## 9. Invoice polish + settings validation

**Why.** Two loose ends from the original feature: the invoice Print button renders nothing,
and Settings accepts free text for values that have formats (tax rate, currency code, sequence).

**Invoice printing.**
- `InvoicesPanel` already renders a print-view block; wire the button to open a dedicated
  print layout: render the selected invoice into a hidden `<div class="invoice-print-sheet">`,
  call `window.print()`, and use a `@media print` section in `styles.css` that hides
  `.admin-shell` and shows only the sheet (company name/address pulled from
  `general.company_name` / `general.company_address` settings already in state).
  No new dependencies — no PDF library; the browser's print-to-PDF covers the need.
- Sheet contents: invoice number, issue/due dates, status, bill-to block, line items table
  (description, qty, unit, amount), payments received, balance due, payment terms footer
  (`invoicing.payment_terms_days`).

**Settings validation (server-side is the part that matters).**
- `system_settings` already stores `value_type` metadata — enforce it in
  `update_system_setting`: `int` must parse to i64 within a per-key range
  (`sales.default_tax_rate_bps`: 0..=10000; `invoicing.next_sequence`: > current value to
  prevent number reuse; `invoicing.payment_terms_days`: 0..=365), `text` keys get trim +
  non-empty, `general.currency_code` must match `^[A-Z]{3}$`.
  Per-key rules live in a match in the settings service; unknown keys are already rejected.
- Frontend mirrors with `RecordForm` `validate` callbacks for immediate feedback; the backend
  remains the authority.
- Guard the invoice-number race: `create_invoice_from_order` should increment
  `invoicing.next_sequence` with `UPDATE … RETURNING` inside its existing transaction if it
  doesn't already, so two concurrent invoices can't share a number.

**Tests.** Reject tax rate 10001 and currency `usd`; sequence cannot move backwards; invoice
numbers unique under two concurrent creations.

---

## 10. CI pipeline

**Why.** The integration tests guard the auth model but only run when someone remembers to run
them locally with the right env. A regression in `ensure_permission` should fail a PR, not a
prod deploy.

**Design (`.github/workflows/ci.yml`).**
- Trigger: `pull_request` + `push` to `main`.
- **Backend job**: postgres:18 service container (user/pass/db `project_depot`) — the stock
  image's superuser satisfies the `CREATEDB` right that `#[sqlx::test]`'s per-test databases
  need. Steps: `cargo fmt --check` → `cargo clippy --all-targets -- -D warnings` →
  apply `backend/migrations/*.sql` in order via psql (mirrors the documented local flow; the
  binary doesn't run `sqlx::migrate!`) → `cargo test` with
  `DATABASE_URL=postgres://project_depot:project_depot@localhost:5432/project_depot`.
  Cache: `Swatinem/rust-cache@v2` (halves the ~5 min cold build).
- **Frontend job** (parallel): `bun ci` → `bun run build` (tsc is the type gate; there are no
  frontend unit tests yet — see below).
- Branch protection on `main` requiring both jobs keeps the workflow honest.

**Follow-on (separate, optional): frontend tests.** When wanted, Vitest + Testing Library
covering `RecordForm` validation, `ManagementTable` sorting, and the `adminAuth` state machine
(`restoreAdminSession` network-error → demo, 401 → unauthenticated) — those three carry most of
the UI logic. This adds dev dependencies, so per CLAUDE.md it needs an explicit decision.

---

## 11. Customer accounts (bigger bet)

**Why.** Checkout is anonymous; the loyalty program (`customer_portal_profiles` with tiers and
points) has no owner-facing surface. Accounts unlock order history, saved carts, address reuse,
and turn §4's email lookup into real authenticated access. This is the largest item here —
treat it as its own planned feature with the same rigor as the admin-auth feature.

**Migration (`0016_customer_accounts.sql`).**
- `customer_accounts (id, email UNIQUE (lower-indexed), password_hash, display_name,
  created_at, updated_at)` — deliberately parallel to `admin_users`.
- `customer_sessions (token UNIQUE, customer_account_id FK CASCADE, created_at, expires_at)` —
  parallel to `admin_sessions`; 30-day expiry (shoppers, not operators).
- `ALTER TABLE customer_portal_profiles ADD COLUMN customer_account_id INTEGER
  REFERENCES customer_accounts(id);` nullable — existing email-keyed profiles keep working;
  link on first login/registration by matching email.

**Backend.**
- New `customer_auth` module reusing `auth::service::hash_password` and the token generator
  (extract both into a shared helper rather than duplicating):
  `POST /api/account/register`, `POST /api/account/login`, `POST /api/account/logout`,
  `GET /api/account/me` (profile + points + recent orders), all public routes with their own
  `CustomerIdentity` extractor reading the same `Authorization: Bearer` header.
  **Keep customer and admin identities strictly separate types** so a customer token can never
  satisfy an `AdminIdentity` parameter — the type system enforces the boundary.
- Checkout: when a `CustomerIdentity` is present, attach `customer_account_id` to the order and
  award points server-side (rule lives with the existing portal-profile update in checkout).
- Registration rules: email format, password ≥ 8 chars, uniform "unable to register" on
  duplicate email (no enumeration — same discipline as admin login).

**Frontend.**
- Account drawer becomes the login/register surface (separate storage key
  `depot_customer_token`; never share the admin token plumbing — add a parallel token slot in
  `http.ts` scoped to `/api/account` and checkout calls).
- Signed-in drawer: profile card (tier, points), order history with fulfillment status (§2),
  logout. Checkout pre-fills name/email.
- Fallback mode: drawer renders a signed-out demo state.

**Tests.** Register/login/me roundtrip; customer token rejected on `/api/admin/*` (the
cross-boundary test is the important one); checkout links account and increments points.

---

## 12. Product images (bigger bet)

**Why.** Products render as colored `tone` cards with text. Imagery is the single biggest
storefront-feel upgrade, and it touches catalog admin, storefront, and (eventually) storage
infrastructure.

**Phase 1 — URL-based (small, ship first).**
- Migration `0017_product_images.sql`:
  `ALTER TABLE products ADD COLUMN image_url TEXT NOT NULL DEFAULT '';`
- Backend: include `image_url` in product SELECTs and create/update inputs; validate it's
  either empty or `http(s)://` (reject `data:`/`javascript:` schemes at the service layer).
- Frontend: `<img loading="lazy">` in storefront cards and cart rows with the existing tone
  block kept as the no-image fallback (`onError` → tone card, so broken URLs and demo mode
  degrade identically); image URL field (with live preview) in the CatalogPanel product form;
  thumbnails in the product `ManagementTable`.
- Fallback data gets a few public demo image URLs (or empty strings to exercise the tone path).

**Phase 2 — Uploads (separate decision; new dependency).**
- `POST /api/admin/products/{id}/image` (Update on `admin-catalog`) accepting multipart
  (axum `multipart` feature — dependency addition needs the usual CLAUDE.md scrutiny), size cap
  ~2 MB, content sniffing (magic bytes, not the client's Content-Type), re-encode or at least
  strip EXIF, store under a served `/uploads` dir locally with the path in `image_url`.
  S3/R2 only if deployment ever needs it — don't build for it early.
- Until Phase 2, admins paste URLs; that's a perfectly good state to sit in.

**Tests (Phase 1).** Scheme validation rejects `javascript:`; product create/update roundtrips
`image_url`; storefront payload includes it.

---

## Suggested sequencing

| Order | Item | Size | Depends on |
|-------|------|------|------------|
| 1 | §1 Admin user management (+ session purge, lower-index) | M | — |
| 2 | §10 CI pipeline | S | — (do early, everything after is protected) |
| 3 | §2 Fulfillment status flow | M | — |
| 4 | §3 Inventory / stock | M | — (dashboard card needs it) |
| 5 | §6 Real dashboard metrics | S | best after §2 + §3 |
| 6 | §7 Audit log | S–M | — (richer after §1) |
| 7 | §4 Customer order lookup | S | nicer after §2 |
| 8 | §5 Storefront search | S–M | — |
| 9 | §9 Invoice polish + settings validation | S | — |
| 10 | §8 Pagination | M | do before real data volume arrives |
| 11 | §11 Customer accounts | L | absorbs §4 |
| 12 | §12 Product images | S (phase 1) / M (phase 2) | — |

S ≈ half a day, M ≈ 1–2 days, L ≈ a week, at the pace the auth feature was built.
