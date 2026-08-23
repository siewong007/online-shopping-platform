# Direction A vs. Direction B — Factual Comparison

Step 2A deliverable. This document is a **factual side-by-side description**, not a
recommendation. It does not declare a winner, does not score either direction
numerically, and does not label either one "recommended." Both prototypes are static,
throwaway HTML/CSS/JS living under `design/direction-a/` and `design/direction-b/`; open
either `index.html` to inspect the claims below directly. Both use the same
hand-transcribed copy of the real `catalogue.json` snapshot (see each direction's
`data.js` header comment for provenance).

| Dimension | Direction A — "Trade Counter" | Direction B — "Guided Project" |
|---|---|---|
| **Hardware-retailer credibility** | Dark steel/charcoal palette, real 1px borders, monospace numerals, sharp corners; reads like a parts catalogue or pro ordering portal. No lifestyle imagery, no soft cards. | Warm sand background, saturated flat category colors, serif headings, pill-shaped controls; reads like a home-improvement guide/showroom. No pastel tones, no soft-shadow cards; still avoids the "SaaS landing page" look via solid borders and non-pastel color blocks. |
| **Distinctiveness** | IA is a dense data table + facet sidebar, structurally close to a B2B/inventory tool — distinct from typical consumer e-commerce templates. | IA is a task-first home page (asymmetric project tile grid) with progressive category narrowing — distinct from a standard product-grid homepage. The two directions differ in structure/interaction, not just in color/typeface. |
| **Desktop effectiveness** | High scan speed: one screen shows all 8 SKUs with price/stock/category/badge in aligned columns; sortable-looking sticky header; facet counts visible at all times. | Lower per-screen product density by design; desktop shows large task tiles first, then a 3-column card grid per task/category (currently ≤1 card given the real catalogue's 1-product-per-category shape). Strong narrative framing costs screen space. |
| **Mobile effectiveness** | Table collapses to stacked "row cards" retaining all columns as labeled rows; facets move into a left-sliding drawer. No information dropped, but more taps to reach facet controls. | Task tiles stack to 1–2 columns; primary mobile nav is a full-screen task launcher, not a drawer. Product/task narrative content reflows to single column cleanly. |
| **Product-finding by search** | Header search box filters client-side across name/description/tone; results render in the same dense table. Verified: "hammer" → real 0-match empty state with monospace `RESULT_COUNT = 0` marker and filter-reset chips. | Same underlying client-side search (name/description/tone) framed as "or search directly" next to the task tiles; results render in the card grid. Verified: "hammer" → real 0-match empty state with narrative copy and 4 suggested project tiles + "see everything." |
| **Product-finding by category/project** | Department chip bar (mirrors the real app's existing `dept-chip-bar` pattern) plus a left facet sidebar with live per-option counts computed from the current search term. | 7 hand-authored "project" tiles (e.g. "Fix a leak or refresh a bathroom," "Build a deck or patio") each mapped to one or more real `category_slug` values, plus a secondary department chip row for direct category access without going through a task. |
| **Long-name resilience (39-char BEHR name)** | Renders in full within the table's `cell-name` column and the detail `h1`; verified in-browser at 1440px, 390px, and 320px with no truncation or clipping. | Renders in full within the card name line and the detail hero `h1` (hero caps heading width at 80% of the panel on desktop, full width on mobile); verified in-browser at the same three widths with no truncation. |
| **Price resilience ($649.00 tie, $27.98 low, $42.98 mid)** | Prices shown in a dedicated monospace column/large detail figure; the two $649.00 SKUs (Milwaukee, Pavestone) render identically and independently — no shared/deduplicated "highest price" logic exists to break. | Prices shown as a bold figure on each card face and in the sticky fact panel; same two $649.00 SKUs render independently with no tie-break logic needed. |
| **Missing-image treatment (100% of real products)** | Repeating diagonal-stripe panel with "NO IMAGE ON FILE" and "SKU-000N" tags — treated as a deliberate, labeled default, not an error state. | Full-bleed saturated category-color block with a 2-letter brand-tone monogram and a "no photo yet" pill — also a deliberate, labeled default; more visually prominent since it stands in for a hero image rather than a thumbnail. |
| **Stock-state clarity** | Color-coded, monospace stock label inline in every row/card/detail (`In stock — N avail.` / `Low stock — N left` / `Out of stock`); low-stock threshold shown numerically in the detail spec table. | Color-coded stock label on every card/detail fact row with slightly more conversational phrasing (`Low stock — only N left`); low-stock threshold shown as its own fact-panel row. |
| **Accessibility considerations** | `skip-link` to `#main`; semantic `<table>` for listing (real `<th>`/`<td>` structure, screen-reader-parseable rows/columns); radio-button facets with associated `<label for>`; visible focus outline on search input. Dark-on-light contrast for body text is high (near-white on near-black); accent orange on dark surfaces meets contrast for large text/buttons but was not run through a formal contrast-ratio tool in this session. | `skip-link` to `#main`; heading hierarchy (`h1`/`h2`) used for narrative structure; task tiles are real `<button>` elements (keyboard-operable); sticky fact panel could create a fixed-position focus-order surprise for screen-reader users on long detail pages — not resolved in this prototype. Green-on-cream and white-on-green combinations were not run through a formal contrast-ratio tool in this session. |
| **Compatibility with existing app architecture** | Department chip bar concept maps closely onto the current `dept-chip-bar` (`App.tsx:1086-1097`) — low-risk restyle. Dense table and faceted sidebar-with-counts are new markup/logic not present in `StorefrontView` today. | No existing equivalent to the task-tile taxonomy anywhere in `App.tsx` or the API schema — `catalogue.json` has no task/job field, so the `TASKS` mapping in `interactions.js` is invented UI-layer logic with no backend counterpart yet. |
| **Likely implementation complexity** | Medium: mostly new CSS + a moderate JSX restructuring of `StorefrontView`'s product grid into a table/row-card hybrid, plus new (but conceptually simple) facet-count logic. | Medium-high: requires deciding where the task→category mapping lives (frontend config vs. new backend field) in addition to new CSS and a two-column sticky-panel detail layout — more net-new decisions, not just net-new styling. |
| **Shared-CSS risk** | Uses an `a-`-prefixed class namespace throughout specifically to avoid any collision with `frontend/src/styles.css`'s bare/shared selectors (`.solid-button`, `.eyebrow`, `.status-pill`, `.app-shell`, etc., per `design/audit/existing-baseline.md` §9). A real port must still write new storefront-scoped classes rather than reusing these prototype styles verbatim. | Same approach with a `b-` prefix and the same shared-CSS risk noted in `existing-baseline.md` §9 — neither direction's CSS should be merged into `styles.css` as-is. |

## Shared facts (true of both directions equally)

- Both embed the same real catalogue data in a static `data.js` (categories, products,
  promotions, services, `pro_stats`), transcribed from the root `catalogue.json` snapshot
  taken 2026-07-31 — not fetched at runtime, no network calls, no build step.
- Both surface the empty-results state with a real, zero-match search term ("hammer") —
  something the live app does not do today (`existing-baseline.md` defect #2).
- Both leave the catalogue's real "Online Shopping" branding bug (in the `all` category
  teaser and the "Fast Free Delivery" promotion copy) visible rather than silently
  correcting it, and both flag it inline as a known content issue.
- Both show the real "Top Rated" badge / zero-review contradiction on BEHR paint (id 3)
  honestly, with an explicit note, rather than hiding it.
- Both include a dedicated `#/states` ("Hard States Demo") page that explicitly labels
  the two states with no real-data equivalent today — out-of-stock and offline/fallback —
  as **SIMULATED**, distinct from the four states demonstrated with real, unmodified
  catalogue data (empty search, missing image, low stock, and the badge/rating
  contradiction).
- Neither direction modifies `catalogue.json`, `frontend/src/App.tsx`,
  `frontend/src/styles.css`, or any other existing implementation file.
- Neither was tested with a formal automated accessibility audit (e.g. axe) in this
  session — contrast and focus-order notes above are visual/manual observations only.
