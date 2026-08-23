# Asset Audit — Step 4

Inventory of every existing image/icon/brand asset in the repository, checked against
`design/SYSTEM.md`'s light Trade Counter system. Read-only inspection — nothing listed
here was modified. Classification: **production-ready** · **usable after
optimisation/rework** · **unsuitable** · **blocked pending owner input** · **absent**.

---

## 1. Logo and brand mark

| Path | Dims | Format | Size | Classification |
|---|---|---|---|---|
| `frontend/public/ekoway/ekoway-logo.jpeg` | 225×225 | JPEG, RGB (no alpha) | 13.9 KB | **Usable after rework** |
| `frontend/public/ekoway/favicon.png` | 225×225 | PNG (RGB, no alpha despite `.png`) | 60.3 KB | **Usable after rework** |
| `frontend/public/favicon.ico` | 64×64 | ICO | 14.7 KB | Production-ready (favicon use only) |
| `ekoway-landing/ekoway/ekoway-logo.jpeg` | 225×225 | JPEG | 13.9 KB | Duplicate of the above, in the protected `ekoway-landing/` tree — not touched |

**Visual content (viewed directly):** circular badge, orange roofline-and-ring border,
dark-green "EKO" wordmark with a wrench replacing the O, "EKOWAY HARDWARE SDN BHD" and
"永光五金" beneath. This is the real source for `--sf-green`/`--sf-orange` in
`SYSTEM.md` §2 — confirmed by eye, not just by hex-matching the CSS.

**Why "usable after rework," not production-ready:** both files are flattened JPEG/RGB
with an opaque background baked in — no transparency. `SYSTEM.md` §1 permits dark
structural zones (nav, spec headers, footer); the current logo would show a visible white
square on any of those. **A transparent-background PNG or, ideally, a vector (SVG)
export of the existing mark is needed before it can sit on a dark surface.** This is a
request for the *existing* logo in a new format, not a redesign of the mark — out of
scope to fabricate here since it must match the real registered mark exactly (flagged as
owner input in the matrix, not generated).

**Currently used at:** `App.tsx:1000` (`EkowayMark`, storefront header), `App.tsx:38` in
`AdminLoginScreen.tsx` (protected surface — do not touch), `LandingView.tsx:471/497/944`
(landing page). Confirms the mark is already the single source of brand truth across the
app; the storefront redesign should keep referencing this same file, not a new one.

## 2. Category / landing imagery

| Path | Dims | Format | Size | Classification |
|---|---|---|---|---|
| `frontend/public/ekoway/slots/cat-power-tools.png` | 300×184 | PNG | 133.6 KB | Unsuitable at current res — style reference only |
| `frontend/public/ekoway/slots/cat-paints.png` | 300×184 | PNG | 119.9 KB | Same |
| `frontend/public/ekoway/slots/cat-building.png` | 300×184 | PNG | 137.1 KB | Same |
| `frontend/public/ekoway/slots/cat-bathroom.png` | 300×184 | PNG | 127.8 KB | Same |
| `frontend/public/ekoway/slots/cat-kitchen.png` | 300×184 | PNG | 106.6 KB | **Unsuitable — no matching real category** |
| `frontend/public/ekoway/slots/cat-electrical.png` | 300×184 | PNG | 125.8 KB | **Unsuitable — no matching real category** |
| `frontend/public/ekoway/slots/feat-power.png` | 706×480 | PNG | 682.9 KB | Unsuitable — oversized file for its own resolution, style reference only |
| `frontend/public/ekoway/img/paints.jpg` | 1521×1034 | JPEG | 422.3 KB | Usable after optimisation — see note |
| `frontend/public/ekoway/img/home-appliances.jpg` | 1521×1034 | JPEG | 432.4 KB | Usable after optimisation |
| `frontend/public/ekoway/img/bathroom-plumbing.jpg` | 1521×1034 | JPEG | 362.6 KB | Usable after optimisation |
| `frontend/public/ekoway/img/why-ekoway.jpg` | 971×1619 | JPEG | 378.6 KB | Unsuitable (portrait aspect, landing-only "about" content) |

