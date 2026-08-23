# Prompt — Manus — retry: useful research

**Retry delivered 19 August 2026** (2,838 rows overlaid; 10 new candidates). Do not paste this again.

Next Manus paste: `docs/ai-prompts/manus-priority-300.md`.

Historical prompt below.

The first pass **covered** 7,771 rows on paper but **did not research** most of them. Copy **everything below the line** into the same Manus chat.

---

STOP claiming COMPLETE. Your campaign master is:

- 7,771 rows “covered”
- **151 VERIFIED_CANDIDATE** (140 of those are the old 1–2500 files, not this pass)
- **Only 11 verified in 2501–7771**, with **only 11 image files** saved
- 5,260 PENDING in 2501–7771, of which **2,838 have a brand or model token you never searched**
- Shards 3801–7771 were bulk-marked PENDING (“no detected brand”) without per-row search logs

That is a **coverage index**, not image research. Do not write another COMPLETE.md until the retry queue is actually searched.

## What went wrong (fix these habits)

1. **PENDING with empty URLs is incomplete.** You may mark PENDING only after you record the queries you ran. Empty `source_url` + empty `search_queries` = not done.
2. **You did not parse item codes.** `LAD-ALU-WEL-D07` + name “Alum Welded Ladder - D07” is searchable. `IND-COO-MID-MIC222TLAGN` is Midea — you did find a few of these; do that for every model token.
3. **Manufacturer-only .com.my is too thin.** After official MY product page, you MUST continue:
   - official global manufacturer page
   - official PDF catalogue (crop the **exact** model only)
   - authorised Malaysian distributor (Leeden, Sonic Hardware, A&A, brand dealer sites)
   - brand series page if the exact SKU is named on that page next to the photo
   - Still **no** Shopee, Lazada, Facebook, AliExpress, Google Images as the image source.
4. **Fail-closed is not fail-to-search.** If the page exists, save the URL even when the image is unproven (`PENDING` + URL). Today 5,249 pending rows have **no URL at all**.
5. **Do not bulk-close a 100-row shard as 0 verified** unless every row has `search_queries` filled.

## Your retry queue (start here)

File already built for you:

`online-shopping-platform/catalogue/ai-inbox/manus-images/retry-queue-branded-2501-7771.csv`

**2,838 rows** in 2501–7771 that already have a brand name or a model-like token (e.g. MIC222TLAGN, D07, 15X15FT, Bosch-style codes). These are the useful ones. Ignore the ~2,422 generic screws/bolts/sandpaper until this queue is done.

Work in shards of **50**, not 100. Name files:

`catalogue/ai-inbox/manus-images/retry-shard-XXXX-YYYY.csv`

## How to search one row (mandatory)

From `item_code` + `display_name` + `detected_model`:

1. Pull model tokens: longest alphanumeric chunk (MIC222TLAGN, CB8003-3, D07, UT33B+).
2. Pull brand from the name **or** the item_code middle groups (`MID`→Midea, `BOS`→Bosch, `CAB`→Cabana, `SAN`→Saniware, `KHI`→Khind, `JOV`→Joven, `DC`/`DONG`→Dongcheng, `NIP`→Nippon, `PAN`→Panasonic, `STA`→Stanley).
3. Run at least these queries (record them):
   - `"{brand}" "{model}" site:.com.my`
   - `"{model}" "{brand}" official`
   - `"{model}" filetype:pdf`
4. Open official hits. If the page names the **same model and finish**, save page URL + image URL.
5. If colour is in the catalogue name (black/white/gold) and the photo is the other colour → PENDING, keep the page URL, say `colour_unproven`. Do not skip the row as if it were unsearchable.

## Output columns (retry shards)

`source_position,item_code,uom,display_name,brand_guess,model_guess,search_queries,pages_opened,official_page_url,image_url,model_exact,finish_exact,first_pass_status,why_pending,rights_status,reason`

`why_pending` must be one of:

`found_page_no_exact_image | colour_unproven | sibling_model | dead_url | searched_not_found | no_model_token | generic_unbranded`

`first_pass_status`: `VERIFIED_CANDIDATE` only if model_exact=yes AND finish_exact=yes AND image_url is official (not marketplace). Otherwise `PENDING` **with URLs and queries filled**.

`rights_status`: still only `needs_permission` | `unknown` | `no_asset`.

## Target (this retry, not a new fake COMPLETE)

- Search **all 2,838** retry-queue rows.
- Aim for **hundreds** of `VERIFIED_CANDIDATE` plus many `PENDING` that at least have an official page URL.
- After each 50-row shard, write 10-line notes: verified / pending-with-URL / pending-no-URL / queries-empty (queries-empty must be 0).
- Do **not** touch products 1–2500. Do **not** regenerate 1001–2500. Do **not** publish into `frontend/public/product-images/`.

Start with the first 50 rows of `retry-queue-branded-2501-7771.csv` now. Say `MANUS RETRY SHARD COMPLETE` and the path when those 50 are actually searched.
