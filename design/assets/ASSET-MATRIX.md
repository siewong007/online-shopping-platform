# Asset Matrix — Step 4

One row per asset needed for the Trade Counter storefront. Columns are fixed across every
table for scanability. **Generation status** values used throughout: `NOT GENERATED —
BLOCKED`, `PROMPT PREPARED — AWAITING GENERATION`, `PRODUCTION-READY (SVG, hand-authored)`,
`EXISTS — NEEDS OWNER EXPORT`.

---

## 1. Real products (8 of 8 — all blocked)

Per this step's hard rule: no realistic branded product photograph may be generated from
the name alone. Full reasoning per SKU is in `design/imagery/PRODUCT-IMAGE-STATUS.md`.

| Asset ID | Catalogue ID / slug | Intended use | Required dims | Aspect | Format | Max size | Source/provenance | Generation status | Factual-risk | Approval | Final filename |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PROD-01 | id 1 / tools | Listing row + detail media | 1200×1200 | 1:1 | WebP | 200 KB | None available | `NOT GENERATED — BLOCKED` | High (specific branded model) | Owner reference required | *(none — use `product-image-unavailable.svg`)* |
| PROD-02 | id 2 / lumber | Listing row + detail media | 1200×1200 | 1:1 | WebP | 200 KB | None available | `NOT GENERATED — BLOCKED` | High | Owner reference required | *(none)* |
| PROD-03 | id 3 / paint | Listing row + detail media | 1200×1200 | 1:1 | WebP | 200 KB | None available | `NOT GENERATED — BLOCKED` | High | Owner reference required | *(none)* |
| PROD-04 | id 4 / appliances | Listing row + detail media | 1200×1200 | 1:1 | WebP | 200 KB | None available | `NOT GENERATED — BLOCKED` | High | Owner reference required | *(none)* |
| PROD-05 | id 5 / garden | Listing row + detail media | 1200×1200 | 1:1 | WebP | 200 KB | None available | `NOT GENERATED — BLOCKED` | High | Owner reference required | *(none)* |
| PROD-06 | id 6 / bath | Listing row + detail media | 1200×1200 | 1:1 | WebP | 200 KB | None available | `NOT GENERATED — BLOCKED` | High | Owner reference required | *(none)* |
| PROD-07 | id 7 / building-materials | Listing row + detail media | 1200×1200 | 1:1 | WebP | 200 KB | None available | `NOT GENERATED — BLOCKED` | High | Owner reference required | *(none)* |
| PROD-08 | id 8 / storage | Listing row + detail media | 1200×1200 | 1:1 | WebP | 200 KB | None available | `NOT GENERATED — BLOCKED` | High | Owner reference required | *(none)* |

All eight render the production `MissingImagePanel` component (`SYSTEM.md` §6) using
`product-image-unavailable.svg` (§6 of this step) — that is not a placeholder pending this
matrix, it **is** the correct production state today, per `catalogue-hard-cases.md`
(`image_url: ""` on all 8 real products).

## 2. Top-level categories (8 of 8 real categories — the `all` umbrella is UI-only, not a photographed category)

