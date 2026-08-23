# Ekoway catalogue image sourcing plan

Prepared: 10 August 2026

This plan applies to the imported AutoCount catalogue. It supersedes the old eight-demo-product image audit for the real catalogue while keeping its central rule: never show an image that has not been matched to the actual item being sold.

## Confirmed decisions

- Keep all 7,771 sellable imported listings visible.
- Keep the 237 positive-stock items with no cost excluded.
- Do not wait for every listing to have a unique image before launch.
- Do not copy images from marketplaces, other retailers, social posts, or search-result thumbnails.
- Do not generate a realistic branded product image from a product name alone.
- Use `ekowayhardware@gmail.com` as the business email when contact and policy work resumes.

## Current catalogue and system findings

- 7,771 sellable imported listings across 32 departments.
- Highest listing counts: Electrical 771, Power Tools 724, Fasteners & Fixings 701, Plumbing 606, Hand Tools 472, and Paint & Sundries 439.
- Highest estimated stock-value departments: Power Tools, Electrical, Paint & Sundries, Plumbing, Bathroom, and Building Materials.
- Recognisable branded groups include Bosch, Nippon Paint, Joven, Stanley, STIHL, Sorento, Saniware, Khind, Rubine, Deka, Karcher, Panasonic, Yale, and others.
- Official product sources can be found for at least several high-priority groups. Examples verified during planning include Bosch GWS 060 catalogue material, Joven SA8e, and Nippon Paint Super Matex.
- General image search often ranks marketplace listings above official sources, even when the model number is exact. Search results are discovery evidence, not permission to reuse an image.
- The current admin image field works one product at a time. Uploaded files become base64 data stored in the product row.
- The AutoCount catalogue importer has no image column or bulk image update path.
- The current URL validator rejects first-party relative paths such as `/product-images/example.webp`.

## Launch image target

The efficient first release is:

1. Attractive, unbranded department artwork for all 32 departments.
2. Exact, verified product images for the first 300 priority listings.
3. Verified family images shared by variants only when the visible product is genuinely the same.
4. An intentional “photo coming soon” treatment for every unmatched item.

This makes the full catalogue usable without pretending that all 7,771 listings have been individually photographed.

## Priority calculation

Each listing receives a score used only for image work:

| Factor | Weight | Reason |
|---|---:|---|
| Stock quantity × selling price | 35% | Prioritises money currently tied up in stock |
| Recognisable brand and model | 25% | Exact official matching is more feasible |
| Customer needs appearance to decide | 20% | Bathroom, lighting, fans, sinks and appliances benefit strongly from images |
| Search or sales usefulness | 10% | Products customers are likely to look for online |
| Image can safely cover verified variants | 10% | One approved image can improve several legitimate variants |

The first batch should be selected by this score, not by category count alone.

## Work tiers

### Tier 0 — 32 department images

- One consistent unbranded category image for every department.
- AI generation is acceptable because the image represents a department, not an exact SKU.
- No logos, model numbers, labels, certification marks, people, prices, or misleading included accessories.
- 4:3 WebP, at least 1200 × 900, target below 180 KB.
- Human review for accidental brand resemblance and incorrect tools.

Estimated effort: 8–12 hours including generation, selection, optimisation, and storefront QA.

### Tier 1 — first 300 product listings

Start with high-stock-value and high-visual-decision groups:

- Bosch tools and high-value accessories
- Nippon Paint cans and product families
- Joven heaters
- Stanley power tools
- Sorento and Saniware bathroom products
- Khind, Rubine, Deka, Karcher, Panasonic and other model-numbered appliances
- High-value lighting, fans, sinks, pumps, locks and electrical products

Estimated effort after tooling exists: 35–55 hours. This includes automated candidate discovery and manual verification; permission lead time is separate.

### Tier 2 — next 700 listings

- Extend model matching across branded lines.
- Use verified family images for size, colour, capacity, or UOM variants only under the sharing rules below.
- Prioritise the remaining visually distinctive products before repetitive fittings and fasteners.

