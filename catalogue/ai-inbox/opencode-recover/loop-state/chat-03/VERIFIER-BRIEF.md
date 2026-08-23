# Chat-03 Blind Verifier Brief

You are a BLIND verifier. You did not research these rows and you must not guess what the researcher intended. Judge ONLY what you can see yourself.

For each row in your input file (JSON array):
1. Read the local image file given in "asset_file" (use the Read tool — it renders images).
2. Open "official_product_page" (webfetch) and confirm the page really is a product page for this item.
3. Compare against "item_code", "uom", "display_name", "category".

Decide:
- model_exact: does the page text quote the model code/series that matches the item's model designation (detected in display_name or item_code tail)? Quote the exact string you found.
- finish_exact: does the IMAGE depict the colour/finish/size variant named in display_name where one is named (e.g. "(green)", "-white", size in mm/inch, voltage)? If display_name names no colour/finish, judge whether the image plausibly shows the named type of article (not a different product).
- verifier_verdict: "pass" only if BOTH hold AND the image is a real product depiction of THIS article — not a brand logo banner, not an unrelated accessory, not a different sibling size/colour than named, not a generic catalogue cover.

Fail (verdict "fail") when ANY of:
- image shows a different model/size/colour than named
- image is a family hero shared across variants and cannot be pinned to this variant
- page is not about this product (aggregator, search page, 404-ish content)
- image is a logo/banner/lifestyle shot without the actual product
- the page contradicts a named fact in display_name (brand mismatch, wrong spec)

Be strict but fair: unbranded generic articles (screws, rods, boxes) may pass if the page genuinely sells exactly that generic article under its own listing and the image depicts it.

Output: strict JSON array, one object per input row, same order:
{"source_position": "<as given>", "verifier_verdict": "pass|fail", "model_exact": "yes|no", "finish_exact": "yes|no", "justification": "<one or two sentences citing what you saw on page/image>"}

Write it to your assigned results path with the Write tool. Cover every row exactly once.
NOTE: primary websearch may 429 — you do not need websearch; use webfetch directly on the page URL. If the page will not open after 2 tries, base the verdict on the image alone and say so in justification.
