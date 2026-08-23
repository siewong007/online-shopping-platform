# Prompt — Manus — investigate remaining branded images

**Manus is retired for images (22 August 2026).** Do not paste this. OpenCode owns the remaining catalogue: `opencode-full-catalogue.md`.

Historical prompt below.

Copy **everything below the line** into a **new** Manus chat (or the old one if it is still open). Time is not limited. Accuracy beats speed.

---

You are Manus doing **first-pass official-image investigation** for Ekoway Hardware (永光五金, Salim, Sibu).

OpenCode will verify your **pass** rows and will deep-research your **fails**. Gemini will look at pixels **only after** a row already has a live official image. Do not wait for them.

## Do not touch (locked)

- Do **not** regenerate products 1–2500. Zip SHA-256 must remain `b90ce77adf6f9a849df22161540d8ca363af4db5fec0c48b1838eab715955f9d` at `manus/P1-CAT-01_products_1001_2500_research_outputs/P1-CAT-01_products_1001_2500_research_outputs.zip`.
- Do **not** overwrite `catalogue/ai-inbox/manus-images/priority-300-pass1.csv` or its shards.
- Do **not** overwrite Gemini files under `catalogue/ai-inbox/gemini-image-reverify/`.
- Do **not** work catalogue positions **1–2558**. Pass-2 of 2501–2558 is already delivered.
- Do **not** publish into `frontend/public/product-images/`. Do not deploy. Do not invent rights.

## Your exclusive worklist

`online-shopping-platform/catalogue/ai-inbox/manus-images/retry-pass2-worklist-2559-plus.csv`

**2,778** branded/model-token rows, source_position **2559–7769**, still PENDING after the first branded retry. This is investigation, not a coverage index.

Skip a row only if you already have `VERIFIED_CANDIDATE` **and** a live official image URL for that exact `item_code+uom` on disk. Dual-agreed 1–300 candidates are not in this file.

Generic screws/bolts **not** in this CSV stay out of this sitting.

## Exact-match bar (fail the row if any named fact is wrong)

Brand, model code, suffix (RS / IP / kit / P180 vs S-trap), colour/finish (black ≠ white), size/voltage if named, UOM (PCS vs SET). Malaysia first (`*.com.my`). Then official global OEM page, official PDF (crop **that** model only), authorised Malaysian distributor.

**Never** Shopee, Lazada, Facebook, AliExpress, or Google Images as the image source. Never reuse a family hero across SKUs. Never use a white photo for a black row.

`PENDING` is allowed **only after** you record the queries you ran. Empty page + empty image + no queries = not done.

## How to search one row (mandatory)

From `item_code` + `display_name` + `detected_brand` + `detected_model`:

1. Pull the longest model token (MIC222TLAGN, CB8003-3, D07, UT33B+).
2. Pull brand from the name **or** item-code groups (`MID`→Midea, `BOS`→Bosch, `CAB`→Cabana, `SAN`→Saniware, `KHI`→Khind, `JOV`→Joven, `DC`/`DONG`→Dongcheng, `NIP`→Nippon, `PAN`→Panasonic, `STA`→Stanley, `SIK`/`SIKA`→Sika).
3. Run at least:
   - `"{brand}" "{model}" site:.com.my`
   - `"{model}" "{brand}" official`
   - `"{model}" filetype:pdf`
4. Open official hits. Save page URL + image URL when the page names the **same model and finish**.
5. If colour is named and the photo is the other colour → `PENDING`, keep the page URL, say `colour_unproven`.

## Output

Shards of **50** from the worklist order:

`catalogue/ai-inbox/manus-images/retry-pass2/shard-2559-2608.csv`

then `shard-2609-2658.csv`, and so on, until the 2,778 rows are done.

Header **exactly**:

`source_position,item_code,uom,display_name,brand_guess,model_guess,search_queries,pages_opened,official_page_url,image_url,model_exact,finish_exact,first_pass_status,why_pending,rights_status,reason`

- `model_exact` / `finish_exact`: `yes` | `no` | `unresolved`
- `first_pass_status`: `VERIFIED_CANDIDATE` | `PENDING` | `REJECT`
- `VERIFIED_CANDIDATE` only if model **and** finish are `yes` **and** `image_url` is official / authorised (not marketplace, not dealer-only when an OEM page exists)
- `why_pending` one of: `found_page_no_exact_image | colour_unproven | sibling_model | dead_url | searched_not_found | no_model_token | generic_unbranded`
- `rights_status`: `needs_permission` | `unknown` | `no_asset` only

If you store a file, put it under `catalogue/ai-inbox/manus-images/retry-pass2/assets/` named `{source_position}.{ext}` and mention the path in `reason`.

After each shard write 10-line notes next to it: verified / pending-with-URL / pending-no-URL / queries-empty. **queries-empty must be 0.**

## Start now

Do the first 50 rows of `retry-pass2-worklist-2559-plus.csv` (source_position 2559 upward). Say `MANUS INVESTIGATE SHARD COMPLETE 2559-2608` with the file path. Grok will schema-check. OpenCode verifies your candidates; OpenCode (not Gemini) retries your pendings.
