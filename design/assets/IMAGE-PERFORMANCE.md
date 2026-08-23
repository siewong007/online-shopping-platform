# Image Performance Rules — Step 4

Rules for Step 5 to implement. **Nothing here is implemented yet** — no `frontend/**` file
was touched to produce this document.

---

## Output formats

| Asset type | Format | Why |
|---|---|---|
| Product photos (once unblocked) | WebP, JPEG fallback if browser support requires it | WebP is smaller than JPEG at equal quality; the project has no existing `<picture>`/fallback pattern (`ASSET-AUDIT.md` §7), so Step 5 must decide whether a JPEG fallback is worth the added markup or whether WebP-only is acceptable given current browser support |
| Category imagery | WebP | Same reasoning; no transparency needed |
| Hero imagery | WebP | Same |
| Missing-image panels, UI icons | Inline SVG | Already resolution-independent, already near-zero weight (§ below), no raster format needed at all |
| Logo (once re-exported per `ASSET-MATRIX.md` BRAND-01/02) | PNG (transparency) for raster use, SVG for scalable use | The current JPEG has no transparency and can't sit on a dark structural zone (`ASSET-AUDIT.md` §1) |

## Dimensions and file-size ceilings

| Asset | Min dimensions | Target max size | Source |
|---|---|---|---|
| Product photo (once unblocked) | 1200×1200 | 200 KB | `ASSET-MATRIX.md` §1 |
| Category image | 1200×900 | 180 KB | `ASSET-MATRIX.md` §2 |
| Hero image | 1920×1080 | 250 KB | `ASSET-MATRIX.md` §3 |
| Missing-image panel (SVG) | n/a (vector) | ~1–2 KB | already met — both files in `design/assets/icons/` are under 1 KB each |
| UI icon (SVG) | n/a (vector) | <1 KB | already met — see §9 verification below |

These are ceilings, not targets to hit exactly — smaller is always acceptable; exceeding
the ceiling blocks shipping that asset until re-compressed.

## Responsive `srcset` expectations

The project currently has **zero** `srcset`/`<picture>` usage anywhere in `frontend/src`
(`ASSET-AUDIT.md` §7) — every image today is a single fixed-URL `<img>`. This is new
groundwork, not a change to an existing pattern:

- Product/category images: generate (or request from the source) at minimum two widths —
  the full target size (1200-wide) and a ~600px variant for the mobile row-card/listing
  context, wired via `srcset="{url-600} 600w, {url-1200} 1200w"` with a `sizes` attribute
  matching the actual rendered column width at each breakpoint (§5 of `SYSTEM.md`).
- Hero images: two widths — 1920 (desktop) and a narrower crop matching the mobile focal
  point guidance in `HERO-IMAGE-PROMPTS.md` (not just a scaled-down 1920 image — a
  genuinely re-cropped mobile asset, since the desktop 16:9 frame and the mobile crop keep
  different amounts of the scene per the focal-point rule).
- SVGs (icons, missing-image panels) never need `srcset` — they're already resolution-
  independent.

## Reserved aspect-ratio boxes

Every image-bearing box reserves its final size via CSS `aspect-ratio` **before** the
image loads — product tiles at `1:1`, category tiles at `4:3`, hero at `16:9` (desktop) /
its mobile crop ratio (narrow). This applies identically whether the eventual content is a
real photo or a missing-image panel, so nothing shifts when data resolves either way
(`SYSTEM.md` §7, §11 criterion 10).

## Lazy-loading rules

- **Below-the-fold images** (listing rows beyond the first viewport, category tiles below
  the first row, any product-detail image reached by scrolling) — `loading="lazy"`.
- **The primary visible image on any view loads eagerly** (`loading="eager"`, or simply
  omit the `loading` attribute, which defaults to eager): the hero image, and the first
  product-detail image on a direct product-detail page load. Do not lazy-load content
  that's already in the first viewport — that only delays what the user is already looking
  at.
- **Correction to a real, existing gap:** the storefront's own product-visual `<img>` tags
  (`App.tsx:3066`, `:3245`, cart line `:4489`) currently have **no** `loading` attribute at
  all — confirmed in `ASSET-AUDIT.md` §7. Step 5 should add `loading="lazy"` to every
  listing-row image below the first few rows, and leave the first-viewport ones eager,
  rather than leaving all of them unmanaged as today.

## Width/height attributes

Every `<img>` carries explicit `width`/`height` (or the `aspect-ratio` CSS box, §
above, at minimum) so the browser reserves layout space before the image downloads —
required even for lazy-loaded images, since a late-arriving lazy image without a reserved
box still causes shift when it finally loads into view.

## Crop rules

- Product photos: centred, subject fills ~80–90% of the frame, consistent margin on all
  sides so a grid of product tiles aligns visually (once unblocked — no product photo
  exists yet to crop).
- Category images: per `CATEGORY-IMAGE-PROMPTS.md`'s shared scaffold — subject in the
  lower-left two-thirds, negative space upper-right, so a UI label can overlay that corner
  without a second crop pass.
- Hero: per `HERO-IMAGE-PROMPTS.md`'s focal-point rule — off-centre subject that survives
  an independent desktop (16:9) and mobile (narrower) crop from the same source.

## `object-position` guidance

- Product/category tiles: `object-position: center` (subject is already centred at the
  source per the crop rule above).
- Hero: `object-position` follows the focal point documented per image at the time it's
  produced (e.g. `left center` or `right center` depending on which side the subject was
  offset to) — not a single fixed value for both hero concepts, since Concept 1 and
  Concept 2 may end up with different focal offsets.

## Fallback behaviour

- **Missing/blocked product images** (all 8 today): render `MissingImagePanel` +
  `product-image-unavailable.svg` + the `SYSTEM.md` §9 copy — this is not a fallback for a
  failed load, it's the correct state for `image_url === ""` (`SYSTEM.md` §6).
- **A real image URL that fails to load** (broken link, not empty string — does not occur
  in the real data today per `catalogue-hard-cases.md`, but must be handled defensively):
  falls back to the same missing-image panel via the `<img>` element's `onError` handler,
  never a broken-image browser icon.
- **Category images not yet generated/approved:** `category-image-unavailable.svg` (§7 of
  this step) renders in place of the tile image — this is why that file exists as a
  distinct asset from the product panel.

## Compression verification

Before any raster asset ships: confirm actual output file size against the ceiling in this
document (not the source/export size) using the same tool that produced it, or a
standalone check (e.g. `cwebp -q` output size, or the generation tool's own reported
size). No raster asset exists yet in this repository to verify — see §9 (below) for what
*was* verified this step (the SVGs only).

## No-layout-shift requirement

Restates `SYSTEM.md` §7 for this document's scope: the combination of reserved
aspect-ratio boxes + explicit width/height + a same-size missing-image fallback means a
Cumulative-Layout-Shift check (manual reload-and-watch, or Lighthouse if available) should
show zero shift attributable to any image in this system, real or placeholder — this is a
Step 6 acceptance check (`SYSTEM.md` §11, criterion 10), not verified here since no raster
image or live page exists yet to measure.
