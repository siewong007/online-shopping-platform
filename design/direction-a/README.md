# Direction A — "Trade Counter"

Static design prototype for Step 2A of the storefront redesign. Not production code —
plain HTML/CSS/vanilla JS, zero build step, zero dependencies. Open `index.html` directly
(double-click, or serve the `design/` folder with any static file server).

## Thesis

A dense, spec-forward, comparison-friendly storefront for a customer who **already knows
what they need**: a specific SKU, brand, or model, and wants to compare price/stock/spec
quickly without wading through lifestyle copy. Think of a contractor pulling up the site
on a phone at the trade counter to check whether an item is in stock before driving over,
or a shopper comparing three SKUs side by side before checkout. The interaction model is
closer to a parts catalogue or a B2B ordering portal than a consumer lifestyle storefront.

## Intended customer

Repeat/pro-leaning customers, tradespeople, and price-conscious regulars who value speed
and clarity over inspiration. Not a first-time browser who needs to be told what a "deck
build" project involves — Direction B (Guided Project) serves that customer instead.

## Visual system

- **Palette:** near-black steel/charcoal neutrals (`--a-bg #14171a`, `--a-surface #1f252b`,
  `--a-border #3a424a`) with a single confident accent, Ekoway orange `#f96302`. This
  orange was not invented for this prototype — it is sampled from the real Ekoway logo
  mark (`frontend/public/ekoway/ekoway-logo.jpeg`, the roofline/circle-border orange) and
  matches the `--orange` token already defined in the live `frontend/src/styles.css`. So
  the accent reads as "Ekoway," not a generic dark-mode SaaS skin, and is consistent with
  the brand as it exists today rather than a departure from it.
- **Type:** system font stack for body/UI (no webfont dependency, works fully offline);
  a monospace stack (`ui-monospace`/Consolas/Menlo) for prices, SKU codes, stock counts,
  and facet counts — reinforcing the "spec sheet" feel and giving numbers consistent
  tabular alignment.
- **Corner radius:** 2px or 0 everywhere. No pill buttons, no soft cards.
- **Borders/elevation:** real 1px borders throughout (table rows, cards, panels, drawer).
  No box-shadow anywhere in the stylesheet — no floating cards, no soft elevation.

## Density strategy

The default listing view is a **dense data table** (`.a-table`) at desktop widths:
Product | Category | Price | Stock | Badge, one row per SKU, sortable-looking sticky
header, hover highlight, click-through to detail. This survives the catalogue's real
8-product / 1-per-category shape without looking sparse (a 4-per-screen card grid would
waste most of the viewport on an 8-item catalogue). A left-hand facet sidebar (category /
price band / stock) sits alongside the table rather than as a hidden dropdown, keeping
filters visible and stateful at all times on desktop.

## Mobile strategy

Below 900px, the data table becomes stacked "row cards" (`.a-rowcards`) that keep the
same name/price/stock/badge information but in a compact vertical layout instead of
columns — no information is dropped, just re-flowed. Facet controls move into a
left-sliding drawer (`.a-drawer`, triggered by a "☰ Departments" button) rather than an
inline sidebar, since there's no room for a persistent sidebar at phone widths. This is a
deliberately different mobile pattern from Direction B's full-screen takeover menu.

## Discovery method

Primarily **search and category chips**, not narrative browsing. The department bar
(`.a-deptbar`) mirrors the real `dept-chip-bar` pattern already in `App.tsx`/`ShopHeader`
today, just restyled. The "all departments" landing state shows a compact grid of the 8
real categories (name + one-line teaser, taken verbatim from `catalogue.json`) as a
secondary entry point, but the primary interaction is expected to be typing into search
or clicking a department chip, then scanning the dense table.

## Product-detail strategy