Estimated effort: 80–140 hours.

### Tier 3 — remaining catalogue

- Generic and low-value fittings, fasteners, cables, hoses, abrasives and similar items.
- Photograph by product family in store where possible.
- Keep the category placeholder when no exact or safe family match exists.

Giving every one of 7,771 listings a separately verified image would likely take 500–1,000 hours. It is not a sensible launch requirement. Family grouping can reduce this substantially, but only after the variants are verified.

## Source order and rights rules

Use sources in this order:

1. Ekoway’s own photograph of the stocked item.
2. A supplier or distributor media pack with written permission for Ekoway’s online store.
3. A manufacturer dealer/media portal with terms that permit commercial reseller use.
4. A manufacturer product page used for identification only, while permission is requested.
5. No image; retain the honest missing-image treatment.

Never use these as production image sources without explicit permission:

- Shopee, Lazada, Amazon, eBay, Blibli or another marketplace
- another hardware retailer
- Pinterest, Facebook, Instagram, TikTok or a blog
- a Google/Bing search-result thumbnail
- an AI recreation of a branded model made only from text

Official does not automatically mean reusable. For example, Nippon Paint Malaysia’s published website terms restrict copied information and images to non-commercial use. Malaysian copyright guidance also treats reproduction and public distribution as rights controlled by the copyright owner. Therefore, official pages are reliable for matching but need a reseller licence, supplier permission, or owner-taken replacement before production use.

## Exact matching protocol

For every product candidate, AI records:

- Ekoway item code and UOM
- display name and original AutoCount description
- detected brand
- detected model, manufacturer part number, barcode or pack size
- candidate source page and candidate image URL
- source owner and domain
- visible colour, size, packaging and included accessories
- rights status
- match confidence
- reviewer decision and notes

### Confidence levels

| Level | Required evidence | Storefront action |
|---|---|---|
| A — exact | Brand + exact model/part number + pack/colour/configuration match | May publish after rights approval |
| B — verified family | Same visible product; only a non-visible or clearly labelled variant differs | May share after manual review |
| C — probable | Name resembles the item but model, pack or finish is incomplete | Do not publish |
| D — generic | Category-only or visually similar item | Department placeholder only |

Only A and manually approved B records receive product images.

### Family-sharing rules

An image may be shared only when all visible characteristics are the same. Safe examples can include:

- the same fitting sold under multiple UOM records;
- the same cable construction where colour is not shown or the image is explicitly labelled illustrative;
- the same machine with a non-visible accounting/UOM difference.

Do not share when size, colour, finish, capacity, voltage, packaging quantity, included battery, included accessory, or model generation differs.

## Search workflow

For each detected brand:

1. Establish a whitelist of official Malaysian, regional and global manufacturer domains.
2. Search exact manufacturer part number first.
3. Search exact brand + model second.
4. Search the official PDF catalogue or dealer portal when the live product page is missing.
5. Compare name, order number, voltage, dimensions, colour, packaging and included accessories.
6. Reject candidates found only on marketplaces or other retailers.
7. Save candidate metadata to the manifest; do not hotlink or download to production yet.
8. Request commercial-use permission or obtain the supplier media pack.
9. Download the approved master, optimise it, and serve it from Ekoway-controlled storage.
10. Run visual and storefront QA before publication.

Example discovery queries:

```text
site:bosch-pt.com.my "0 601 375 6L0"
site:joven-electric.com "SA8e"
site:nipponpaint.com.my "Super Matex"
"manufacturer part number" official Malaysia
"brand" dealer media assets Malaysia
```

## Technical work before bulk sourcing

### 1. Image manifest

Create a CSV with:

```text
item_code,uom,product_id,brand,model,family_key,priority_score,
candidate_page_url,candidate_image_url,source_owner,rights_status,
match_confidence,review_status,local_asset_path,checksum,notes
```

