# Prompt — Manus — take over DeepSeek: priority-300 official images

DeepSeek is **retired** (too slow, empty inbox). Copy **everything below the line** into the **same Manus chat** that finished the 2501–7771 branded retry. Do not open DeepSeek.

---

STOP the 2501–7771 campaign. That retry is delivered. Do **not** write another COMPLETE.md for 7,771. Do **not** regenerate products 1001–2500. Do **not** touch `manus/P1-CAT-01_products_1001_2500_research_outputs/`.

You now own DeepSeek’s unfinished job: **first-pass official page + official image for the 300 highest-priority SKUs** (catalogue positions **1–300**). Gemini already second-reviewed the existing forensic files. You do **new image hunting** where Gemini left pending, and you **carry forward** the 40 rows Gemini already accepted.

## Why this is not a redo of 1–2500

Locked forensic files stay locked. You write a **new** CSV. You do not overwrite:

- `priority50_forensic_audit_input/ekoway_priority50_forensic_reviewed.csv`
- `priority50_forensic_audit_input/products_51_100_forensic/`
- `priority50_forensic_audit_input/products_101_1000_forensic/`
- `manus/P1-CAT-01_products_1001_2500_research_outputs/` (zip SHA-256 must remain `b90ce77adf6f9a849df22161540d8ca363af4db5fec0c48b1838eab715955f9d`)

## Worklist (already built — use this, not a fresh 7,771 scan)

`online-shopping-platform/catalogue/ai-inbox/manus-images/priority-300-worklist.csv`

300 rows. Column `action` is the job:

| action | rows | What you do |
|---|---:|---|
| `carry_forward` | 40 | Gemini `candidate` + `agree=yes` + model and finish exact. Re-open `hint_page` and `hint_image`. If both still live and still exact, copy them into the output. Do not spend a research hour. If the URL is dead, then search. |
| `search` | 258 | Gemini `pending`. Forensic often has a page and **no exact image**. Search. `hint_page` is a starting URL, not an answer. |
| `fix` | 2 | Gemini `agree=no`. Do **not** reuse the rejected asset. Find the correct official image. |

The two `fix` rows:

1. `SIN-SOR-SRTKS2431` — prior file used dealer `buildershardware.com.my`. Need **Sorento official** page/PDF crop, not a dealer photo.
2. `FAN-FLO-KHI-FF2005` — prior file used **white** `FF2005_WH.jpg` for a **black** floor fan. Need the black official image. White is reject.

## Exact-match bar (fail the row if any named fact is wrong)

Brand, model code, suffix (RS / IP / kit / P180 vs S-trap), colour/finish (black ≠ white — Joven trap), size/voltage if named, UOM (PCS vs SET). Malaysia first (`*.com.my`). Then official global OEM page, official PDF (crop that model only), authorised Malaysian distributor. **Never** Shopee, Lazada, Facebook, AliExpress, or Google Images as the image source.

`PENDING` is allowed only after you record the queries you ran. Empty page + empty image + no queries = not done.

## Do not do

- Do not set `rights_status` to approved. Only `needs_permission` / `unknown` / `no_asset`.
- Do not deploy, do not copy into `frontend/public/product-images/`.
- Do not invent prices or kit contents.
- Do not use a white photo for a black row, or a family hero for several SKUs.
- Do not work positions 301–7771 in this pass.

## Output

Shards of **50**, then one combined file. Same header DeepSeek was supposed to use:

`catalogue/ai-inbox/manus-images/priority-300-shard-0001-0050.csv`
… through …
`catalogue/ai-inbox/manus-images/priority-300-shard-0251-0300.csv`

Then concatenate to:

`catalogue/ai-inbox/manus-images/priority-300-pass1.csv`

Header **exactly**:

`item_code,uom,display_name,category,official_product_page,official_image_url,match_confidence,finish_exact,model_exact,uom_assessment,rights_status,decision,reason,human_action`

- `match_confidence`: A (model+finish) · B (model only) · C (family) · R (reject)
- `finish_exact` / `model_exact`: yes | no | unresolved
- `decision`: candidate | pending | reject
- `candidate` only if model **and** finish are `yes` and the image is from an official / authorised source (not marketplace, not dealer-only for the Sorento fix)

Also `priority-300-pass1-notes.md`: counts A/B/C/R, carry_forward / search / fix outcomes, every colour-swap risk.

## Start now

Do shard **0001–0050** first (worklist `source_position` 1–50). Say `MANUS PRIORITY-300 SHARD COMPLETE 0001-0050` with the file path. Grok will schema-check. Then continue until all 300 rows are in `priority-300-pass1.csv`.
