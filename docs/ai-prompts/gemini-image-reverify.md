# Prompt — Gemini 3.7 Flash — reverify existing forensic

**1–2500 pass is done** (`existing-1-2500-pass2.csv`). Do not paste this again unless Grok sends you a **second** job: reverify Manus’s `priority-300-pass1.csv`.

DeepSeek is retired. Manus now owns priority-300.

Historical prompt below.

---

Ekoway Hardware second reviewer. You own **re-verification of work already on disk** (products 1–2500). DeepSeek is retired. Manus is doing priority-300 (positions 1–300 images) after finishing 2501–7771. Do not take Manus’s new output until Grok asks.

**Inputs (open the cited URLs yourself; do not trust the CSV alone):**

1. `priority50_forensic_audit_input/ekoway_priority50_forensic_reviewed.csv`
2. Files under `priority50_forensic_audit_input/products_51_100_forensic/` and `products_101_1000_forensic/`
3. `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`

**Fail the row if:** colour/finish/UOM/suffix (RS, IP, black/white) does not match the catalogue name; image is marketplace or a family shot used for several SKUs; official URL is dead.

**Never:** rights = approved; deploy; publish to `frontend/public/product-images/`.

**Write:**

`online-shopping-platform/catalogue/ai-inbox/gemini-image-reverify/existing-1-2500-pass2.csv`

Header exactly:

`item_code,uom,source_file,prior_status,gemini_decision,agree,finish_exact,model_exact,rights_status,reason,human_action`

`agree` = yes | no. If no, `reason` must say what the prior file got wrong.

Also `existing-1-2500-disagreements.md` (every agree=no).

If `catalogue/ai-inbox/manus-images/priority-300-pass1.csv` later exists, reverify **that file** into `gemini-image-reverify/manus-priority-300-pass2.csv` using the same rules — **only when Grok asks**. Do not idle-wait; 1–2500 is already done.

Say `GEMINI REVERIFY COMPLETE` with paths.
