# Category Image Prompts — Step 4

**No photorealistic image-generation tool is available in this session.** Nothing in this
document was rendered — every image below is a written prompt, awaiting a generation tool
in a future session or the owner's own pipeline. This is stated plainly per this step's
instructions, not implied by omission.

Style anchor (shared by all 8 prompts, do not vary): the existing
`frontend/public/ekoway/slots/cat-power-tools.png` is a genuinely good compositional/
lighting reference already in the repo — flat-lay tools on neutral wood, even directional
light, no people — used here as a **style description**, not copied as source pixels, and
not itself reused (it's 300×184, far below target resolution).

## Shared prompt scaffold

Every prompt below follows this fixed structure, filled per category:

```
Flat-lay product photograph for a hardware retailer's category tile.
Subject: {SUBJECT OBJECTS}.
Surface: neutral light warm-grey workshop or trade-counter ground (concrete, brushed
  wood, or steel bench — pick one consistently across all 8 category images).
Lighting: soft, even, directional from upper-left, minimal shadow, no harsh specular
  highlights, no dramatic mood lighting.
Camera: overhead or 3/4 flat-lay angle, consistent across all 8 category images.
Composition: subject occupies the lower-left two-thirds of frame, generous negative
  space in the upper-right third for responsive text/UI overlay cropping.
Style: factual product photography, no illustration, no 3D render look, no floating
  objects, no motion blur, no lens flare.
Explicitly exclude: people, hands, faces, text, logos, brand marks, certification
  badges, price tags, watermarks, gradients, bokeh, lifestyle staging, model numbers
  legible on any object.
Output: photographic realism, square-ish crop suitable for downstream 4:3 crop at
  1200×900 or larger.
```

## Per-category subject line

| Category | `{SUBJECT OBJECTS}` |
|---|---|
| Tools | A cordless drill, an angle grinder, a tape measure, an assortment of drill bits, and a coiled extension cord — generic, unbranded tool silhouettes only |
| Lumber | Stacked cut lumber boards, a few deck screws or joist hardware brackets scattered nearby, a carpenter's pencil |
| Paint | An unlabelled paint can (lid off, showing a neutral off-white or pale sample colour, no brand wordmark), a roller, a paint tray, two or three colour swatch chips |
| Appliances | A single generic front-control dishwasher control panel close-up, or a compact appliance silhouette (no visible brand nameplate) — avoid implying a specific manufacturer |
| Garden | A push-mower silhouette (generic, no brand decals), garden gloves, a small trowel, a coil of hose |
| Bath | A vanity-style faucet fixture, a folded towel, a bar of unlabelled soap, tile sample chips |
| Building materials | Stacked concrete pavers, a small pile of sand or gravel, a mason's trowel |
| Storage | Two stackable storage totes (lids on and off), one with visible dividers/organizers inside |

## Filename manifest (required outputs once generated)

```
design/imagery/category/tools.webp
design/imagery/category/lumber.webp
design/imagery/category/paint.webp
design/imagery/category/appliances.webp
design/imagery/category/garden.webp
design/imagery/category/bath.webp
design/imagery/category/building-materials.webp
design/imagery/category/storage.webp
```

Each: ≥1200×900, 4:3, WebP, target <180 KB after optimisation, per `ASSET-MATRIX.md`
CAT-01 through CAT-08 and `IMAGE-PERFORMANCE.md`. The `design/imagery/category/` directory
does not exist yet — create it when the first image is actually produced, not before.

## Risk notes carried from the Asset Matrix

- **Appliances (CAT-04):** medium factual-risk — the prompt above deliberately avoids any
  nameplate/brand-identifying detail; review the generated output for accidental brand
  resemblance before use.
- All 8: generic/unbranded by design — none of these represents a specific real product
  (unlike the blocked product photos in `PRODUCT-IMAGE-STATUS.md`), so they carry no
  per-SKU factual claim. They illustrate a *department*, not an item for sale.
- Recommended (not blocking) owner review before shipping any of the 8, consistent with
  `ASSET-MATRIX.md`'s "Recommended" approval column for AI-generated imagery.
