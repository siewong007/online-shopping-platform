# RETIRED — DeepSeek V4 Flash — priority-300 first pass

**Retired 19 August 2026.** DeepSeek was too slow and never wrote a CSV. The job moved to Manus.

- Do **not** paste this into DeepSeek.
- Close the DeepSeek chat if it is still running.
- Paste instead: `docs/ai-prompts/manus-priority-300.md`
- Worklist: `catalogue/ai-inbox/manus-images/priority-300-worklist.csv`
- Output: `catalogue/ai-inbox/manus-images/priority-300-pass1.csv` (same header as below, so Gemini can still reverify later)

Historical prompt (do not run):

---

Ekoway Hardware (Sibu). You own **only** `online-shopping-platform/catalogue/image-sourcing/priority-300.csv` (300 SKUs). Manus owns 2501–7771. Gemini is re-checking 1–2500. Do not enter their ranges.

**Job:** for each of the 300 rows, find the **exact** official Malaysian product page + image. Accuracy over speed. Finish all 300 before stopping.

**Exact match** (fail the row if any named fact is wrong): brand, model code, suffix (RS/IP/kit), colour/finish (black ≠ white — Joven trap), size/voltage if named, UOM (PCS vs SET). MY official pages first (`*.com.my`). No Shopee/Lazada/Google Images.

**Never:** set rights to approved (`needs_permission` / `unknown` / `no_asset` only); deploy; edit storefront; copy into `frontend/public/product-images/`; redo 1001–2500.

**Write:**

`online-shopping-platform/catalogue/ai-inbox/deepseek-image-verify/priority-300-pass1.csv`

Header exactly:

`item_code,uom,display_name,category,official_product_page,official_image_url,match_confidence,finish_exact,model_exact,uom_assessment,rights_status,decision,reason,human_action`

- `match_confidence`: A (model+finish) · B (model only) · C (family) · R (reject)
- `finish_exact` / `model_exact`: yes | no | unresolved
- `decision`: candidate | pending | reject

Also `priority-300-pass1-notes.md` (counts A/B/C/R and colour-swap risks).

Say `DEEPSEEK BATCH COMPLETE` with paths.
