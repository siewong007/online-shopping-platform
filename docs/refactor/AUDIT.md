# Repository Audit & Gap Analysis — Online Shopping Platform (Ekoway Hardware)

## 1. Stack & Architecture Summary

| Layer | Technology & Tooling |
| --- | --- |
| **Backend (`backend/`)** | Rust `1.95.0` (edition 2024), Axum `0.8`, SQLx `0.8` (async PostgreSQL), Tokio, `tower-http` `0.6` (CORS + tracing), `argon2` `0.5` (password hashing), `chacha20poly1305` `0.10` + `totp-rs` `5.7` (TOTP MFA), `lettre` `0.11` (SMTP outbox), `reqwest` `0.12` (HitPay, senangPay, Cloudflare Turnstile). |
| **Frontend (`frontend/`)** | React `19.3.1`, TypeScript `7.0.2` (native Go compiler), Vite `8.3.8`, Bun `1.3.14`. Custom CSS design-token stylesheet (`src/styles.css`), trilingual i18n (`en` / `bm` / `zh`), graceful offline fallback data (`src/data/storefrontFallback.ts`, `src/data/fallback.ts`). |
| **Database** | PostgreSQL `19beta1` (`docker-compose.yml` mapped to `localhost:5433`), 39 append-only SQL migrations (`backend/migrations/0001_initial.sql` – `0039_orders_customer_account_index.sql`). |
| **Authentication & Roles** | Dual-realm opaque SHA-256 hashed bearer tokens: **Admin Console** (`admin_users`, `admin_sessions`, RBAC roles/permissions, optional encrypted TOTP MFA + recovery codes, username/IP throttle) and **Customer Account** (`customer_accounts`, `customer_sessions` with multi-device revocation, membership tiers/points). |
| **Hosting & CI/CD** | Multi-stage Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile` with Nginx), Caddy reverse proxy (`deploy/ekowayhardware.Caddyfile`, `deploy/ekowayhardware-staging.Caddyfile`), GitHub Actions CI (`.github/workflows/ci.yml`), staging/prod deploy workflows, and encrypted off-instance `age` + `rclone` backups with 15 bash guardrail test suites (`scripts/`). |

---

## 2. Feature, Route, Model & Background Job Map

### Frontend Screens & Views (`frontend/src/`)
- **Public Landing (`/`)**: `LandingView` — Ekoway Hardware brand landing, category entry points, bilingual/trilingual switcher, store info.
- **Storefront (`/shop`)**: `StorefrontView` + `ShopChrome` — category filter, search, min/max price filter, stock/on-sale toggles, job lenses (`jobLenses.ts`), keyset/offset pagination, offline fallback banner.
- **Product Detail (`/shop/product/:id`)**: `ProductDetailView` + `ProductReviewsSection` — product gallery, stock status, JSON-LD structured data, verified-buyer reviews, recently viewed strip.
- **Legal & Policy Pages (`/legal/privacy`, `/legal/terms`, `/legal/refunds`, `/legal/shipping`)**: `LegalPage` + Malaysia PDPA-aligned `content.ts`.
- **Interactive Drawers & Widgets**:
  - `CartDrawer` — stock-aware cart, promotion/voucher quote (`/api/checkout/quote`), pickup/delivery checkout, HitPay/senangPay payment gateway redirect + return handling, Cloudflare Turnstile verification.
  - `AccountDrawer` — customer registration/login, profile, membership tier & points, benefits, order history, active session management, guest order lookup.
  - `SupportChatWidget` — customer/guest live support threads with token persistence and Turnstile gate.
- **Admin Console (`/admin`)**: `AdminLoginScreen` (with MFA step) + `AdminView` tabs:
  - `overview` (metrics + audit feed), `operations` (`OperationsConsole` exception worklist), `orders` (`OrderControlPanel`), `catalog` (`CatalogPanel` + AutoCount CSV & image manifest import), `offers` (`OfferManagementPanel` promotions & vouchers), `payments` (`PaymentManagementPanel` + gateway reconcile/refund + UAT activation grants), `sales` (`SalesPanel`), `invoices` (`InvoicesPanel` + AutoCount export + e-Invoice fields), `customers` (`CustomerPortalPanel`), `support` (`SupportInboxPanel`), `permissions` (`PermissionsPanel`), `team` (`TeamPanel` admin users + MFA enrollment), `settings` (`SettingsPanel`).

### Backend API Surface (`backend/src/routes.rs`)
- **Health & Readiness**: `GET /api/health` (verifies schema presence across 17 core tables + reports stack targets).
- **Public Storefront & Offers** (per-IP rate-limited; mutations gated by Turnstile):
  - `GET /api/storefront`, `GET /api/storefront/sitemap.xml`, `GET /api/storefront/products/{product_id}`, `GET /api/offers`
  - `POST /api/checkout/quote`, `POST /api/checkout`, `POST /api/checkout/payment`
  - `GET /api/customer-portal/lookup` (throttled per email & IP)
  - `POST /api/support/conversations`, `GET|PUT /api/support/conversation`, `GET|POST /api/support/messages`
- **Customer Account & Portal**:
  - `POST /api/account/register`, `POST /api/account/login`, `POST /api/account/logout`, `GET /api/account/me`
  - `GET /api/account/sessions`, `DELETE /api/account/sessions/others`, `DELETE /api/account/sessions/{session_id}`
  - `POST /api/account/products/{product_id}/reviews`
  - `GET /api/customer-portal/me/membership`, `GET /api/customer-portal/me/benefits`, `GET /api/customer-portal/me/transactions`
- **Admin Auth, MFA & RBAC**:
  - `POST /api/admin/login`, `POST /api/admin/login/verify`, `POST /api/admin/logout`, `GET /api/admin/me`, `PUT /api/admin/me/password`
  - `GET /api/admin/mfa/status`, `POST /api/admin/mfa/enrollment`, `POST /api/admin/mfa/enrollment/verify`, `POST /api/admin/mfa/disable`
  - `GET|POST /api/admin/users`, `PUT /api/admin/users/{user_id}`, `PUT /api/admin/users/{user_id}/status`, `PUT /api/admin/users/{user_id}/password`
  - `GET /api/admin/permissions`, `POST /api/admin/roles`, `PUT|DELETE /api/admin/roles/{role_id}`, `PUT /api/admin/role-permissions`
- **Admin Operations & Merchandising**:
  - `GET /api/admin/dashboard`, `GET /api/admin/audit-events`, `GET /api/admin/settings`, `PUT /api/admin/settings/{key}`
  - `GET /api/admin/catalog`, `POST /api/admin/categories`, `PUT|DELETE /api/admin/categories/{slug}`, `POST /api/admin/products`, `PUT|DELETE /api/admin/products/{product_id}`, `PUT /api/admin/products/{product_id}/stock`
  - `POST /api/admin/catalogue/import` (16 MiB body cap), `POST /api/admin/catalogue/images/import` (16 MiB body cap)
  - `GET|POST /api/admin/promotions`, `PUT|DELETE /api/admin/promotions/{promotion_id}`, `GET|POST /api/admin/vouchers`, `PUT|DELETE /api/admin/vouchers/{voucher_id}`
  - `GET|POST /api/admin/orders`, `PUT|DELETE /api/admin/orders/{order_id}`, `PUT /api/admin/orders/{order_id}/fulfillment`
  - `GET|POST /api/admin/payments`, `PUT|DELETE /api/admin/payments/{payment_id}`, `POST /api/admin/payments/activation-grants`, `POST /api/admin/payments/{payment_id}/reconcile`, `POST /api/admin/payments/{payment_id}/refund`
  - `GET /api/admin/sales`, `GET /api/admin/sales/summary`, `PUT /api/admin/sales/{order_id}`, `PUT /api/admin/sales/{order_id}/status`
  - `GET /api/admin/invoices`, `POST /api/admin/invoices/from-order/{order_id}`, `POST /api/admin/invoices/autocount-export`, `PUT /api/admin/invoices/{invoice_id}`, `POST /api/admin/invoices/{invoice_id}/void`, `POST /api/admin/invoices/{invoice_id}/payments`
  - `GET|POST /api/admin/customer-portal`, `PUT|DELETE /api/admin/customer-portal/{profile_id}`
  - `GET /api/admin/support/conversations`, `PUT /api/admin/support/conversations/{conversation_id}`, `GET|POST /api/admin/support/conversations/{conversation_id}/messages`
- **Payment Provider Webhooks**:
  - `POST /api/payments/senangpay/callback`, `POST /api/payments/hitpay/webhook`

### Background Workers & Scheduled Jobs
- `spawn_abandoned_stock_sweep` (`backend/src/main.rs`): runs every 5 minutes to return held stock for unpaid abandoned orders past `inventory.unpaid_release_minutes`.
- `Emailer::spawn_outbox_worker` (`backend/src/emailer.rs`): asynchronous SMTP outbox processor with retry/backoff and audit-event failure logging.
- Systemd timers (`deploy/online-shopping-backup.timer`, `online-shopping-backup-health.timer`, `online-shopping-disk-usage.timer`): off-instance encrypted backup, health verification, and disk capacity checks.

---

## 3. Problems Found (Grouped by Severity)

### Critical
- *None found.* Secrets are not committed to Git, SQL queries are parameterized via SQLx, passwords use Argon2, TOTP secrets use ChaCha20-Poly1305, payment initiation fails closed (`PAYMENT_ACTIVATION_MODE=disabled` by default), and CORS restricts origin to `FRONTEND_ORIGIN`.

### High
1. **Frontend linting & React 19 static analysis missing from CI and failing across 18 files**:
   - Running ESLint (`eslint` + `typescript-eslint` + `eslint-plugin-react-hooks` v7 + `eslint-plugin-react-refresh`) surfaces **57 errors and 21 warnings**: render-phase ref reads/mutations (`NotificationProvider.tsx`, `TurnstileSlot.tsx`, `AccountDrawer.tsx`, `CartDrawer.tsx`, `RecordModal.tsx`), synchronous `setState` inside `useEffect` causing cascading renders, impure `Date.now()` inside `useMemo` (`OperationsConsole.tsx`), statement-position ternaries (`OperationsConsole.tsx`, `ManagementTable.tsx`), and unused imports.
2. **Incomplete TypeScript strict coverage**:
   - `frontend/tsconfig.json` only references `tsconfig.app.json` (`src/`) and `tsconfig.node.json` (`vite.config.ts`), leaving `frontend/tests/` unchecked by `tsc -b`.
   - `frontend/tsconfig.node.json` omits `"strict": true`.
3. **TypeScript 7.0 + `typescript-eslint` compatibility bridge needed**:
   - `typescript@7.0.2` (native Go compiler) does not expose the legacy JS compiler API expected by `typescript-eslint@8.73.0`; requires Microsoft's official `@typescript/typescript6` compatibility package wired cleanly for ESLint without downgrading `typescript@7.0.2`.
4. **Undocumented environment variables in `.env.example`**:
   - `backend/.env.example` omits `ADMIN_SEED_PASSWORD`, `RATE_LIMIT_PER_MINUTE`, `TRUST_PROXY`, and `RUST_LOG`.
   - `frontend/.env.example` omits `VITE_API_URL`.

### Medium
1. **Oversized orchestration & UI files**:
   - `frontend/src/App.tsx` is **2,386 lines**, combining storefront filter/query sync, cart/checkout state, customer auth sync, and all admin console state/handlers in a single component. Extractable custom hooks and domain controllers (`useStorefrontCatalog`, `useCartState`, `useAdminSession`, etc.) will dramatically reduce complexity without changing behaviour.
2. **Barrel drift & unused legacy wrappers**:
   - `frontend/src/lib/api.ts` omits the `offersApi` exports that `frontend/src/app/adminApi.ts` exposes.
   - `frontend/src/modules/orders/pages/OrdersPage.tsx` and `frontend/src/modules/permissions/pages/PermissionsPage.tsx` are unreferenced 1-line re-export wrappers, and `frontend/src/modules/dashboard/pages/`, `frontend/src/modules/storefront/pages/`, and `frontend/src/modules/storefront/components/` are empty directories.
3. **Avoidable `.unwrap()` in non-test backend code**:
   - `backend/src/db/catalogue_import.rs:92-97` calls `.unwrap()` six times on header lookup indices instead of returning `Result` via `.ok_or_else(...)`.
4. **Missing unified developer scripts & runtime version files**:
   - Root `Makefile` lacks unified `lint`, `format`, `typecheck`, `test`, and `check` targets; `.nvmrc` / `.bun-version` are absent; CI workflow does not yet run `bun run lint` or `bun run format:check`.

### Low
1. **Fast Refresh component-export hygiene**:
   - Six `.tsx` files export non-component helpers/constants alongside React components (`LanguageContext.tsx`, `NotificationProvider.tsx`, `TurnstileSlot.tsx`, `RecordModal.tsx`, `CustomerPortalPanel.tsx`, `listing.tsx`), degrading Vite HMR fast refresh.
2. **Project documentation gaps**:
   - Missing `CHANGELOG.md` and a consolidated `docs/environments.md` summarizing dev / staging / production configuration and PDPA data-handling/deletion procedures.

---

## 4. Phase 5 Gap Checklist

| Item | Status | Notes / Action |
| --- | --- | --- |
| README (stack, setup, env vars, scripts, deploy, structure) | **Partial** | Present; needs updated React 19.3 / TS 7.0 versions, unified scripts, and deployment links. |
| `.env.example`, `CHANGELOG.md`, `LICENSE` | **Partial** | `LICENSE` (MIT) and `.env.example` exist; add missing env vars and create `CHANGELOG.md`. |
| CI workflow (install, lint, typecheck, test, build) | **Partial** | `.github/workflows/ci.yml` runs backend fmt/clippy/test, frontend test/build, and 15 backup suites; add frontend `lint`, `format:check`, and `typecheck`. |
| Unit, integration & core-flow tests | **Present** | 10 Rust SQLx API integration suites + 8 frontend Bun test suites + 15 shell suites; will add characterization tests for extracted logic. |
| Database migrations & seed data committed | **Present** | 39 migrations (`backend/migrations/`) + `scripts/ci-seed-db.sql`. |
| Error monitoring & structured logging (no PII) | **Partial** | `tracing` on backend + `AppErrorBoundary` & `NotificationProvider` (`errors.ts`) on frontend; PII log audit & external alert hook documented in Phase 4/5. |
| Health-check endpoint | **Present** | `GET /api/health` verifies schema readiness across 17 tables + stack versions. |
| Documented environments (dev / staging / prod) & deploy | **Partial** | `docs/staging.md` & `docs/backup-restore-runbook.md` exist; consolidate environment matrix in `docs/environments.md`. |
| `CLAUDE.md` (stack, structure, conventions, commands) | **Present** | Exists and serves as single source of truth alongside `AGENTS.md`; will sync with Phase 1–5 updates. |
| Loading, empty, error & offline states | **Present** | Offline storefront fallback, `AppErrorBoundary`, skeleton/loading indicators, and empty-list states implemented. |
| Form validation & destructive-action confirmation | **Present** | Client + server validation and shared `ConfirmModal` (`shared/components/ConfirmModal.tsx`). |
| Accessibility (ARIA labels, contrast, focus traps, tap targets) | **Present** | Focus-trapped modals/drawers, ARIA live regions, skip/semantic landmarks, mobile tap-target rules. |
| Responsive layouts & safe areas | **Present** | Mobile/desktop responsive CSS with viewport/safe-area rules. |
| Shared design tokens & shared component set | **Present** | CSS custom properties in `styles.css` + `shared/components/` (`ConfirmModal`, `ManagementTable`, `RecordModal`, `StatusPage`, `TurnstileSlot`). |
| Centralised user-facing text / i18n | **Present** | `frontend/src/i18n/translations.ts` (`en`, `bm`, `zh`) + `modules/legal/content.ts`. |
| Time zones & date formats | **Present** | PostgreSQL `TIMESTAMPTZ` + `shared/formatters.ts` (`en-MY` / MYR formatting). |
| App icon, metadata, not-found page & favicon | **Present** | `favicon.ico`, `robots.txt`, dynamic route SEO + JSON-LD (`shared/seo.ts`), `StatusPage` for 404/not-found. |
| Notifications (in-app & transactional email) | **Present** | In-app toast/banner store (`shared/notifications/`) + SMTP transactional `email_outbox` worker. |
| Core domain lifecycles (Orders, Payments, Fulfillment, Support) *(replaces generic "Rides & events" prompt section)* | **Present** | Full order/payment/stock-hold/release/refund/fulfillment/invoice/support lifecycles implemented. *(Note: Carpool "rides/events" features are N/A to this hardware e-commerce platform.)* |
| Terms of use, Privacy Policy (Malaysia PDPA) & Account Deletion | **Partial** | PDPA Privacy Policy, Terms, Refund & Shipping pages exist (`/legal/*`) with manual PDPA deletion contact; **self-service in-app account deletion** requires schema/auth decisions — documented below as a product decision for owner review. |

### Product Decisions Deferred for Owner Confirmation (No Unapproved Schema/Auth Changes)
1. **Self-service customer account deletion (`DELETE /api/account/me`)**: Because orders, invoices, and e-Invoice records must be retained under Malaysian tax/accounting law (7 years) while personal account credentials/sessions are erased or anonymized under Malaysia's PDPA, implementing automated account deletion requires owner sign-off on anonymization vs soft-deletion schema rules. Current `/legal/privacy` routes deletion requests through the Privacy Officer.

---

## 5. Phase-by-Phase Refactor Plan

- **Phase 1 — Tooling & Standards**:
  - Upgrade frontend dependencies (`react` 19.3.1, `vite` 8.3.8, `typescript` 7.0.2, `@vitejs/plugin-react` 6.3.0) and sync `REACT_TARGET` in `backend/src/modules/health/controller.rs`.
  - Wire ESLint 10 + `typescript-eslint` (via `@typescript/typescript6` module-resolution bridge so `tsc` stays native TypeScript 7.0.2) + Prettier, enable `"strict": true` across all TS configs including `tsconfig.test.json`, fix all 57 lint errors and 21 warnings cleanly, add `.nvmrc`/`.bun-version`, `.gitignore` updates, unified scripts (`Makefile` + `package.json`), and Husky + `lint-staged` pre-commit hook.
- **Phase 2 — Structure & Naming**:
  - Reconcile `frontend/src/lib/api.ts` barrel exports with domain modules, remove empty placeholder directories, separate mixed component/helper exports for clean Fast Refresh, and standardize module boundaries.
- **Phase 3 — Code Quality**:
  - Decompose `frontend/src/App.tsx` by extracting cohesive domain hooks/helpers (storefront URL/filter state, cart helpers, admin console state/actions) without changing behaviour; eliminate non-test `.unwrap()` in `backend/src/db/catalogue_import.rs`; add characterization unit tests before/with structural extraction.
- **Phase 4 — Security, Privacy & Performance**:
  - Complete `backend/.env.example` and `frontend/.env.example`, audit startup env validation, verify auth/RBAC/CORS/rate-limit/SQL safety across all routes, run dependency security audits, and document Malaysia PDPA data-minimization & retention/deletion workflow.
- **Phase 5 — Fill Engineering Gaps**:
  - Update `.github/workflows/ci.yml` to enforce frontend `lint`, `format:check`, and `typecheck` alongside tests and build; add `CHANGELOG.md` and `docs/environments.md`.
- **Phase 6 — Final Verification & Documentation**:
  - Run clean install, fmt/format-check, clippy/lint, typecheck, unit + DB integration + bash guardrail tests, and production builds across backend and frontend; update `README.md`, `CLAUDE.md`, and final summary in `docs/refactor/PROGRESS.md`.