Two-column layout: a fixed-width media panel (diagonal-stripe placeholder + "NO IMAGE ON
FILE" / "SKU-000N" tags, since 100% of real products lack images) and a spec-table body
(`.a-spec-table`) listing Category / Availability / Merchandising badge / Rating /
Detailed spec sheet as literal key-value rows — deliberately shaped like a spec sheet, not
marketing copy. The description sentence from `catalogue.json` is included but is treated
as a footnote below the spec table, not the lead content.

## Hard-state treatment

- **Empty results** — reachable for real via typing "hammer" into search. Renders a
  `RESULT_COUNT = 0` monospace marker, an explicit explanation that this is expected for
  an 8-product catalogue, and three recovery actions (clear filters / try Tools / try
  "paint"). This does not exist in the live app today (confirmed gap, see
  `design/audit/existing-baseline.md` defect #2).
- **Missing image** — the default rendering for every product (all 8 real products have
  `image_url: ""`); the repeating-stripe + tag treatment is the *normal* state, not a
  fallback drawn only when something goes wrong.
- **Low stock** — real data (Glacier Bay Shaila Vanity Combo, qty 3 / threshold 5) renders
  an amber "Low stock — 3 left" label automatically wherever that product appears (row,
  card, detail spec table).
- **Out of stock** — no real product qualifies today. Shown only on the dedicated
  `#/states` ("Hard States Demo") page, visibly captioned **"SIMULATED — no real
  out-of-stock product exists yet"**, reusing SKU-0008's real name/price with only the
  stock label overridden for display.
- **Offline/fallback** — also only on `#/states`, captioned **"SIMULATED — mockup of the
  fallback-data path, not a captured live API outage"**, proposing a visible amber banner
  where the live storefront today shows none (see baseline audit §6, defect #3).
- The "Top Rated" badge / zero-review contradiction (product id 3, BEHR paint) is shown
  honestly with an inline warning note on its detail page rather than hidden or "fixed."
- The catalogue's "Online Shopping" mis-branding (category `all` teaser) is left verbatim
  in `data.js`, matching real data, per the audit's finding — not silently corrected.

## The one memorable differentiator

**The dense spec-table is the whole page**, not a component bolted onto a lifestyle
layout. Every screen — listing, detail, even the empty state — is built around treating
name/price/stock/spec as primary typography, not metadata under a hero image. If a human
reviewer remembers one thing about Direction A, it should be "it looked like I was
looking at inventory, not being sold a lifestyle."

## Implementation feasibility notes (porting into the existing plain-CSS app)

- **New storefront-scoped classes needed:** everything here uses an `a-` prefix
  specifically so it never collides with anything in `frontend/src/styles.css`. A real
  port would need equivalents scoped under something like `.shop-table-*`,
  `.shop-spec-*`, `.shop-facet-*` — following the existing `.shop-`/`.product-`/`.dept-`
  prefix conventions already used in `App.tsx`, per the baseline audit's naming risk list.
- **Genuinely low-risk to port:** the department chip bar concept maps almost directly
  onto the existing `dept-chip-bar` nav (`App.tsx:1086-1097`) — this is mostly a restyle,
  not a new pattern.
- **Higher-effort/riskier to port:** the desktop table view is a real structural change
  from the current `product-grid` card layout (`App.tsx:3045-3107`); it would need new
  markup, not just new CSS, and the responsive collapse to row-cards needs its own
  breakpoint logic mirrored in JSX. The left-hand facet sidebar with live counts
  (`renderFacets` here) doesn't exist in the current app at all — today's filters are a
  server round-tripped `fgroup` sidebar (`App.tsx:2977-2992`) without live per-option
  counts; adding counts would require either client-side recomputation or a new API
  shape.
- **Empty-state and offline-banner components are the cheapest, highest-value pieces to
  port immediately** regardless of which direction is chosen — both are real, documented
  gaps in the current app (`existing-baseline.md` defects #2 and #3) and neither depends
  on the rest of this direction's visual system.
- **Risk:** because `.solid-button`, `.eyebrow`, `.status-pill`, and other bare/shared
  classes in the current `styles.css` are used by admin and checkout too, none of this
  prototype's CSS should be merged wholesale — any real port needs new, clearly
  storefront-prefixed rules written from scratch referencing this prototype only as a
  visual/structural spec, not copy-pasted CSS.

## Known weaknesses / trade-offs (honest)

- The dense table reads as "utilitarian" rather than "confidence-inspiring" for a
  first-time or unsure shopper — someone who doesn't already know what a "9-Tool Combo
  Kit" is gets no help discovering *why* they might want one. There is no room in this
  layout for a "here's how to think about this project" narrative; that's Direction B's
  job, not this one.
- The dark palette, while brand-consistent, is a genuine departure from the light,
  bright, "helpful hardware store" feel of the current live site (see
  `design/audit/before/desktop/01-home-shell.png`) — this is a deliberate risk, not an
  oversight, and should be weighed against how much continuity matters to the brand.
- The monospace-for-numbers treatment, while good for scanning, slightly reduces
  legibility of long product names when they appear in the same row as prices (mitigated,
  but not eliminated, by keeping names in the sans stack and only numbers in mono).
- A pure data-table metaphor caps out quickly once the catalogue grows beyond ~1 product
  per category — with more products per category, the flat table would need real sorting/
  pagination, which is out of scope for this prototype and not yet built.
- The category grid on the "all departments" landing state is a secondary, almost
  vestigial entry point in this direction — it exists so the 8 categories are still
  browsable, but the design doesn't invest in making it inspiring, which is an intentional
  but real limitation.