**Visual content (`cat-power-tools.png` viewed directly):** a genuinely well-composed
flat-lay — cordless drill, angle grinder, extension cord, tape measure, drill bits, on a
neutral wood surface, even directional lighting, no people, no floating 3D. **This is
already close to the exact style `SYSTEM.md` §4 (category imagery) asks for** — it is
cited below as the style/lighting/ground reference for new category prompts. It is not
usable as a final asset only because of resolution (300×184 vs. the ≥1200×900 target) and
file format (PNG at that size, not the target WebP).

**Critical taxonomy mismatch.** These six slot images target `LandingView.tsx`'s own
hardcoded landing-page category list (`cat.01`–`cat.06`: Power Tools, Paint, Building
Materials, Bathroom, **Kitchen, Electrical**) — confirmed at `LandingView.tsx:59-64`. That
list does **not** match `catalogue.json`'s eight real categories (tools, lumber, paint,
appliances, garden, bath, building-materials, storage). Two existing images
(kitchen, electrical) have **no corresponding real category at all**, and three real
categories (garden, lumber, storage) have **no existing image whatsoever**. None of these
six files are referenced anywhere in the storefront (`/shop`) route — confirmed by grep;
every usage is inside `LandingView.tsx` only. **The storefront redesign cannot reuse this
set as-is; it needs its own eight images matched to the real taxonomy** (Asset Matrix, §2
below).

**`img/*.jpg` usability note:** these are real, on-brand lifestyle/category montage
photos (bathroom fixtures, a paint wall, kitchen appliances) at a usable landscape
resolution. They lean toward the "soft lifestyle-advertising treatment"
`SYSTEM.md`/this step explicitly rejects for the Trade Counter system (styled scenes
rather than neutral-ground factual objects), and — like the slot images — they don't map
1:1 onto the real category set (no lumber/tools/garden/storage equivalent exists). Judged
**not** production-ready for the storefront's category tiles without a style change; kept
as brand-tone reference only.

## 3. Store interior photography

| Path | Dims (store-01, representative) | Format | Size |
|---|---|---|---|
| `frontend/public/ekoway/store/store-01.jpg` … `store-10.jpg` (10 files) | 750×1000 (store-01) | JPEG | 297–406 KB each |

