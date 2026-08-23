# Prompt — Gemini — reverify Manus priority-300

**Done 20 August 2026** (`catalogue/ai-inbox/gemini-image-reverify/manus-priority-300-pass2.csv`). Do not paste this again.

Historical prompt below.

1–2500 forensic reverify is **already done**. Do not redo it. Copy **everything below the line** into Gemini.

---

Ekoway Hardware second reviewer. Manus finished DeepSeek’s old job: official page + image for catalogue positions **1–300**. You reverify **that file only**. Do not touch 301–7771. Do not overwrite `existing-1-2500-pass2.csv`.

**Input (open every cited URL yourself):**

`online-shopping-platform/catalogue/ai-inbox/manus-images/priority-300-pass1.csv`

300 rows. Manus claims: **40 candidate**, **260 pending**, **0 reject**. Rights are `needs_permission` on every row — keep it that way.

**Fail a Manus `candidate` if any of these is true:** colour/finish/UOM/suffix does not match the catalogue name; image is marketplace, dealer-only, family hero, or sibling SKU; official URL is dead; `finish_exact` or `model_exact` is not `yes`.

## Priority rows (check these first)

Manus **changed** Gemini’s earlier call on these. Open the image. Do not trust the filename or Manus’s reason.

1. `FAN-FLO-KHI-FF2005` — you previously failed `FF2005_WH.jpg` as a **white** photo of a **black** fan. Manus now says the same `_WH` asset is visually black and marked `candidate`. Confirm or keep `agree=no`.
2. `JOV-WAT-HEA-SL30IP-BLK` — you had this pending (no black image). Manus found `sl30ip_black_2026_1.jpg`. Confirm it is the **non-RS black** unit, not white, not RS.
3. `FAN-STA-KHI-SF1682` — new candidate from search. Confirm 16-inch SF1682SE, Winter Grey, not a sibling.
4. `SIN-SOR-SRTKS2431` — you failed a dealer photo. Manus kept this **pending** (no official image). `agree` should be **yes** if still pending with no dealer image reused.

Also re-open every other Manus `decision=candidate` (40 total). For `pending` rows, spot-check is enough: `agree=yes` if Manus correctly failed closed; `agree=no` only if Manus missed an obvious live official exact image you can cite.

**Never:** rights = approved; deploy; publish to `frontend/public/product-images/`.

**Write:**

`online-shopping-platform/catalogue/ai-inbox/gemini-image-reverify/manus-priority-300-pass2.csv`

Header exactly:

`item_code,uom,deepseek_decision,gemini_decision,agree,finish_exact,model_exact,rights_status,reason,human_action`

Use Manus’s `decision` as `deepseek_decision` (same three values: candidate | pending | reject). `agree` = yes | no. If no, `reason` must say what Manus got wrong.

Also `manus-priority-300-disagreements.md` (every agree=no).

Say `GEMINI MANUS PRIORITY-300 REVERIFY COMPLETE` with paths.
