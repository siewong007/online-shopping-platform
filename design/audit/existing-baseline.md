# Existing Baseline Audit (Step 1)

Scope: `frontend/` only. Read-only audit, no source files modified. Repo root:
`online-shopping-platform`. Date: 2026-07-31.

## Baseline test output

Command: `bun run test` (= `bun test`, `frontend/package.json:9`)

```
bun test v1.3.14 (0d9b296a)

 55 pass
 0 fail
 172 expect() calls
Ran 55 tests across 9 files. [144.00ms]
```

Result: **55/55 pass, 0 fail.** Test files (`frontend/tests/**`):

| File |
|---|
| `frontend/tests/notifications/components.test.tsx` |
| `frontend/tests/notifications/errors.test.ts` |
| `frontend/tests/notifications/globalHandlers.test.ts` |
| `frontend/tests/notifications/store.test.ts` |
| `frontend/tests/offers/api.test.ts` |
| `frontend/tests/shared/http.test.ts` |
| `frontend/tests/shared/record-form-validation.test.ts` |
| `frontend/tests/support/api.test.ts` |
| `frontend/tests/support/components.test.tsx` |

No test coverage exists for `App.tsx` itself, `LandingView`, `CatalogPanel`, or any storefront-facing rendering (StorefrontView, ProductDetailView, CartDrawer, AccountDrawer, ShopHeader/Footer) — all current tests target `notifications`, `offers` API, `shared` (http/record-form), and `support`.

## Baseline build output

Command: `bun run build` (= `tsc -b && vite build`, `frontend/package.json:10`)