Keep cost and margin out of this file.

### 2. First-party storage

- Use Ekoway-controlled storage; do not hotlink manufacturer or marketplace servers.
- Use a stable hashed asset key because some item codes contain slashes, quotes and other unsafe filename characters.
- Standard output: WebP, sRGB, 1000–1200 px square or 4:3 according to the card crop, normally 100–200 KB.
- Preserve the approved original privately for later reprocessing.

### 3. Bulk import

- Add an optional image manifest importer keyed by `source_item_code + source_uom`.
- Allow trusted first-party relative image paths or a configured first-party HTTPS asset origin.
- Re-importing AutoCount stock must not erase an approved image.
- Report unmatched keys, duplicate keys and invalid URLs before committing updates.
- Keep a rollback copy of the prior image mapping.

### 4. Image status in admin

Add filters for:

- missing image
- candidate found
- permission pending
- ready for review
- approved
- rejected/mismatch

This is more useful than editing 7,771 products one by one.

## Visual standard

- The product must be the main subject on a clean, neutral background.
- No seller badges, promo text, prices, watermarks, QR codes, marketplace logos or borders.
- Do not add accessories that are not included.
- Do not remove safety guards or materially alter colour/shape.
- Paint images should show the exact product line and pack size; colour swatches are illustrative and must not promise screen-to-paint accuracy.
- All images require meaningful alt text based on the verified product name, not keyword stuffing.
- Cards, product detail, cart and checkout must all fall back cleanly if an image fails to load.

## QA acceptance criteria

- 100% of published product images are confidence A or approved B.
- 100% have a recorded owner/source and rights status.
- 0 marketplace images, watermarks, price overlays or external hotlinks.
- Wrong colour, pack count, voltage, model generation, or accessory configuration blocks publication.
- Image files stay within the agreed size target and do not cause visible layout shift.
- Mobile product cards remain readable on a slow connection.
- AutoCount stock re-import preserves image mappings.
- Missing-image products remain fully searchable, purchasable and clearly presented.

## Execution schedule at 8 hours per day

### Day 1 — tooling specification and catalogue scoring

- Generate the image manifest and priority score.
- Detect likely brand/model/family fields.
- Produce the first 300-item queue and the official-domain whitelist.

### Day 2 — bulk image infrastructure

- Add first-party path support and bulk manifest import.
- Add validation, dry-run reporting, rollback and tests.

### Day 3 — department artwork

- Generate and review 32 consistent department images.
- Optimise, wire into the storefront and test responsive crops.

### Days 4–6 — candidate discovery

- Search official sources for the first 300 listings.
- Build confidence and rights records.
- Group only proven variants.

### Days 7–8 — approved asset processing

- Process assets for which Ekoway already has permission.
- Import, test and correct crop/alt text issues.
- Leave permission-pending items unpublished.

### Day 9 — storefront QA and handoff

- Verify product grid, detail, search, cart and checkout on desktop/mobile.
- Deliver the unresolved-photo list and a store-photography shot list.

Minimum useful first pass: about 9 working days plus external permission time. A full 1,000-image phase is closer to 3–5 additional working weeks. A unique verified image for all 7,771 listings is a multi-month project and should not block launch.

## Owner input needed later — not needed to start Days 1–3

1. Supplier/distributor names and contact details, especially for Bosch, Nippon Paint, Joven, Stanley, Sorento, Saniware, Khind, Rubine, Deka, STIHL and Karcher.
2. Any dealer agreements, catalogues, shared drives or media packs already supplied to Ekoway.
3. Permission to send a standard commercial-image-use request from `ekowayhardware@gmail.com`, or the owner sends it using a prepared template.
4. Twenty-minute approval of the first department-image style and the first 20 matched product images.
5. Phone photos of priority products that remain unmatched after official-source research.

No legal-policy decision, price list, or information about the 237 excluded costless items is required to begin this image plan.
