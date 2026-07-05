# Mobile View Styling Plan

Goal: every frontend page renders and is usable at phone widths (target 375px, verify
at 320–480px and tablet 768px). Styling stays in plain CSS (`frontend/src/styles.css`
and `frontend/src/modules/landing/landing.css`) — no Tailwind or CSS framework.

## Current state

- Viewport meta tag is already set in `frontend/index.html`.
- `styles.css` has two responsive breakpoints today — `max-width: 1120px` (grids → 2
  columns, header/topbar stack) and `max-width: 760px` (grids → 1 column, a few flex
  rows stack) — plus an account-section 760px block and a print block.
- `landing.css` has its own breakpoints (1080px / 720px) and is mostly covered already.
- `ManagementTable` already wraps tables in `.management-table-scroll` (horizontal
  scroll), and drawers (`.cart-drawer`, `.account-drawer`, `.record-modal-dialog`)
  use `min(Nrem, 100%)` widths, so they degrade acceptably.
- Nothing targets true phone widths (< 480px), the storefront `.mega-nav` has no
  responsive rule at all, and the admin sidebar just stacks as a tall block above
  the content at ≤ 1120px.

## Page inventory (what "every FE page" means)

Three views in `App.tsx` (`type View = "landing" | "store" | "admin"`):

1. **Landing** (`/`) — `modules/landing/LandingView.tsx` + `landing.css`.
2. **Storefront** (`/shop`) — top strip, site header + search, mega-nav, hero,
   promo rail, product/category/service grids, pro section, savings band, footer,
   cart drawer + checkout, account drawer (login / register / lookup / account view).
3. **Admin** (`/admin`) — login screen, topbar, sidebar nav, and 12 tabs:
   overview, inventory, fulfillment, campaigns, catalog, customers, orders,
   payments, sales, invoices, settings, permissions — plus shared
   `ManagementTable` and `RecordModal`.

## Approach

Keep the existing 1120px / 760px breakpoints; add one phone breakpoint at
**480px** for the cases the 760px rules don't fix. Prefer making base styles
intrinsically responsive (auto-fit grids, `min()`, `flex-wrap`) over piling on
media-query overrides.

### Phase 1 — Shared shell & primitives (blocks everything else)

- `.top-strip`, `.site-header`, `.search-shell`, `.mega-nav`: mega-nav currently has
  no responsive rule — make it a horizontally scrollable row
  (`overflow-x: auto`, `white-space: nowrap`, hidden scrollbar) at ≤ 760px.
- Touch targets: buttons/nav items ≥ 44px tall at ≤ 760px; bump base font/padding
  where cramped.
- `.record-modal-dialog` / `.record-modal-wide`: full-width, near-full-height sheet
  at ≤ 480px; ensure `.record-form-grid` is 1 column (already at 760px) and the
  modal body scrolls.
- `.management-table-shell`: verify scroll works at 375px; reduce cell padding at
  ≤ 480px so common tables need less scrolling.

### Phase 2 — Storefront (`/shop`)

- Hero, promo rail, product/category/service grids, savings band, pro section:
  already collapse at 760px — audit at 375px for overflow (long product names,
  `.hero-metrics`, images) and tighten padding/typography at ≤ 480px.
- Cart drawer + checkout: verify line rows, quantity steppers, and the checkout
  form at 375px; stack `.cart-line`-style rows if cramped.
- Account drawer: auth tabs, lookup/login/register forms, `.account-stat-grid`
  and order lists (some 760px rules exist) — fill gaps at ≤ 480px.

### Phase 3 — Landing (`/`)

- Audit only: `landing.css` already handles 1080/720px. Walk the page at 375px,
  fix any overflow (hours `<table>`, hero art, buttons) inside `landing.css`.

### Phase 4 — Admin console (`/admin`)

- Login screen: `.admin-login-panel` is already `min(28rem, 100%)` — verify only.
- **Sidebar nav (the big one)**: at ≤ 760px convert `.admin-sidebar`/`.admin-nav`
  from a stacked block of 12 full-width buttons into a compact horizontal
  scrollable tab strip (hide the `small` descriptions), so content isn't pushed
  a screen below the fold.
- `.admin-topbar`: already stacks at 1120px; tighten actions/user block at ≤ 480px.
- Per-tab pass, in two groups:
  - *Grid/panel tabs* (overview, inventory, fulfillment, campaigns, customers):
    mostly covered by the existing grid collapses — audit and patch stragglers
    (e.g. `.inventory-row`, `.fulfillment-grid` internals, metric cards).
  - *Table/detail tabs* (catalog, orders, payments, sales, invoices, settings,
    permissions): rely on Phase 1 table/modal work, then fix tab-specific pieces —
    `.sales-detail-grid` (fixed 4 columns, no mobile rule today) → 2 cols at 760px,
    1 col at 480px; `.payment-detail-grid`; invoice detail + print view (print block
    must stay untouched); `.settings-category-grid` (auto-fit `minmax(18rem, 1fr)`
    is tight at 320px → drop the min at ≤ 480px); `.permission-layout` matrix →
    horizontal scroll.

### Phase 5 — Verification

Per CLAUDE.md, exercise flows in the browser, not just type-check:

- `preview_start` web + api; `preview_resize` to mobile (375×812) and tablet
  (768×1024); walk all three views and all 12 admin tabs; screenshot key pages.
- Check landscape-narrow (~480px) for the drawers.
- `npm run build` must pass.

## Sequencing / PR shape

One branch (`feat/mobile-responsive-styling`) with commits per phase, or split
into two PRs (storefront+landing, admin) if review size matters. Phases 2–4 depend
on Phase 1; 2, 3, 4 are independent of each other. Almost all work is CSS-only;
the admin nav strip and mega-nav scroll may need small className/markup tweaks in
`App.tsx` — no logic changes.