**Visual content (`store-01.jpg` viewed directly):** a real, busy shelf of hand tools and
hardware at the physical Salim store — genuine, factual, but visually dense (packed
pegboard, visible third-party retail packaging and brand names, e.g. Stanley-branded
blister packs, price-tag stickers). **Classification: unsuitable for category tiles**
(too busy, no negative space for cropping per this step's requirement) but **a plausible
candidate for hero concept 1** ("organised hardware trade counter," §5) if a calmer,
less cluttered frame exists among the ten — flagged for owner selection, not decided here,
since none of the ten was reviewed in full and some show third-party product packaging
prominently enough to warrant a quick check that the owner is comfortable featuring it in
new marketing use.

## 4. Hero video/poster

| Path | Dims | Format | Size | Classification |
|---|---|---|---|---|
| `frontend/public/ekoway/hero.mp4` | not measured (not an image) | MP4 | — | Landing-only, out of scope for this step (Step 4 covers imagery, not video) |
| `frontend/public/ekoway/hero-poster.jpg` | 320×180 | JPEG | 13.0 KB | **Unsuitable** — far below the 1920×1080 hero target and below the poster's own rendered size on the landing page |

## 5. Icons / UI iconography

**Absent.** No SVG icon set, no icon font, no `/icons` directory anywhere in
`frontend/public` or `frontend/src` prior to this step. Every existing UI affordance in
`App.tsx` (search, cart, chevrons, close buttons) is either a text label, a Unicode
glyph, or an emoji-style character (not verified line-by-line here; icons proper are new
work per §6/§7 of this step, not a gap in the audit).

## 6. Brand guidelines document

**Absent.** No brand-guideline file, style guide, or colour/type specification document
exists anywhere in the repository outside `design/SYSTEM.md` itself (searched for
`*brand*guide*`/`*style*guide*` repo-wide, zero matches outside `node_modules`/build
output). The logo file and the `.storefront-shell` CSS tokens (`styles.css:3196-3230`,
documented in `SYSTEM.md` §2) are the only authoritative source of Ekoway's colour
identity today.

## 7. Image-loading utilities and existing conventions

- **No lazy-loading on storefront product images today.** `loading="lazy"` is used
  throughout `LandingView.tsx` (6 occurrences) and twice elsewhere in `App.tsx`
  (`:3068`, `:4491`), but the storefront's own product-visual `<img>` tags
  (`App.tsx:3066`, `:3245`, cart line `:4489`) currently have **no** `loading` attribute.
  Flagged for `IMAGE-PERFORMANCE.md` (§8) as a real, pre-existing gap this redesign should
  close, not a new requirement being invented.
- **No `srcset`/`<picture>` usage anywhere in `frontend/src`.** Every image is a single
  fixed-URL `<img>`. The responsive `srcset` rules in `IMAGE-PERFORMANCE.md` are net-new
  guidance, not a change to an existing pattern.
- **Existing missing-image treatment is a decorative gradient, not the honest-copy panel
  this system requires.** `.product-visual.tone-fallback` (`styles.css:651-655`) renders a
  two-stop `radial-gradient`/`linear-gradient` dark panel with **no explanatory text at
  all** — it is exactly the kind of "decorative colour effect" `SYSTEM.md` §2 forbids, and
  it carries no copy, contradicting `SYSTEM.md` §9's missing-image sentence requirement.
  This is the concrete integration point for the new
  `design/assets/icons/product-image-unavailable.svg` (§6 of this step) — it replaces this
  gradient, it does not sit alongside it.
- **Naming convention observed:** existing paths use lowercase-hyphenated slugs under a
  `/ekoway/<category>/` tree (`img/`, `slots/`, `store/`). New filenames in the Asset
  Matrix follow the same lowercase-hyphenated convention for consistency, even though they
  live under `design/` rather than `frontend/public/` at this stage.
- **Admin already supports real product-image upload.** `CatalogPanel.tsx`
  (`:376, :382, :836-838`) has a working base64 image-upload field wired to
  `product.image_url`. This means once real product photography exists, no new upload
  mechanism needs to be built — directly relevant to `PRODUCT-IMAGE-STATUS.md` (§3): the
  blocker is photography, not tooling.
- **Fallback dataset already references external placeholder photos.** `data/fallback.ts`
  uses `picsum.photos` random-seed URLs for some demo products (e.g. `:62, :92, :122, :152`)
  and empty strings for others. Noted for completeness; `frontend/**` is protected and not
  changed by this step.

---

## Summary table

| Category | Production-ready | Usable after rework | Unsuitable | Blocked (owner input) | Absent |
|---|---|---|---|---|---|
| Logo/brand mark | favicon.ico (64×64 use only) | logo JPEG/PNG (needs transparent/vector export) | — | — | — |
| Category imagery | — | 4 of 6 slot images (style ref only, wrong res) | 2 of 6 slot images (kitchen/electrical — no real category), 4 `img/*.jpg` (wrong style/aspect for 2 real cats) | — | 4 of 8 real categories (garden, lumber, storage, and a true "tools" match) have zero existing image |
| Product photography | — | — | — | **all 8 real products** (§3 of this step) | — |
| Hero imagery | — | possibly 1 of 10 store photos (needs owner selection) | hero-poster.jpg (too small) | store photo selection + 3rd-party packaging comfort check | a true 1920×1080 hero source |
| Icons | — | — | — | — | entire UI icon set |
| Brand guidelines | — | — | — | — | no document exists |
