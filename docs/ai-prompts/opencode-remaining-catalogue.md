# Prompt — OpenCode — remaining catalogue (SUPERSEDED)

**Do not paste this.** Replaced by `opencode-full-catalogue.md` (Manus retired; OpenCode owns all 7,771; Gemini last). Historical text below.

---

Job 1 (22-row verify) and Job 2 (`recover-pass1.csv`) are **done**. Copy **everything below the line** into the **same OpenCode chat**.

Grok confirms: Manus `retry-pass2/shard-2559-2608.csv` **has landed**. You may work 2559+ now. Do not wait for more Manus shards — you now own the rest of the branded queue.

---

ACCURACY PASS COMPLETE on `recover-pass1.csv` is accepted: **328 rows · 121 candidate / 175 pending / 32 reject**. Do **not** overwrite that file. Do **not** re-research those 121 candidates. Do **not** retry the 175 pending / 32 reject in this sitting unless you now have a new official URL (owner/dealer/PDF) that you did not have before.

Gemini (separate chat) is reviewing **only** the 141 pass images already queued (`20` Job-1 pass + `121` recover candidates). You do **not** send Gemini pending rows.

## Do not touch (locked)

- Do not overwrite `catalogue/ai-inbox/opencode-recover/recover-pass1.csv` or its 7 shards.
- Do not overwrite `catalogue/ai-inbox/opencode-verify/pass-queue-unreviewed-2501-plus-verified.csv`.
- Do not overwrite `priority-300-pass1.csv`, forensic 1–2500, or the 1001–2500 zip.
- Do not overwrite Gemini closed files or `pass-queue-waiting.csv`.
- Skip every `item_code+uom` in `catalogue/image-sourcing/dual-agreed-candidate-queue.csv` (85) and every Job-1 `opencode_decision=pass` row.
- Do not deploy. Do not copy into `frontend/public/product-images/`. Do not set rights to approved.

## Goal

Find an **exact official/authorised image** for every remaining branded SKU that still has none. Accuracy over speed. A wrong photo is worse than no photo.

Exact-match bar (fail if any named fact is wrong): brand, model code, suffix, colour/finish, size/voltage if named, UOM. Malaysia first. Never Shopee / Lazada / Facebook / AliExpress / Google Images as the image source.

`PENDING` only after queries are recorded. Empty page + empty image + no queries = not done.

## Work order (do not skip)

### Job 3 — verify Manus shard 2559–2608 candidates (4 rows, first)

Input:

`catalogue/ai-inbox/opencode-verify/manus-shard-2559-2608-pass-queue.csv`

Open every page, image, and `local_asset_path`. Same pass/fail bar as Job 1.

Write:

`catalogue/ai-inbox/opencode-verify/manus-shard-2559-2608-verified.csv`

Same header as Job 1:

`source_position,item_code,uom,display_name,prior_status,opencode_decision,finish_exact,model_exact,url_live,source_ok,official_product_page,official_image_url,local_asset_path,rights_status,reason,human_action`

`pass` only if model **and** finish are `yes` and the image is official/authorised. Fails go into Job 4 (find the correct image).

Say `OPENCODE VERIFY COMPLETE 2559-2608`.

### Job 4 — deep-research that shard’s Manus fails (46 rows)

Input:

`catalogue/ai-inbox/opencode-recover/fail-queue-manus-2559-2608.csv`

Same deep-research method as Job 2 (parse item code, official MY, OEM, PDF crop, authorised MY distributor). Do not reuse a Manus pending as if it were finished.

Write:

`catalogue/ai-inbox/opencode-recover/recover-pass2-manus-2559-2608.csv`

Header **exactly** (same as recover-pass1):

`item_code,uom,display_name,category,official_product_page,official_image_url,match_confidence,finish_exact,model_exact,uom_assessment,rights_status,decision,reason,human_action`

`candidate` only if model **and** finish are `yes` and `official_image_url` is live official/authorised. Notes: 10 lines, queries-empty = 0.

Say `OPENCODE RECOVER COMPLETE 2559-2608`.

### Job 5 — remaining branded catalogue (the rest of the photos)

Input:

`catalogue/ai-inbox/opencode-recover/remaining-branded-2613-plus.csv`

**2,728** branded/model-token rows, source_position **2613–7769**. Manus has **not** searched these. You investigate **and** verify in one pass. Do not wait for Manus.

Shards of **50**, worklist order:

`catalogue/ai-inbox/opencode-recover/remaining-shard-2613-2662.csv`

then `remaining-shard-2663-2712.csv`, and so on, until 2,728 are done. Then concatenate to:

`catalogue/ai-inbox/opencode-recover/remaining-branded-pass1.csv`

Same recover-pass1 header. Same candidate bar. After each shard: verified / pending-with-URL / pending-no-URL / queries-empty (must be 0).

If you store a file: `catalogue/ai-inbox/opencode-recover/assets/{source_position}.{ext}`.

Generic screws/bolts **not** in this CSV stay out until this branded file is finished.

Say `OPENCODE REMAINING SHARD COMPLETE NNNN-MMMM` after each 50. When the 2,728 are done: `OPENCODE REMAINING BRANDED COMPLETE`.

## What Gemini may see

Only new `decision=candidate` / `opencode_decision=pass` rows from Jobs 3–5. Grok will append them. You never send pending or reject.

## Start now

Job 3 (4 rows), then Job 4 (46 rows), then Job 5 first 50 (`source_position` 2613 upward). Accuracy first.
