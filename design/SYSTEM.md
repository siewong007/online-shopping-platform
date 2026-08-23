# Ekoway Storefront Design System

Build reference for **Direction A — Trade Counter** (`design/DIRECTION-DECISION.md`),
light-first industrial palette. Specification only — Step 5 implements.

**Thesis, in one line:** dense, spec-forward, fast to compare, price and stock visible
early, contractor-credible without being homeowner-hostile.

**Source mapping lives in `design/SYSTEM-IMPLEMENTATION-MAP.md`** — this file says *what*
to build, that file says *where*. Open questions are isolated in §12.

**Baseline fact:** the live `styles.css` already has a `.storefront-shell` scope
(`:3196-3230`) with a light Ekoway theme, wired at `App.tsx:2424`, using Almarai
(`index.html:14-17`). This system formalizes and extends that; it does not start over.

---

## 1. Principles

1. **Dense but readable** — ≥8 products at 1440×900 (today's grid shows 4). Density from
   tighter rows and alignment, never smaller type.
2. **Facts before decoration** — name, price, stock, category are content, not captions.
3. **Price and stock are typographic elements** — tabular numerals, fixed position, colour-coded.
4. **Strong alignment** — visible column grid on desktop; identical field *order* when it
   stacks on mobile.
5. **Mobile is redesigned, not shrunk** — it gets its own information priority (§4).
6. **Accessibility is visible design** — focus rings, contrast and recovery copy are
   specified here, not left to implementation.
7. **Light Ekoway identity, industrial structure** — cream/white surfaces, charcoal ink,
   green acts, orange prices. Charcoal is a structural accent (nav, table headers, footer),
   never the dominant field.

**Anti-drift rules.** No serif type, no sand surfaces, no task/project taxonomy, no
full-bleed colour hero, no "Add to project list" (all Direction B). No soft floating cards,
no pastel, no centred gradient hero, no 4-per-screen grid (generic). **Corner radius is
0–2px and elevation is borders, not shadows** — see §8 for why this is a *change* to
existing code, not a description of it.

---

## 2. Colour tokens

All scoped to `.storefront-shell`. **E** = exact value already in `styles.css` (reuse).
**N** = new, must be added.

| Token | Value | | Source / note |
|---|---|:--:|---|
| `--sf-page` | `#f4f4f0` | E | `--page`, `:3198` |
| `--sf-surface` | `#ffffff` | E | `--surface`, `:3199` |
| `--sf-surface-subdued` | `#f7f6f1` | E | `--surface-soft`, `:3200` |
| `--sf-ink` | `#1a1712` | E | `--ink`, `:3202` |
| `--sf-ink-secondary` | `#4a463d` | N | between ink and muted; spec keys, sub-headings |
| `--sf-ink-muted` | `#6d685e` | E | `--muted`, `:3203` |
| `--sf-border` | `#e6e4db` | E | `--line`, `:3204` |
| `--sf-border-strong` | `#d8d5c9` | E | `--line-strong`, `:3205` |
| `--sf-green` | `#1d5a39` | E | `--green`, `:3209` — **primary action only** |
| `--sf-green-hover` | `#153f28` | E | `--green-deep`, `:3210` |
| `--sf-orange` | `#f96302` | E | `--orange`, `:3206` — **price/urgency only**, large text only |
| `--sf-orange-deep` | `#d35400` | E | `--orange-deep`, `:3207` |
| `--sf-in-stock` | `#12805c` | E | root `--success` — deliberately ≠ brand green, so "in stock" never reads as "buy" |
| `--sf-low-stock` | `#8a5a0d` | N | darkened `--warn` so it is text-safe at body size |
| `--sf-low-stock-fill` | `#b26f12` | E | `--warn`, `:3214` — fill only, not small text |
| `--sf-out-of-stock` | `#c0392b` | E | `--danger`, `:3215` |
| `--sf-warning` | `#8a5a0d` | N | alias of low-stock — one amber, not two |
| `--sf-error` | `#c0392b` | E | alias of out-of-stock — one red |
| `--sf-focus-ring` | `#3568d4` | E | matches app convention (`:4480`, `:4295`); **not** green/orange so focus ≠ status |
| `--sf-skeleton-base` | `#eceae2` | N | loading fill |
| `--sf-radius` | `2px` | N | the only radius in the system (§8 override note) |

No gradients, no decorative colour effects.

### Contrast (WCAG relative-luminance formula, hand-computed)

| Pair | Ratio | Verdict |
|---|---:|---|
| `--sf-ink` on `--sf-page` | 16.2:1 | AAA |
| `--sf-ink-secondary` on `--sf-page` | 8.5:1 | AAA |
| `--sf-ink-muted` on `--sf-page` | 5.0:1 | AA normal |
| white on `--sf-green` | 8.2:1 | AAA — button labels safe |
| `--sf-in-stock` on `--sf-surface` | 4.9:1 | AA normal |
| `--sf-low-stock` on `--sf-surface` | 5.9:1 | AA normal |
| `--sf-out-of-stock` on `--sf-surface` | 5.4:1 | AA normal |
| **white on `--sf-orange`** | **3.1:1** | **FAILS AA normal** — large text only |
| **`--sf-orange` on light surface** | **3.1:1** | **FAILS AA normal** — large text only |
| `--sf-orange-deep` on `--sf-surface` | 4.2:1 | Misses 4.5 — large/bold only |

**Hard rule — orange is never small text.** Permitted: the large detail price figure
(qualifies as WCAG large text). Forbidden: small orange labels, orange body copy, white
text on orange fill. For small emphasis use `--sf-ink` text with an orange dot, rule or
left-border instead. Verify the rendered price size clears 24px regular / 18.66px bold in
Step 5.

Hand-computed ≠ audited. Run an automated contrast check in Step 6.

---

## 3. Typography

**One family: Almarai.** Already loaded app-wide (`index.html:14-17`, weights
300/400/700/800) and already declared in `.storefront-shell` (`:3220-3223`). This
deliberately diverges from Direction A's prototype (system-sans + monospace numerals)
because Almarai's fallback chain already carries CJK faces for the live EN/BM/中文 toggle —
a Latin-only display font would break visually the moment a Chinese product name renders.
Industrial character comes from **weight 800**, not a second typeface. A different display
face would require a new font-loading decision (new request, CJK fallback story) — out of
scope; default is Almarai-only.

**Numerals:** `font-variant-numeric: tabular-nums lining-nums` on all prices, stock counts
and spec values. A CSS property, not a third font.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| Price — detail | 2rem (1.75rem mobile) | 800 | 1.1 | — |
| Price — listing row | 1.125rem | 700 | 1.2 | — |
| Product name — detail h1 | 1.5rem (1.3rem mobile) | 800 | 1.2 | — |
| Product name — listing row | 0.95rem | 700 | 1.35 | — |
| Section heading | 1.05rem | 800 | 1.25 | — |
| Eyebrow / category label | 0.72rem | 700 | 1.2 | 0.08em, caps |
| Body / description | 0.9rem | 400 | 1.5 | — |
| Table column header | 0.72rem | 700 | 1.2 | 0.06em, caps |
| Stock / badge label | 0.8rem | 700 | 1.2 | 0.02em |
| Spec key / value | 0.88rem | 700 / 400 | 1.4 | — |
| Footnote | 0.78rem | 400 | 1.4 | — |

Nothing drops below 0.72rem (11.5px) at any breakpoint, including 320px.

**Product-name wrapping.** Never truncate, never ellipsis. The real 39-char BEHR name
(`catalogue-hard-cases.md`) must wrap to a second line. Listing name cell:
`min-width: 0; overflow-wrap: break-word`. Row height is **not** fixed (§4) so a wrapped
name grows the row instead of clipping siblings.

**Price hierarchy.** Always the largest, boldest number on its surface. Cents always shown
(`$27.98`) — two real SKUs tie at `$649.00`, and truncation would hide real distinctions.

**Spec table.** Key: `--sf-ink-secondary`, 700, left. Value: `--sf-ink`, 400, tabular.
Divider: 1px `--sf-border`.

**Mobile.** Column headers are hidden when the table becomes row-cards (§5); the same
fields are re-labelled inline instead.

---

## 4. Spacing and density

**Base 4px.** Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

| Property | Value |
|---|---|
| Listing row height | auto, min 56px (must grow for wrapped names) |
| Row vertical padding | 12px |
| Mobile row-card padding | 16px |
| Desktop columns | 5 — Product · Category · Price · Stock · Badge (exactly the real fields) |
| Mobile row-card | 1 product, **all 5 fields kept**, stacked |
| Max content width | 1280px (reuses the live `.dept-chip-bar` rail, `:3267`) |
| Gutters | 24px @1440/1024 · 20px @768 · 16px @390 · 12px @320 |
| Minimum touch target | 44×44px (pad the hit area, not the visible pill) |

**Desktop density target: ≥8 products visible without scrolling at 1440×900.**

**Mobile first-viewport rule (the single most important density rule here).** At 390×844,
before any scroll, the user must see: (1) header + search, (2) a **single-row**
horizontally-scrollable category strip — not a grid, and (3) **≥2 product rows**. This
reverses the prototype, where the category grid consumed the entire first screen and the
result count only reached the bottom edge (`direction-a/screenshots/mobile-01-listing.png`).
The category *grid* becomes a scroll-to secondary section; the *chip strip* is what sits
above the fold.

---

## 5. Responsive structure

Breakpoints reuse those already in `styles.css` (760/860/1120 appear at `:1863, :1898, :3818`).

| | Desktop ≥1024 | Tablet 768–1023 | Mobile ≤767 | Narrow ≤390 |
|---|---|---|---|---|
| Listing | Table, 5 cols, sticky header | Table, condensed padding | **Stacked row-cards** | Same, 12px gutter |
| Filters | Sticky left sidebar | Sidebar, narrower | **Drawer** (explicit "Filters" button) | Drawer, full-width |
| Category nav | Full chip row | Scrollable chips | Scrollable chips, **one line** | Same |
| Product facts | Inline columns | Inline | Stacked labelled lines — **never** hidden behind tap/hover | Same |
| Toolbar controls | Inline | Inline | Wrap to 2nd line, never clip | Sort becomes `<select>`-only |
| Detail | 2-col: media + spec | 2-col, narrower | Single col: media → price/stock → spec → description | Same |

**Collapse triggers.** Table→row-cards and sidebar→drawer both fire at **≤767px, together**
— never independently, which would strand a desktop-width table beside a mobile drawer.
Toolbar wrapping is continuous (`flex-wrap`), not a breakpoint.

**200% zoom.** Verified equivalent (720×450) at 0px overflow. Rule: **no fixed pixel width
on any container holding product text** — `%`, `fr`, `minmax()` only. Zoom crosses the same
thresholds as narrow viewports; no zoom-specific rules.

---

## 6. Components

Every interactive element is a real `<button>/<a>/<input>/<select>` — no `<div onClick>`.
Every one gets a visible `:focus-visible` ring (`--sf-focus-ring`, 3px, 2px offset).

| Component | Anatomy | States | Responsive | Accessibility |
|---|---|---|---|---|
| **Header** | brand · search · account · cart(count) | default; cart empty/filled | search never collapses to an icon at any width | existing labels preserved; new focus rings |
| **Search** | `<label>` + input + submit | empty · typing · results · zero-results · cleared | unchanged priority all widths | real `<label for>`, not placeholder-only; results announced via one shared `aria-live="polite"` region |
| **Category nav** | reuses live `.dept-chip-bar` | default · active · hover · focus | single scrollable line ≤1023 | `<nav>` + `<button>` per chip (not tablist); `aria-current`; 44px hit area |
| **Filter controls** | fieldsets: Category, Price, Stock; radio/checkbox + label + live count | default · checked · hover · focus · zero-count (dimmed, **never hidden**) | sidebar → drawer at 767 | `<fieldset>/<legend>` per group; counts update in the shared live region |
| **Filter drawer** | trigger → off-canvas panel → backdrop → close | closed · open | mobile only | focus moves in on open, returns to trigger on close; `Escape` + backdrop close; background `inert`; scroll-locked |
| **Sort** | native `<select>`, 4 real `StorefrontSort` options | default · focus · selected | identical all widths | native semantics; visible label (may be compact, never `display:none`) |
| **Result count** | "8 results" / "1 result" / "0 results" | count · zero · loading (skeleton, not blank) | wraps in toolbar | **the** `aria-live="polite"` region — one region, shared with search + filters |
| **Listing row** | Product(name + brand + no-photo note) · Category · Price · Stock · Badge | default · hover(subdued bg) · focus · low-stock(amber rule) · out-of-stock(dimmed price) | → row-card ≤767 | real `<table>`/`<tr>`/`<td>`; **one tab stop per row**, not five |
| **Mobile row-card** | name → brand → price → stock → badge → no-photo note | as above | terminal form; 320px only tightens padding | one tab stop; 44px min height |
| **Price block** | formatted figure, tabular | normal · out-of-stock (dimmed, **never removed**) | size steps down on detail only | real text; large enough on detail to clear the orange contrast threshold (§2) |
| **Stock indicator** | dot/left-border + text label | in · low · out | identical content, position only changes | **colour is never the only signal** (WCAG 1.4.1) — text always present |
| **Badge** | small bordered label, ink text, neutral fill | present · absent (no placeholder) | unchanged | never orange fill; never styled as a link — 7 of 8 real badges match no promotion (`DIRECTION-DECISION.md` §3) |
| **Spec table** | key/value rows, 1px dividers | value present · genuinely absent (explicit sentence, §9) | stacks single-col; **never** horizontally scrollable | real `<table>` or `<dl>` |
| **Missing-image panel** | bounded panel + **full-sentence** copy (§9) | the default for all 8 real products | `aspect-ratio` reserved at every width | decorative (`aria-hidden`) — adjacent text already states it |
| **Product detail** | breadcrumb → h1 → price → stock → spec → description → CTA | loading · loaded · not-found · error | 2-col → 1-col | `<h1>` = product name; `<nav aria-label="Breadcrumb">` |
| **Add to Cart** | existing `addToCart`, existing label | enabled · disabled (out of stock — present, not removed) | full-width mobile | real `disabled` attribute; focus ring |
| **Pagination** | page control + "N–M of T" | first · middle · last · single-page (not rendered) | Prev/Next + "Page N of M" on mobile | `<nav aria-label="Pagination">`; `aria-current="page"` |
| **Empty state** | explanation + **concrete recovery actions** (§9) | from-search · from-filters | single col | announced in the shared live region |
| **Error state** | short explanation + retry | single state | identical | `role="alert"` (assertive) |
| **Offline banner** | top-of-shell notice + reload | shown only when `isFallback: true` | full width, above header content | `role="status"` (polite) |
| **Loading skeleton** | shape-matched blocks | during fetch only, no artificial minimum | matches each breakpoint's real shape | `aria-hidden`; region carries `aria-busy` |

---

## 7. Interaction rules

**Search/filter updates must fire on state change, never on route change.** This is the
correction for the confirmed prototype defect (`DIRECTION-DECISION.md` §4): Direction A's
router re-rendered only on `hashchange`, so acting from the already-current route did
nothing. **Do not reproduce `Router.go`.** The live app already does this correctly — a
debounced effect keyed on `[searchTerm, selectedCategory, minPriceCents, maxPriceCents,
sortOption]` (`App.tsx:1240-1266`, 300ms at `:1260`). Keep that shape. Any client-side
routing added for deep links must be *additive*, never a gate in front of it.

- **Filters** update results and facet counts in the same pass. No "Apply" button.
- **Query params** keep the existing shape exactly (`q`, `category`, `minPriceCents`,
  `maxPriceCents`, `sort`). Detail deep links `/shop/products/{id}` unchanged.
- **Clear all** resets search + category + price + stock in one action, then returns focus
  to the search field.
- **Tab order** follows DOM order; no `tabindex > 0`.
- **Focus movement:** into drawer on open, back to trigger on close; search submit keeps
  focus in the field (the live region announces the change); navigating to detail moves
  focus to the `<h1>`.
- **Loading:** skeleton→content is a plain swap, no fade. Show the skeleton only if the
  request exceeds ~150ms, so fast responses never flash.
- **No layout shift:** every image-bearing box reserves size via `aspect-ratio` before
  load — identical whether a real photo or the missing-image panel lands there.
- **Direct detail entry** must render fully standalone (already true —
  `ProductDetailView` fetches independently, `App.tsx:3175`).
- **Fallback:** do not touch the `fetchStorefront → fetchJsonResult → fallbackStorefront`
  no-throw chain. This system only *reads* the existing `isFallback` flag
  (`http.ts:324`) to show the banner.

---

## 8. CSS scoping architecture

**This section supersedes the Step 3 draft, which was wrong.** That draft said new classes
could simply extend the existing `.shop-*`/`.product-*`/`.dept-*` conventions. Verified
this step:

- **All 64** existing `.shop-*` (19), `.product-*` (40) and `.dept-*` (5) selectors are
  **global** — zero are nested under `.storefront-shell`. Their safety today rests on
  nobody reusing the names, not on any structural guarantee.
- **`.product-*` is already contaminated.** Admin's `CatalogPanel.tsx` uses
  `product-image-upload` and `product-thumbnail`, both defined globally
  (`styles.css:1532`, `:669`). A new global `.product-…` rule can reach admin.
- `CartDrawer`/`AccountDrawer` (checkout/account, `App.tsx:3381`, `:4219`) use **no**
  `shop-`/`product-`/`dept-` classes — those surfaces are clean today.

### Mandatory pattern

Every new or modified rule is **descendant-scoped**:

```css
.storefront-shell .shop-listing-row { … }
.storefront-shell .dept-chip { … }        /* override, not edit */
```

- **Never** add a new bare top-level selector.
- **Never** add new `.product-*` classes — that prefix is shared with admin. New listing
  and detail classes use `.shop-*` under the storefront scope.
- **Never** edit an existing global rule to change storefront appearance. To restyle
  existing markup, add `.storefront-shell .existing-class { … }` — specificity (0,2,0)
  beats (0,1,0), so the storefront changes and admin is untouched.
- **Never** reuse or override `.solid-button`, `.eyebrow`, `.status-pill`, `.app-shell`
  even inside the storefront scope (Step 2B corrections #11/#12). Storefront buttons are
  `.shop-*` from the start.
- Colours/spacing come from §2/§4 tokens, never hardcoded values in component rules.

### Thesis corrections this requires

The existing Shop section drifts from the Trade Counter thesis and must be overridden
(not edited) in the storefront scope:

| Existing | Thesis requires |
|---|---|
| 3× `border-radius: 999px` (pills: `.dept-chip`, `.preset`), plus 0.75rem/8px/7px/0.6rem/0.4rem — six different radii | one `--sf-radius: 2px` |
| 2× `box-shadow` + `--shadow: 0 12px 34px …` soft elevation | borders only; no shadow in the storefront |

### Where it lives, and how surfaces stay protected

New rules go inside the existing comment-delimited Shop section
(`styles.css:~3196-3870`), which ends immediately before `/* OPT operations console */`
at `:3871`. That boundary already exists and already works.

No `@layer` — the project has one plain stylesheet imported at `main.tsx:7` with no CSS
tooling; introducing layers is a build-architecture change outside this redesign's scope.
The descendant-scope rule above provides the isolation, and it does so structurally rather
than by convention.

Protection is by construction: nothing outside `.storefront-shell` is written or edited.
Step 6 still verifies empirically by opening admin, checkout, account and login and
diffing against `design/audit/before/`.

---

## 9. State copy

Final strings. Nothing here claims data the API doesn't provide.

| State | Copy |
|---|---|
| Zero results (search) | No products match "{query}." Try a different term, or browse by department below. |
| Zero results (filters) | No products match the current filters. **[Clear all filters]** to see everything, or try a different department. |
| Offline / fallback | Showing recently saved catalogue data — live prices and stock may be a little out of date. **[Reload]** |
| Loading failure | Something went wrong loading this page. **[Try again]** |
| Missing image | No product photo on file yet for this item. |
| Low stock | Low stock — {N} left |
| Out of stock | Out of stock — check back soon |
| No reviews | No reviews yet. |
| Filters cleared | Filters cleared. |

`{N}` is always the real `stock_quantity`, never a vague "almost gone". The offline copy
deliberately avoids "the API is down" — accurate, not alarming, one action.

**Zero-review rule (Step 2B correction #10).** One real product carries the badge "Top
Rated" with `avg_rating: null, review_count: 0` (`catalogue-hard-cases.md`). "No reviews
yet." must never appear beside filled stars, a numeric rating, or social-proof phrasing. A
zero-review product shows either no rating UI or that sentence alone. The badge renders as
plain merchandising text with no styling that implies a verified rating.

---

## 10. Implementation mapping

See **`design/SYSTEM-IMPLEMENTATION-MAP.md`** — component → current source → likely new
file → CSS scope → data source → protected behaviour → risk, plus a build order.

Headline: header/category nav are restyles; the listing table and mobile row-card are the
one large markup change; empty state, offline banner, skeleton and missing-image panel are
net-new and independent (build these first); cart handoff changes by zero lines.

---

## 11. Acceptance criteria (Step 5)

Verified in a real browser, the same way Steps 1–2B gathered evidence.

1. **≥8 products** visible without scrolling at 1440×900, unfiltered.
2. **390×844 first viewport** shows header + search + one-line category strip + **≥2
   product rows**, no scrolling.
3. **320px:** `scrollWidth - clientWidth === 0` on listing, detail, empty and error states.
4. **Focus:** every interactive element shows a `:focus-visible` ring. Zero such rules
   exist in the storefront scope today — this is a real regression check.
5. **Long name:** the 39-char BEHR name wraps to ≤2 lines, no clipping, at 1440/390/320.
6. **Price:** both real $649.00 SKUs render independently; layout tolerates ≥4 digits.
7. **Missing image:** all 8 products show the panel with the §9 sentence.
8. **Stock:** the real low-stock SKU shows amber + count; any demonstrated out-of-stock
   case is labelled simulated (no real one exists).
9. **Fallback:** with the backend stopped, the storefront renders **and** the offline
   banner appears — both halves.
10. **No layout shift** attributable to image/skeleton loading.
11. **Scoping:** `git diff` touches only `styles.css` inside the Shop section; every new
    rule matches `.storefront-shell …`; no new `.product-*` class; no edit to
    `.solid-button`/`.eyebrow`/`.status-pill`/`.app-shell`. Admin, checkout, account and
    login visually match `design/audit/before/`.
12. **Contrast:** every shipped pairing appears in §2 or is verified the same way; no
    orange small text.
13. **Preserved behaviour:** `addToCart`, the three "Add to Cart" locale strings, the
    query-param shape, and the no-throw fallback chain are provably unchanged in the diff.

---

## 12. Open questions and assumptions

Unresolved — decide in Step 5, do not let them block the independent components.

1. **Facet live counts** — compute client-side from the fetched result set, or add an API
   shape? Client-side is assumed; unverified against the backend. *(Blocks: filter counts
   only.)*
2. **Pagination data source** — client-side slicing vs. new `page`/`pageSize` params. Not
   needed for 8 products; changes `fetchStorefront`'s contract if server-side. **Do not
   start pagination until this is settled.**
3. **Error vs. fallback** — `fetchJsonResult` currently folds every failure into the
   fallback path (`http.ts:310-326`), so a genuine error is not distinguishable from an
   outage today. The error state (§6) needs that distinction; resolving it means touching
   the data layer, which this system has not authorised.
4. **Price contrast threshold** — the detail price must render ≥24px regular / ≥18.66px
   bold for `--sf-orange` to be AA-legal. Measure the rendered size; if it lands short, use
   `--sf-ink` for the figure and orange for a rule/dot only.
5. **Contrast is hand-computed**, not tool-audited. No axe/Lighthouse run has happened on
   either prototype or this system.
6. **Tablet table fit** — the 5-column table is asserted to fit at 768px with condensed
   padding; verify with the longest real name before committing to the ≤767 collapse point.
7. **Component extraction** — whether to lift `ShopHeader`/`StorefrontView`/
   `ProductDetailView` out of the 5,375-line `App.tsx` is a Step 5 refactoring call. This
   system neither requires nor forbids it.