| Asset ID | Catalogue slug | Intended use | Required dims | Aspect | Format | Max size | Source/provenance | Generation status | Factual-risk | Approval | Final filename |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CAT-01 | tools | Category tile / listing header | 1200×900 | 4:3 | WebP | 180 KB | New AI generation; style anchored to existing `frontend/public/ekoway/slots/cat-power-tools.png` (composition/lighting reference only, not reused as source pixels) | `PROMPT PREPARED — AWAITING GENERATION` | Low (generic tool shapes, no real brand logos) | Recommended before ship (AI-generated) | `design/imagery/category/tools.webp` |
| CAT-02 | lumber | Category tile / listing header | 1200×900 | 4:3 | WebP | 180 KB | New AI generation — no existing reference of any kind | `PROMPT PREPARED — AWAITING GENERATION` | Low | Recommended | `design/imagery/category/lumber.webp` |
| CAT-03 | paint | Category tile / listing header | 1200×900 | 4:3 | WebP | 180 KB | New AI generation; existing `img/paints.jpg` reviewed as tone reference only (too lifestyle-styled to reuse directly) | `PROMPT PREPARED — AWAITING GENERATION` | Low | Recommended | `design/imagery/category/paint.webp` |
| CAT-04 | appliances | Category tile / listing header | 1200×900 | 4:3 | WebP | 180 KB | New AI generation; existing `img/home-appliances.jpg` reviewed as tone reference only | `PROMPT PREPARED — AWAITING GENERATION` | Medium (must avoid implying a specific real brand's appliance) | Recommended | `design/imagery/category/appliances.webp` |
| CAT-05 | garden | Category tile / listing header | 1200×900 | 4:3 | WebP | 180 KB | New AI generation — no existing reference | `PROMPT PREPARED — AWAITING GENERATION` | Low | Recommended | `design/imagery/category/garden.webp` |
| CAT-06 | bath | Category tile / listing header | 1200×900 | 4:3 | WebP | 180 KB | New AI generation; existing `img/bathroom-plumbing.jpg` reviewed as tone reference only | `PROMPT PREPARED — AWAITING GENERATION` | Low | Recommended | `design/imagery/category/bath.webp` |
| CAT-07 | building-materials | Category tile / listing header | 1200×900 | 4:3 | WebP | 180 KB | New AI generation; existing `slots/cat-building.png` reviewed as tone reference only (wrong resolution/taxonomy fit) | `PROMPT PREPARED — AWAITING GENERATION` | Low | Recommended | `design/imagery/category/building-materials.webp` |
| CAT-08 | storage | Category tile / listing header | 1200×900 | 4:3 | WebP | 180 KB | New AI generation — no existing reference | `PROMPT PREPARED — AWAITING GENERATION` | Low | Recommended | `design/imagery/category/storage.webp` |

Prompts for all eight: `design/imagery/CATEGORY-IMAGE-PROMPTS.md`.

## 3. Hero / brand imagery

| Asset ID | Slug | Intended use | Required dims | Aspect | Format | Max size | Source/provenance | Generation status | Factual-risk | Approval | Final filename |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HERO-01 | trade-counter | Storefront hero, concept 1 — organised trade counter | 1920×1080 desktop; single focal point croppable to ~4:5 for mobile | 16:9 (desktop) | WebP | 250 KB | New AI generation; existing `store/store-01.jpg`–`store-10.jpg` reviewed as real-world reference (too cluttered/third-party-packaging-heavy to use directly, per `ASSET-AUDIT.md` §3) | `PROMPT PREPARED — AWAITING GENERATION` | Medium (must not imply a specific real brand endorses/appears) | Recommended, plus explicit sign-off that no real competitor packaging/branding is depicted | `design/imagery/hero/trade-counter.webp` |
| HERO-02 | jobsite-prep | Storefront hero, concept 2 — working workshop / jobsite prep | 1920×1080 desktop; single focal point croppable to ~4:5 for mobile | 16:9 (desktop) | WebP | 250 KB | New AI generation — no existing reference | `PROMPT PREPARED — AWAITING GENERATION` | Low | Recommended | `design/imagery/hero/jobsite-prep.webp` |
| BRAND-01 | logo-transparent | Header/dark-zone-safe brand mark | 512×512 minimum | 1:1 | PNG (transparency required) | n/a (not a photo) | **Existing** `frontend/public/ekoway/ekoway-logo.jpeg`, re-exported | `EXISTS — NEEDS OWNER EXPORT` | None (exact reproduction, not generation) | **Required** — must come from the owner's original artwork, not a re-drawn approximation | `design/assets/brand/ekoway-logo-transparent.png` *(not created this step — owner deliverable)* |
| BRAND-02 | logo-vector | Scalable brand mark for any future large/print use | Vector | 1:1 | SVG | n/a | **Existing** logo, traced or supplied by owner | `EXISTS — NEEDS OWNER EXPORT` | None if from original vector; **Medium/blocking if hand-traced** (risk of inaccurately reproducing a registered mark) | **Required** — do not hand-trace without owner sign-off | `design/assets/brand/ekoway-logo.svg` *(not created this step — owner deliverable)* |

Prompts for HERO-01/02: `design/imagery/HERO-IMAGE-PROMPTS.md`. BRAND-01/02 are **not**
prepared as AI-generation prompts — a company's registered mark must come from the owner's
source artwork, not be reconstructed by inference from a 225×225 JPEG. Listed here so the
gap is tracked, not silently skipped.

## 4. Missing-image treatment (production-ready this step)

| Asset ID | Use | Intended use | Required dims | Aspect | Format | Max size | Source/provenance | Generation status | Factual-risk | Approval | Final filename |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MISS-01 | Product missing-image panel | Listing row + detail media, all 8 real products today | Scalable (inline SVG, `viewBox` 0 0 120 120) | 1:1 | SVG | ~1–2 KB (text-based, no raster) | Hand-authored this step | `PRODUCTION-READY (SVG, hand-authored)` | None (no factual claim, decorative + labelled by adjacent copy) | None — no photographic content | `design/assets/icons/product-image-unavailable.svg` |
| MISS-02 | Category missing-image panel | Category tile fallback if a category image is not yet generated | Scalable (inline SVG, `viewBox` 0 0 160 120) | 4:3 | SVG | ~1–2 KB | Hand-authored this step | `PRODUCTION-READY (SVG, hand-authored)` | None | None | `design/assets/icons/category-image-unavailable.svg` |

## 5. UI icon set (production-ready this step)

The task's "grid/list" bullet is implemented as two separate files — the real app already
has independent grid/list view-mode buttons (`viewMode`, `App.tsx:2687, 2881-2890`) — and
"stock/check" as one checkmark icon (used for the in-stock/confirmation signal, paired with
text per `SYSTEM.md` §6 "colour is never the only signal," not a status colour by itself).

| Asset ID | Icon | Intended use | Required dims | Aspect | Format | Max size | Source/provenance | Generation status | Factual-risk | Approval | Final filename |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ICON-01 | Search | Search field affordance | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-search.svg` |
| ICON-02 | Filter | Filter drawer trigger | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-filter.svg` |
| ICON-03 | Sort | Sort control label | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-sort.svg` |
| ICON-04 | Grid view | Listing density toggle (grid) | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-grid.svg` |
| ICON-05 | List view | Listing density toggle (list) | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-list.svg` |
| ICON-06 | Close | Drawer/modal dismiss | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-close.svg` |
| ICON-07 | Chevron | Breadcrumb / expand affordance | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-chevron.svg` |
| ICON-08 | Check / in-stock | Confirmation, in-stock signal (paired with text) | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-check.svg` |
| ICON-09 | Warning | Low-stock / offline-banner signal (paired with text) | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-warning.svg` |
| ICON-10 | Image unavailable (small) | Inline/compact reuse of MISS-01 at icon scale (e.g. thumbnails) | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-image-unavailable.svg` |
| ICON-11 | Clear / reset | "Clear all filters" action | 20×20 viewBox | 1:1 | SVG | <1 KB | Hand-authored | `PRODUCTION-READY` | None | None | `design/assets/icons/icon-clear.svg` |

Full accessibility/usage documentation: `design/assets/ICON-GUIDE.md`.

---

## Count reconciliation

8 products + 8 categories + 2 hero concepts + 2 brand-export placeholders + 2 missing-image
panels + 11 UI icons = **33 asset rows**. Production-ready today: 13 (2 missing-image
panels + 11 icons, all hand-authored SVG). Blocked pending owner input: 10 (8 products + 2
brand exports). Prompted, awaiting a generation tool: 10 (8 categories + 2 hero concepts).