```
[36mvite v8.1.4 building client environment for production...
transforming...✓ 67 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.20 kB │ gzip:   0.62 kB
dist/assets/index-DLtltETc.css  121.72 kB │ gzip:  23.67 kB
dist/assets/index-DoOF7D-n.js   531.13 kB │ gzip: 145.41 kB

✓ built in 732ms
[33m[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

Result: **`tsc -b` passed with 0 type errors, `vite build` succeeded.** Exactly 1 warning: JS chunk (`index-DoOF7D-n.js`, 531.13 kB) exceeds the 500 kB chunk-size-warning threshold — expected for a single 5,375-line monolithic `App.tsx` with no code-splitting/dynamic `import()`.

## Router boundaries

Router type: hand-rolled state machine, `type View = "landing" | "store" | "product" | "admin" | "forbidden" | "not-found"` (`frontend/src/App.tsx:204`), driven by `viewFromPath()` (`App.tsx:206`) / `productIdFromPath()` (`App.tsx:215`) reading `window.location.pathname`, `window.history.pushState` via `openView()`/`openProductDetail()` (`App.tsx:1280`, `App.tsx:1288`), and a `popstate` listener (`App.tsx:1268-1276`). No react-router.

### 1. Storefront home/shell (landing + store view chrome)

| Element | Component | Citation |
|---|---|---|
| Landing page | `LandingView` | imported `App.tsx:75` (`./modules/landing/LandingView`), rendered `App.tsx:2401-2407` (`if (view === "landing") return <div className="app-shell landing-shell"><LandingView onOpenShop={openShop} /></div>`) |
| Store/product shell wrapper | inline in `App.tsx` | `App.tsx:2413-2501` — `<div className="app-shell ...">` → `<div className="storefront-shell">` |
| Header/nav/search chrome | `ShopHeader` (defined in `App.tsx`) | `App.tsx:1017-1100`; rendered `App.tsx:2425-2444` |
| Footer chrome | `ShopFooter` (defined in `App.tsx`) | `App.tsx:1102` (definition starts); rendered `App.tsx:2473` |
| Cart drawer | `CartDrawer` (defined in `App.tsx`) | `App.tsx:4219`; rendered `App.tsx:2475-2489` |
| Account drawer | `AccountDrawer` (defined in `App.tsx`) | `App.tsx:3381`; rendered `App.tsx:2490-2499` |
| Support widget | `SupportChatWidget` | imported `App.tsx:105` (`./modules/support/components/SupportChatWidget`); rendered `App.tsx:2500` |

Note: `ShopHeader`, `ShopFooter`, `CartDrawer`, `AccountDrawer`, `StorefrontView`, `ProductDetailView` are **not** separate module files — they are function components defined directly inside the monolithic `App.tsx`.

### 2. Category listing (within store view)

Rendered inline inside `StorefrontView` (defined `App.tsx:2665`, itself defined inside `App.tsx`, not a module):
- Category grid section: `App.tsx:2816-2838` (`<section className="category-section" id="categories">`, maps `storefront.categories`)
- Department radio filter list (sidebar): `App.tsx:2977-2992` (`<div className="fgroup">` "Department")
- Department chip bar in header: `ShopHeader`, `App.tsx:1086-1097` (`<nav className="dept-chip-bar">`)

There is **no separate `CategoryList`/`CategoryPanel` component for the storefront** — `CatalogPanel` (`frontend/src/modules/catalog/components/CatalogPanel.tsx`) is admin-only (see #7/#9 below; used only at `App.tsx:5134` and `App.tsx:5186` inside `AdminView`), not used by the customer-facing store view. This contradicts the assumption in the task prompt that `CatalogPanel` renders storefront category listing — it does not.

### 3. Search results (search + category + price filter)

- Filtering itself happens server-side via `fetchStorefront(params)` (`frontend/src/modules/storefront/api/storefrontApi.ts:79-93`), debounced 300ms in `App.tsx:1240-1266`; params built from `searchTerm`, `selectedCategory`, `minPriceCents`, `maxPriceCents`, `sortOption` state.
- Client-side additional filters (on-sale/in-stock) applied in `StorefrontView`: `App.tsx:2692-2696` (`visibleProducts = filteredProducts.filter(...)`).
- Result grid rendering: `App.tsx:3045-3107` (`<div className="product-grid">` mapping `visibleProducts`).
- Result count display: `App.tsx:2861` (`shop-toolbar-count`) and `App.tsx:2844` (`shop.savings.count`).

### 4. Product detail (`"product"` view)

`ProductDetailView` (defined `App.tsx:3155-3333`), rendered at `App.tsx:2466-2470`. Fetches via `fetchProductDetail(productId)` (`App.tsx:3175`), handles `loading`/`not-found`/`error`/`loaded` states (`App.tsx:3157, 3213-3230`). 404 from API maps to `"not-found"` state (`App.tsx:3183`).

### 5. Empty-results state

**NOT FOUND — no zero-results UI exists.** Checked `StorefrontView`'s product-grid rendering (`App.tsx:3045-3107`): `visibleProducts.map(...)` is rendered directly inside `<div className="product-grid">` with no preceding/following conditional for `visibleProducts.length === 0`. If a search/filter/category combination yields zero products, the grid renders as an empty `<div>` with no message, no "no results found" text, no reset-filters CTA beyond the always-visible "Clear all" filter chip (`App.tsx:2933-2935`, only shown when `hasActiveFilters` is true regardless of result count). Also checked `ProductDetailView` reviews list, which *does* have an empty state (`App.tsx:3277-3278`, "no reviews" message) for contrast — confirming the omission on the product grid is a real gap, not a pattern used elsewhere.

### 6. Offline/fallback state — storefront vs admin

**The storefront DOES use fallback data on API failure, not just admin.** Confirmed via the exact call chain:

- `App.tsx:1233`: `void fetchStorefront().then(setStorefront);` — no `.catch()`, because `fetchStorefront` never rejects.
- `fetchStorefront()` (`frontend/src/modules/storefront/api/storefrontApi.ts:79-93`) calls `fetchJsonResult(path, fallbackStorefront)` (`storefrontApi.ts:80-83`, fallback imported from `frontend/src/data/fallback.ts:21` — `fallbackStorefront`).
- `fetchJsonResult` (`frontend/src/shared/api/http.ts:310-326`) wraps the whole request in try/catch: on any thrown error (network error, non-OK response converted to `ApiError` at line 319, or JSON parse failure) it returns `{ data: fallback, isFallback: true }` (`http.ts:324`) instead of throwing. It also fires `onApiUnavailable?.()` when the error is a network-type error (`http.ts:323`), but **no listener is ever registered** for `onApiUnavailable` (see defect list, #10) — so nothing currently reacts to it storefront-side.
- Because `fetchStorefront` always resolves (never throws), `setStorefront(payload)` at `App.tsx:1233` always succeeds and the storefront renders — with real data when the API is up, with `fallbackStorefront` (9 categories, 8 demo products, 3 promotions, defined `frontend/src/data/fallback.ts:21-191`) when it is down. There is no visible "offline"/"fallback" banner on the storefront side (unlike admin, see below) — the fallback data is presented indistinguishably from live data.
- Debounced re-fetch on filter change (`App.tsx:1248-1259`) goes through the same `fetchStorefront` → same fallback path, filtered/sorted client-side when in fallback mode (`storefrontApi.ts:85-92`).
- `fetchPublicOffers()` (`App.tsx:1237`) — same fallback pattern (not traced in depth here, but same `fetchJson`-family function; also public/storefront-facing).

Admin has its own, separate, visible fallback path: `restoreAdminSession()` (`App.tsx:1541-1562`) catches `ApiError` where `error.isNetworkError` is true (`App.tsx:1554`) and calls `loadDemoAdminData()` (`App.tsx:1555`, uses `fallbackPermissions` at `App.tsx:1468`), setting `adminAuth = "demo"`. This drives `demoMode` (`App.tsx:2519`: `demoMode={adminAuth === "demo"}`) which shows an explicit banner: *"API unreachable. Showing fallback admin data with write controls disabled."* (`App.tsx:5112-5115`).

**Conclusion for redesign risk:** the CLAUDE.md rule ("the storefront must still render if the API is down") is already satisfied structurally today via `fetchJsonResult`'s fallback-on-catch design — any redesign must preserve the `fetchStorefront` → `fetchJsonResult` → `fallbackStorefront` chain (or an equivalent), and should not introduce a `.catch()`/throw that would break the current no-throw contract. Unlike admin, the storefront has **no visible indicator** that it is showing fallback data — worth deciding deliberately whether the redesign should add one.

### 7. Admin (`"admin"` view) — boundary only

`AdminView` (defined `App.tsx:4895-`, rendered `App.tsx:2510-2591`) is the shell; tab-switched child panels (all imported modules, forbidden to touch):

| Tab | Component | Import / module path |
|---|---|---|
| overview | `OperationsConsole` | `frontend/src/modules/dashboard/components/OperationsConsole.tsx` (import `App.tsx:74`) |
| inventory | `CatalogPanel` | `frontend/src/modules/catalog/components/CatalogPanel.tsx` (import `App.tsx:73`; used `App.tsx:5134`) |
| fulfillment / orders | `OrderControlPanel` | `frontend/src/modules/orders/components/OrderControlPanel.tsx` (import `App.tsx:99`; used `App.tsx:5151`, `App.tsx:5225`) |
| campaigns | `OfferManagementPanel` | `frontend/src/modules/offers/components/OfferManagementPanel.tsx` (import `App.tsx:88`; used `App.tsx:5169`) |
| catalog | `CatalogPanel` | (same as inventory tab, used again `App.tsx:5186`) |
| customers | inline JSX in `AdminView` | `App.tsx:5201-` |
| support | `SupportInboxPanel` | `frontend/src/modules/support/components/SupportInboxPanel.tsx` (import `App.tsx:106`; used `App.tsx:5218`) |
| payments | `PaymentManagementPanel` | `frontend/src/modules/payments/components/PaymentManagementPanel.tsx` (import `App.tsx:101`; used `App.tsx:5242`) |
| sales | `SalesPanel` | `frontend/src/modules/sales/components/SalesPanel.tsx` (import `App.tsx:103`; used `App.tsx:5255`) |
| invoices | `InvoicesPanel` | `frontend/src/modules/invoices/components/InvoicesPanel.tsx` (import `App.tsx:76`; used `App.tsx:5268`) |
| settings | `SettingsPanel` | `frontend/src/modules/settings/components/SettingsPanel.tsx` (import `App.tsx:104`; used `App.tsx:5286`) |
| permissions | `PermissionsPanel` + `TeamPanel` | `frontend/src/modules/permissions/components/PermissionsPanel.tsx` (import `App.tsx:102`; used `App.tsx:5295`), `frontend/src/modules/admin_users/components/TeamPanel.tsx` (import `App.tsx:71`; used `App.tsx:5304`) |
| login gate | `AdminLoginScreen` | `frontend/src/modules/auth/components/AdminLoginScreen.tsx` (import `App.tsx:72`; used `App.tsx:2503`) |

### 8. Checkout / payment / account / login — boundary only

| Surface | Where it lives | Citation |
|---|---|---|
| Checkout (cart → order submission) | `CartDrawer` (in `App.tsx`), stage `"checkout"` | Component `App.tsx:4219`; `submitCheckout()` handler `App.tsx:1637` (calls `checkoutRequest`, imported from `./lib/api` at `App.tsx:5`) |
| Payment (customer-facing quote) | `quoteCheckout` | imported `App.tsx:98` from `./modules/orders/api/orderApi`; used inside `CartDrawer` |
| Payment (admin ledger) | `PaymentManagementPanel` | `frontend/src/modules/payments/components/PaymentManagementPanel.tsx` (admin-only, see #7) |
| Customer account / login/register | `AccountDrawer` (in `App.tsx`) | Component `App.tsx:3381-`; uses `loginCustomer`/`registerCustomer`/`logoutCustomer*` (imported `App.tsx:44-49` from `./lib/api`) |
| Admin login | `AdminLoginScreen` | `frontend/src/modules/auth/components/AdminLoginScreen.tsx` (see #7) |

Note: checkout and customer-account/login logic is **not** module-isolated — it lives inline inside the same monolithic `App.tsx` as the storefront view code (`CartDrawer` and `AccountDrawer` function components), so redesign changes to `App.tsx` must be careful not to touch these blocks even though there's no file boundary protecting them.

### 9. Shared CSS — critical risk list

Only two CSS files exist under `frontend/src` (confirmed via glob `frontend/src/**/*.css`):

| File | Imported by | Scope |
|---|---|---|
| `frontend/src/styles.css` (4,769 lines) | `frontend/src/main.tsx:7` (`import "./styles.css"`) — loaded once, globally, for the entire app | **Global — used by every view: landing, store, product, admin, checkout, account/login.** |
| `frontend/src/modules/landing/landing.css` (888 lines) | `frontend/src/modules/landing/LandingView.tsx:6` only | Landing-only (landing view is never shown alongside admin/checkout, so lower risk) |

There is no CSS-module system, no Tailwind, no per-feature stylesheet for admin/checkout/account — **`styles.css` is the single stylesheet for everything except the landing page**, confirmed by:
- 206 top-level selectors in `styles.css` matching the prefixes `admin-|storefront-|shop-|product-|cart-|account-|login-|checkout-|app-shell` (mixed admin + storefront + checkout naming all in one file).
- 52 occurrences of `.admin-` prefixed selectors specifically in `styles.css`.
- Cross-cutting shared class names confirmed in use on both sides, e.g.:
  - `.solid-button` / `.outline-button` (`styles.css:242-286`) — used in storefront (`App.tsx:1065-1071` header buttons, `App.tsx:3264` add-to-cart) **and** admin (`App.tsx:5090-5109` sidebar buttons).
  - `.eyebrow` (`styles.css:195`) — used in storefront section headings (`App.tsx:2818` etc.) **and** admin (`App.tsx:5059, 5083, 5108`).
  - `.status-pill` (`styles.css:498, 508`) — used in admin (`App.tsx:5087-5088`).
  - `.app-shell` (`styles.css:85-97`, including `.app-shell.storefront-app-shell` variant) — the root wrapper class is shared and switched via ternary at `App.tsx:2414-2421` between `admin-shell` / `storefront-app-shell` / plain `app-shell`.

**Risk:** any redesign touching `styles.css` selectors like `.solid-button`, `.outline-button`, `.eyebrow`, `.status-pill`, `.app-shell`, or any bare (non `shop-`/`product-`-prefixed) utility class risks visually breaking admin, checkout, and account/login surfaces simultaneously, since they all pull from the same global file with no scoping. Prefer touching only clearly storefront-prefixed selectors (`.shop-*`, `.product-*`, `.hero-*`, `.category-*`, `.dept-chip*`, `.cart-line-*` etc.) and treat any bare/shared class name as forbidden-to-touch without a full admin+checkout regression pass.

## Known existing defects

| # | Defect | Evidence |
|---|---|---|
| 1 | Build emits 1 chunk-size warning | `bun run build` output: `index-DoOF7D-n.js` is 531.13 kB, over the 500 kB Vite warning threshold — expected given the monolithic `App.tsx` (5,375 lines) with no `dynamic import()` code-splitting. Not a failure, just a warning. |
| 2 | No zero-results ("no products found") state in storefront search/filter | See item #5 above — `App.tsx:3045-3107`; confirmed by contrast with `ProductDetailView`'s reviews list which does have an explicit empty state (`App.tsx:3277-3278`). |
| 3 | `setOnApiUnavailable` callback registered nowhere | `frontend/src/shared/api/http.ts:294-296` defines `setOnApiUnavailable`, and `onApiUnavailable?.()` is invoked in 3 places (`http.ts:323, 338, 358`) on network failure — but a repo-wide grep for `setOnApiUnavailable(` finds only its own definition, no caller anywhere in `frontend/src`. This means the network-unavailable signal is currently a no-op / dead hook — nothing shows a toast/banner off of it today (storefront relies solely on the silent per-request fallback data described in #6, and admin's demo-mode banner is driven independently via `ApiError.isNetworkError` checks in `App.tsx:1554`, not via this callback). |
| 4 | No automated test coverage for `App.tsx` or any storefront-facing component | Test suite (`frontend/tests/**`, 9 files, 55 tests) covers only `notifications`, `offers` API, `shared/http` + `record-form-validation`, and `support`. No tests exist for `App.tsx`, `LandingView`, `StorefrontView`, `ProductDetailView`, `CartDrawer`, `AccountDrawer`, `ShopHeader`/`ShopFooter`, or `CatalogPanel`. Any redesign regression in these areas will not be caught by `bun run test`. |
| 5 | No TODO/FIXME/HACK comments found | Grepped `TODO|FIXME|XXX|HACK|@deprecated|not implemented|unimplemented` (case-insensitive) across all of `frontend/src` — zero matches. Not a defect per se, but noted since the task asked to surface any such markers; there are none to attribute to prior work. |

## Verification

```
$ git status --short
?? catalogue.json
?? docs/storefront-redesign-workflow.md
```

(`design/` itself is untracked from a prior step and is not re-listed here because this file was added inside it — no tracked file was modified; only this new file was created under `design/audit/`, which is within the explicitly allowed deliverable path.)
