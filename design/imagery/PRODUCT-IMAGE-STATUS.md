# Product Image Status — Step 4

Decision for all 8 real catalogue products: **none has a verified reference image in the
repository.** Confirmed by direct inspection — `image_url: ""` for every product in
`catalogue.json` (also independently confirmed in `design/audit/catalogue-hard-cases.md`,
Step 1), and no file anywhere under `frontend/public/` or elsewhere in the repo is named,
linked, or otherwise identifiable as photography of any of these eight specific SKUs.

**Decision applied uniformly: `BLOCKED — VERIFIED REFERENCE REQUIRED`.** No realistic
branded product photograph has been generated from the name alone for any of the eight,
per this step's hard restriction. No copyrighted retail/manufacturer photography was
searched for or downloaded. The production **missing-image treatment** specified in
`design/SYSTEM.md` §6/§9 — the `MissingImagePanel` component rendering
`design/assets/icons/product-image-unavailable.svg` plus the sentence *"No product photo
on file yet for this item."* — is retained as the correct, real, production state for all
eight today, exactly as both Step 2A prototypes and the live catalogue already show it.

This is not a stopgap pending this document. It **is** the honest state of the data.

---

## Per-product requirement

For each SKU: what would need to be supplied before an image could be safely prepared —
either a real photo (preferred) or, if the owner explicitly authorises it, an AI-generated
image built from verified reference material (never from the name/description alone).

### 1 — Milwaukee M18 9-Tool Combo Kit (`tools`)
- Exact kit contents and configuration confirmed against the real Milwaukee M18 catalogue
  (the "9-tool" count implies a specific bundle — several M18 combo configurations exist;
  the wrong one would misrepresent what ships).
- Front-facing reference photo of the kit as boxed/bagged (the description mentions "two
  batteries, charger and contractor bag" — the photo must match that, not a generic
  drill-only shot).
- Confirmation of the exact charger/battery variant included (M18 has multiple charger
  models).
- If supplier/manufacturer photography is to be used: written confirmation Ekoway is
  authorised to display Milwaukee's product photography (reseller agreements vary).

### 2 — Pressure-Treated Decking Starter Pack (`lumber`)
- This is a **bundle/kit product**, not a single manufactured item — there is no
  "Pressure-Treated Decking Starter Pack" a manufacturer photographs as one SKU.
- Owner must specify exactly what's in the pack (board count, length, post/hardware
  quantities) before any photo — real or generated — can avoid misrepresenting contents.
- A real photo of the actual assembled pack as sold in-store is the only safe source; nothing
  generic ("some deck boards") would be factually accurate.

### 3 — BEHR Ultra Scuff Defense Interior Paint (`paint`)
- Exact can size sold (quart/gallon/local-market size) and sheen level — "Ultra Scuff
  Defense" is a real BEHR product line with multiple sheens; the wrong one misstates the
  product.
- Confirmed label/can colour-swatch artwork — a generated can label risks inventing BEHR's
  actual packaging design, which is both factually wrong and a trademark concern.
- If using manufacturer photography: confirm Ekoway's authorisation to display BEHR product
  images.

### 4 — Frigidaire Front Control Dishwasher (`appliances`)
- Exact model number (Frigidaire sells several "front control" dishwasher models across
  price/feature tiers — finish, tub material and control layout differ).
- Confirmed finish/colour (stainless vs. black stainless vs. white).
- Manufacturer or supplier authorisation for photography — appliance photos are almost
  always manufacturer-owned; this is the SKU with the highest risk of an unintentional
  trademark/copyright issue if sourced informally.

### 5 — RYOBI 18V Walk-Behind Lawn Mower Kit (`garden`)
- Exact deck size and battery/charger configuration included in "the kit" (RYOBI's 18V
  mower line has multiple deck widths and kit bundles).
- Confirmed colour scheme is current (RYOBI product styling changes across generations).
- Authorisation to display RYOBI/manufacturer imagery if that's the source.

### 6 — Glacier Bay Shaila Vanity Combo (`bath`)
- Exact vanity width and finish ("Shaila" is a real Glacier Bay line with multiple sizes
  and finish options — cabinet colour, countertop material, mirror style all vary).
- Confirmed hardware finish (faucet/handles are sometimes sold separately from the vanity
  combo, sometimes bundled — must match what's actually sold).
- A real photo of the specific combo as stocked, or explicit manufacturer authorisation.

### 7 — Pavestone Patio Project Pallet (`building-materials`)
- Like #2, this is a **bundle product** — "pallet" implies a specific quantity/paver style
  that only the owner can confirm.
- Real photo of the actual pallet/paver style sold, including colour and paver shape (
  Pavestone sells many paver profiles).

### 8 — Husky Heavy-Duty Storage Tote 2-Pack (`storage`)
- Exact tote size/volume and lid colour (Husky sells multiple tote size tiers under similar
  naming).
- Confirmation the "2-pack" bundling and packaging shown would match what ships.

---

## What would make generation safe (general rule, all 8)

An AI-generated image becomes appropriate **only** once all of the following exist for a
given SKU — this is the bar, not a suggestion:

1. A real reference photo (owner's own product photo, or manufacturer/supplier imagery
   Ekoway is authorised to use) showing the actual item as sold.
2. Exact model number matched against the real manufacturer catalogue.
3. Confirmed package contents (for kits/bundles) or exact size/finish (for single items).
4. Confirmed colour/finish as currently stocked.
5. Written approval to use supplier or manufacturer photography, if that is the reference
   source rather than an owner-taken photo.

Until then, every SKU stays on the missing-image panel — which, per `SYSTEM.md` §1
("facts before decoration"), is treated as a correct default state, not a defect to hide.

## What does **not** require any of the above

Once real reference photography exists for any SKU, no new upload mechanism is needed —
`CatalogPanel.tsx` (`:376, :382, :836-838`) already has a working base64 image-upload field
wired directly to `product.image_url`. The blocker for all eight products today is
**photography, not tooling.**
