# Prompt — OpenCode — verify Manus passes + deep-research Manus fails

Use **OpenCode**. If OpenCode asks for a model, pick **Gemini**. Copy **everything below the line**.

You do two jobs. Gemini (the separate visual chat) must **not** see pending rows.

---

You are OpenCode for Ekoway Hardware (永光五金, Salim, Sibu). Manus already investigated. Most rows came back PENDING. Your job is to **raise the verified-image rate**.

Gemini (separate chat) reviews **pixels of pass images only**. You decide what is a pass. Do not send Gemini a pending row.

## Do not touch (locked)

- Do not regenerate products 1–2500. Do not edit `manus/P1-CAT-01_products_1001_2500_research_outputs/`.
- Do not overwrite `catalogue/ai-inbox/manus-images/priority-300-pass1.csv`.
- Do not overwrite `catalogue/ai-inbox/gemini-image-reverify/existing-1-2500-pass2.csv` or `manus-priority-300-pass2.csv`.
- Do not work Manus’s new range **2559+** until a `retry-pass2/shard-*.csv` lands (Grok will tell you).
- Do not deploy. Do not copy into `frontend/public/product-images/`. Do not set rights to approved.

Skip any `item_code+uom` already in `catalogue/image-sourcing/dual-agreed-candidate-queue.csv` (**85** dual-agreed candidates). Those already passed.

## Job 1 — verify existing pass images (do this first, it is small)

Input:

`online-shopping-platform/catalogue/ai-inbox/opencode-verify/pass-queue-unreviewed-2501-plus.csv`

**22** Manus `VERIFIED_CANDIDATE` rows in catalogue positions 2501–7771. Gemini has **never** opened these. Open every `official_product_page` and `official_image_url` yourself. Open the `local_asset_path` if the file exists.

**Fail (do not send to Gemini) if any is true:**

- URL dead / timeout / TLS junk with no local hash
- Marketplace, Google Images, Facebook, Shopee, Lazada, AliExpress
- Dealer-only photo when an OEM page exists and was not used
- Colour/finish/UOM/suffix/sibling SKU mismatch
- Family hero reused; accessory photo used for the whole tool (or the reverse)
- `model_exact` or `finish_exact` would not be `yes`

**Pass** only if model **and** finish are exact and the image is from official MY / official OEM / official PDF crop / authorised MY distributor.

Write:

`catalogue/ai-inbox/opencode-verify/pass-queue-unreviewed-2501-plus-verified.csv`

Header **exactly**:

`source_position,item_code,uom,display_name,prior_status,opencode_decision,finish_exact,model_exact,url_live,source_ok,official_product_page,official_image_url,local_asset_path,rights_status,reason,human_action`

- `opencode_decision`: `pass` | `fail`
- `url_live` / `source_ok`: `yes` | `no`
- `finish_exact` / `model_exact`: `yes` | `no` | `unresolved`
- `rights_status`: `needs_permission` | `unknown` | `no_asset`

Also `opencode-verify-2501-plus-notes.md`: how many pass / fail, every fail reason.

Failed verify rows are **not** dead. Append them to Job 2 (find the **correct** official image).

Say `OPENCODE VERIFY COMPLETE 2501-PLUS` with the CSV path. Grok will schema-check, then Gemini is allowed to review **only** the `opencode_decision=pass` rows.

## Job 2 — deep-research Manus fails (this is the main work)

Input:

`online-shopping-platform/catalogue/ai-inbox/opencode-recover/fail-queue.csv`

**326** rows Manus did not get to a pass image. Work in this order (column `priority_tier` / `queue`):

| Order | queue | rows | What to do |
|---|---|---:|---|
| 1 | `p300_pending` | 257 | Highest-priority shop SKUs. Manus searched and failed. Search **again**, deeper. `hint_page` / `official_product_page` are starting URLs, not answers. |
| 2 | `gemini_disagreement` | 20 | Prior image was **wrong** (colour, sibling, dealer, dead URL, accessory vs tool). Do **not** reuse the rejected asset. Find the correct official image. `gemini_note` says what failed. |
| 3 | `pass2_pending_2501_2558` | 49 | Branded retry pass-2 still pending. Search again. |

Later (only when Grok says a Manus shard landed): any new Manus `PENDING` / `REJECT` from `retry-pass2/shard-*.csv`. Do not start 2559+ yourself.

### Deep research (mandatory — this is why Manus failed)

Manus stopped at empty `.com.my` product pages and bulk-marked PENDING. You must continue:

1. Parse `item_code` + `display_name` for brand and the longest model token.
2. Queries (record all of them in `reason` or notes):
   - `"{brand}" "{model}" site:.com.my`
   - `"{model}" official Malaysia`
   - `"{model}" filetype:pdf`
   - authorised distributors: Leeden, Sonic Hardware, A&A, brand dealer `.com.my`
   - official global OEM page for that exact regional SKU
3. Open the pages. Save URL even when the image is unproven (`PENDING` + URL).
4. Official PDF: crop **that model only**.
5. Colour named in the catalogue and photo is the other colour → stay `PENDING`, keep the page, say `colour_unproven`.
6. Still **no** Shopee / Lazada / Facebook / AliExpress / Google Images as the image source.

`PENDING` with empty URLs and empty queries = not done.

### Recover output

Shards of **50** in fail-queue order:

`catalogue/ai-inbox/opencode-recover/recover-shard-0001-0050.csv`

then `recover-shard-0051-0100.csv`, … and when a block of 50 is real, concatenate toward:

`catalogue/ai-inbox/opencode-recover/recover-pass1.csv`

Header **exactly** (same as Manus priority-300):

`item_code,uom,display_name,category,official_product_page,official_image_url,match_confidence,finish_exact,model_exact,uom_assessment,rights_status,decision,reason,human_action`

- `match_confidence`: A (model+finish) · B (model only) · C (family) · R (reject)
- `decision`: `candidate` | `pending` | `reject`
- `candidate` only if model **and** finish are `yes` and the image is official / authorised
- `rights_status`: `needs_permission` | `unknown` | `no_asset`

If you store a file: `catalogue/ai-inbox/opencode-recover/assets/{item_code-safe}.{ext}`.

After each 50-row shard, 10-line notes: new candidates / pending-with-URL / pending-no-URL / queries-empty (must be 0).

**Only `decision=candidate` rows go to Gemini.** Pending stays with you.

## Exact-match bar

Brand, model code, suffix, colour/finish, size/voltage if named, UOM. Malaysia first. A wrong image is worse than no image.

Known traps: Joven SL30iP black vs white vs RS; Khind `FF2005_WH.jpg` filename vs actual colour; Bosch accessory vs whole tool; Cabana sibling SKUs; dealer `buildershardware.com.my` for Sorento.

## Start now

1. Job 1 (22 rows) to completion.
2. Then Job 2 shard **0001–0050** (first 50 of `fail-queue.csv`, which is p300 pending).

Say the completion lines. Do not start publishing.
