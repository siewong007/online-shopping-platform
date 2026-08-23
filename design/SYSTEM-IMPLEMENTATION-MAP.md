# System → Implementation Map

Maps every component in `design/SYSTEM.md` §6 onto the existing codebase. Planning
reference for Step 5 — **no production component is created here**; nothing in
`frontend/**` was modified to produce it. Every line number below was verified by direct
inspection (re-verified in Step 3B).

**Risk:** 🟢 restyle in place · 🟡 new markup, contained · 🔴 needs an architecture/data
decision first.

**CSS scope column** assumes the mandatory rule from `SYSTEM.md` §8: every new or modified
rule is written descendant-scoped as `.storefront-shell .shop-…`. **No new `.product-*`
classes** — that prefix is already shared with admin (`CatalogPanel.tsx` uses
`product-image-upload` / `product-thumbnail`, defined globally at `styles.css:1532`, `:669`).

---

| Component | Current source | New file? | CSS scope | Data source | Protected behaviour | Risk |
|---|---|---|---|---|---|---|
| **Storefront shell** | `App.tsx:2413-2424` | No — restyle wrapper | `.storefront-shell` root (`styles.css:3196-3230`) | n/a | the `view === "store" \|\| "product"` conditional (`:2418-2424`) | 🟢 |
| **Header** | `ShopHeader`, `App.tsx:1017-1100` | No (extraction optional) | `.storefront-shell .shop-header-*` | `storefront.categories`, `cartCount` (props) | `onOpenAdmin` / `onOpenCart` / `onOpenAccount` (`:1023-1026`); `EkowayMark` (`:997-1003`) | 🟢 |
| **Search** | input in `ShopHeader` `:1055-1063`; state `:1164`; debounced effect `:1240-1266` | No — plus a small `aria-live` region in the toolbar | `.storefront-shell .shop-search-*` | `q` → `fetchStorefront` (`modules/storefront/api/storefrontApi.ts:79-93`) | 300ms debounce (`:1260`) and query-param shape (`:1249-1254`) | 🟢 |
| **Category nav** | `.dept-chip-bar`, `App.tsx:1086-1097`; CSS `styles.css:3265-3302` | No | `.storefront-shell .dept-chip*` — **override, never edit the global rule** (must also drop `border-radius: 999px` → `--sf-radius`) | `storefront.categories` | `onChangeCategory` (`:1091`) | 🟢 |
| **Filter controls** | `.fgroup`/`.opt`, `App.tsx:2977-2992`; CSS `:3410-3532` | Counts only: `modules/storefront/lib/facetCounts.ts` | `.storefront-shell .fgroup`, `.opt`, `.preset` (drop the 999px pill) | existing filter state; **live counts are new** | — | fields 🟢 · counts 🟡 |
| **Filter drawer** | **Does not exist** | `FilterDrawer.tsx`, or inline near `StorefrontView` (matches how `CartDrawer`/`AccountDrawer` already live inline) | `.storefront-shell .shop-filter-drawer` | same filter state, relocated | focus-trap/`inert`/`Escape`/backdrop is all new; study `CartDrawer` (`:4219`) as precedent — **do not edit it** | 🟡 |
| **Sort** | **Confirmed:** native `<select>`, `.shop-sort`, `App.tsx:2870-2872` | No | `.storefront-shell .shop-sort` | `sort` param; `StorefrontSort` (`types.ts`) | the existing option set — do not add options | 🟢 |
| **Result count** | `.shop-toolbar-count`, `App.tsx:2861` | No — add `aria-live="polite"` | `.storefront-shell .shop-toolbar-count` | `visibleProducts.length` (`:2692-2696`) | — (purely additive attribute) | 🟢 |
| **Listing row (desktop)** | `product-grid` cards, `App.tsx:3045-3107` | Yes — `ProductListingTable.tsx` or inline in `StorefrontView` (`:2665`) | **new** `.storefront-shell .shop-listing-*`; existing `.product-grid`/`.product-card` rules left untouched | `storefront.products` | the whole fetch/filter/sort pipeline (`:1240-1266`) — only rendering changes | 🟡 |
| **Mobile row-card** | same source; note a **grid/list toggle already exists** (`viewMode`, `:2687`; buttons `:2881-2890`; CSS `.product-grid--list`, `styles.css:3627+`) | Same file, conditional branch | `.storefront-shell .shop-rowcard-*` | same | same | 🟡 |
| **Price block** | inline in card/detail | No | `.storefront-shell .shop-price` | `product.price_cents` via existing `currencyFromCents` (`shared/formatters.ts`) — **reuse, don't rewrite** | the formatter's rounding/currency logic | 🟢 |
| **Stock indicator** | rendered today (exact class unconfirmed) | No | `.storefront-shell .shop-stock` | `stock_quantity`, `low_stock_threshold` | — | 🟢 |
| **Badge** | `product.badge` rendered in card | No | `.storefront-shell .shop-badge` | `product.badge` | must not imply a promotion link (7/8 match none) | 🟢 |
| **Spec table** | **Does not exist** — `ProductDetailView` shows prose | Sub-component, inline or `SpecTable.tsx` | `.storefront-shell .shop-spec-*` | existing `product` fields only; the "not in schema yet" row is static copy | — | 🟡 |
| **Missing-image panel** | no explanatory treatment today | `MissingImagePanel.tsx` (shared listing + detail) | `.storefront-shell .shop-missing-image` | `product.image_url === ""` | — | 🟡 |
| **Product detail** | `ProductDetailView`, `App.tsx:3155-3333` | No — restructure in place | `.storefront-shell .shop-detail-*`; CSS section `styles.css:3712-3870` already isolated | `fetchProductDetail` (`:3175`) | loading/not-found/error state machine (`:3157`, `:3213-3230`); 404 mapping (`:3183`) | 🟡 |
| **Add to Cart** | `addToCart`, `App.tsx:1596`; label `shop.product.add` (`i18n/translations.ts:389`) | No | `.storefront-shell .shop-add-to-cart` — **not** `.solid-button` | n/a | the call **and** all three locale strings — zero changes, restyle only | 🟢 |
| **Pagination** | **Does not exist** | `Pagination.tsx`, conditional render | `.storefront-shell .shop-pagination` | **undecided:** client-side slice vs. new `page`/`pageSize` params | — | 🔴 |
| **Empty state** | **Does not exist** (`existing-baseline.md` defect #2) | `EmptyResults.tsx`, rendered when `visibleProducts.length === 0` | `.storefront-shell .shop-empty-state` | result length + `searchTerm`/`selectedCategory` for the copy variant | — | 🟡 |
| **Error state** | not separable from fallback today (`http.ts:310-326` folds all failures) | `ErrorState.tsx` | `.storefront-shell .shop-error-state` | `ApiError` | the no-throw contract must survive any change | 🟡 |
| **Offline banner** | fallback renders silently; **banner absent** (`existing-baseline.md` §6 defect #3) | `OfflineBanner.tsx` at top of shell | `.storefront-shell .shop-offline-banner` | `isFallback` flag **already returned today** (`http.ts:324`) — just never read | read the flag; **do not modify** the fetch chain | 🟢 |
| **Loading skeleton** | **Does not exist** in storefront | `ListingSkeleton` / `DetailSkeleton` | `.storefront-shell .shop-skeleton` | n/a | — | 🟡 |

---

## Build order

Independent, no open questions — **do these first**:

1. **Offline banner** — the `isFallback` data already exists; highest value per unit effort.
2. **Empty state** — same profile; closes a confirmed live-app gap.
3. **Missing-image panel** — small, reusable, affects 100% of real products.
4. **Loading skeleton** — small, self-contained.
5. **Spec table** — contained inside `ProductDetailView`.

Then the large change:

6. **Listing table + mobile row-card** — the one real markup restructure. The existing
   grid/list toggle (`viewMode`, `App.tsx:2687`) is a useful hook: the dense table can
   become the "list" mode's new form rather than a wholly new affordance.
7. **Filter drawer** — budget real time for focus management.

Blocked:

8. **Pagination** — do not start until the client-vs-server decision (`SYSTEM.md` §12.2)
   is made; it determines whether `fetchStorefront`'s contract changes.

---

## Notes

**Extraction is optional.** Rows saying "no new file" refer to CSS, not to `App.tsx`
organisation. Whether to lift `ShopHeader`/`StorefrontView`/`ProductDetailView` out of the
5,375-line `App.tsx` into `modules/storefront/components/` is a separate Step 5 call — this
system neither requires nor forbids it. That directory currently holds only `api/` and
`types.ts` (verified), so adding `components/` is additive either way.

**No backend change is proposed anywhere above.** All three open questions (facet counts,
pagination source, error-vs-fallback) have viable client-side answers; a backend change is
one possible resolution, not a requirement, and is out of scope per the workflow's hard
rules.

**Never touched by any row above:** `backend/**`, `deploy/**`, `.github/workflows/**`,
`docker-compose.yml`, `Makefile`, `ekoway-landing/**`, admin components and the
`/* OPT operations console */` CSS section (`styles.css:3871+`), `CartDrawer`/
`AccountDrawer`/checkout logic (`App.tsx:3381`, `:4219` — read as precedent only), the
global `.product-image-upload`/`.product-thumbnail` rules used by admin, and the core
fetch/fallback logic in `shared/api/http.ts` (read for `isFallback` only).
