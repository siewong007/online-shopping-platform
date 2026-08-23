# Icon Guide — Step 4

All icons in `design/assets/icons/` are hand-authored, inline-SVG-compatible, stroke-based
line icons. Shared visual system:

- **viewBox:** `0 0 20 20` for all 11 UI icons; the two missing-image panels use a larger
  canvas (`0 0 120 120` square, `0 0 160 120` for the 4:3 category variant) since they're
  illustrative panels, not inline UI glyphs.
- **Stroke:** `currentColor`, `stroke-width="1.5"`, round caps/joins throughout — one
  weight, no mixed-weight icons.
- **Fill:** `none` except small solid accents (the two filter-chip dots in
  `icon-filter.svg`, the warning-triangle dot in `icon-warning.svg`) — also `currentColor`,
  never a hardcoded hex, so every icon recolors correctly by inheriting CSS `color` from
  its parent (a `--sf-ink`, `--sf-ink-muted`, or `--sf-error` context, per `SYSTEM.md` §2).
- **No raster embedding**, no `<image>`, no `xlink:href`, no CSS `url()`, no `@import` — the
  only `http://` string present in any file is the mandatory
  `xmlns="http://www.w3.org/2000/svg"` namespace declaration, which is not a network
  reference (verified by direct inspection of every file, not asserted).
- **No icon font** anywhere in this set.

## Icon table

| File | Purpose | Default rendered size | Decorative or informative | Accessible label requirement |
|---|---|---|---|---|
| `icon-search.svg` | Search field affordance | 20px (16px min legible) | Decorative | Parent `<input>`/`<button>` carries the real label ("Search"); icon stays `aria-hidden` |
| `icon-filter.svg` | Filter drawer trigger | 20px | Decorative | Parent button: `aria-label="Filters"` (or visible text, per `SYSTEM.md` §6 — the filter trigger must have an explicit label, not icon-only) |
| `icon-sort.svg` | Sort control visual label | 20px | Decorative | Sort is a native `<select>` with its own `<label>` (`SYSTEM.md` §6) — icon is a purely visual accent next to it, never the only cue |
| `icon-grid.svg` | Density toggle — grid mode | 20px | Informative (indicates current state) | Parent toggle button: `aria-label="Grid view"`, `aria-pressed` reflecting `viewMode === "grid"` |
| `icon-list.svg` | Density toggle — list mode | 20px | Informative | Parent toggle button: `aria-label="List view"`, `aria-pressed` reflecting `viewMode === "list"` |
| `icon-close.svg` | Drawer / modal dismiss | 20px (16px in compact contexts) | Decorative | Parent button: `aria-label="Close"` |
| `icon-chevron.svg` | Breadcrumb separator / expand affordance | 16px | Decorative | If used as an expand/collapse control, parent carries `aria-expanded`; as a breadcrumb separator it is purely decorative, `aria-hidden` |
| `icon-check.svg` | In-stock / confirmation signal | 16px | **Decorative — never the sole signal.** Per `SYSTEM.md` §6 "colour is never the only signal," this icon must always sit beside the real text label ("In stock — N avail."), never replace it | Adjacent text carries the meaning; icon is `aria-hidden` |
| `icon-warning.svg` | Low-stock signal / offline-banner marker | 16–20px | Decorative, same rule as above — always paired with text | Adjacent text (`SYSTEM.md` §9 copy) carries the meaning |
| `icon-image-unavailable.svg` | Compact reuse of the missing-image concept at icon scale (e.g. a small thumbnail context) | 16–20px | Decorative | The panel/caption text ("No product photo on file yet…") is the actual accessible content; icon is `aria-hidden` |
| `icon-clear.svg` | "Clear all filters" action | 16px, paired with visible text | Decorative | Button carries visible text ("Clear all") per existing app pattern — icon never stands alone here |

## Missing-image panels (larger illustrative treatment, not inline UI icons)

| File | ViewBox | Purpose |
|---|---|---|
| `product-image-unavailable.svg` | `0 0 120 120` (1:1) | The default rendering for all 8 real products today (`PRODUCT-IMAGE-STATUS.md`) — corner tick marks (industrial "spec sheet" motif matching Direction A) framing a simple crossed-out photo glyph |
| `category-image-unavailable.svg` | `0 0 160 120` (4:3) | Fallback for a category tile if that category's image (`CATEGORY-IMAGE-PROMPTS.md`) hasn't been generated/approved yet — same visual language, wider frame |

Both are `role="presentation" aria-hidden="true" focusable="false"` by default, matching
`SYSTEM.md` §6's rule: the adjacent copy ("No product photo on file yet for this item.")
already states the fact in words, so the graphic doesn't need a second, redundant
announcement. If a future use genuinely needs the graphic to carry meaning on its own
(no adjacent text), remove `aria-hidden` and add a `<title>` element with real descriptive
text at that call site — do not edit the shared file to do it, override at the point of
use.

## Usage pattern (for Step 5, not implemented here)

```html
<span class="storefront-shell shop-icon" aria-hidden="true">
  <!-- inline SVG contents from the file, or an <img src="..." alt=""> reference -->
</span>
```

Recolor via CSS `color`, never by editing the SVG's `currentColor` occurrences:

```css
.storefront-shell .shop-stock-badge--low .shop-icon { color: var(--sf-low-stock); }
```

## Legibility check

All 11 UI icons use strokes ≥1.5 units on a 20-unit canvas (7.5% of canvas height),
comparable to established icon-set conventions (e.g. Feather/Lucide's 1.5–2px-at-24px
ratio) — legible at both 16px and 20px rendered size without redrawing. No icon in this
set uses fine detail (hairline strokes, small enclosed shapes) that would disappear at
16px; verified by inspecting each file's minimum feature size against its viewBox.
