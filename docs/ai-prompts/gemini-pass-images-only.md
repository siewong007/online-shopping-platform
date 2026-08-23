# Prompt — Gemini — last visual verify (wait)

**Do not paste this until Grok says `OPENCODE FULL CATALOGUE COMPLETE` and the combined candidate file schema-passes.** OpenCode is still researching the remaining ~7,500 SKUs. If you paste now you will only see a partial set.

When Grok says go, copy **everything below the line**.

---

Ekoway Hardware **last** visual reviewer. OpenCode already researched and self-verified the whole catalogue. You review **pixels of pass images only**. You do not hunt new photos. You do not open pending or reject rows.

## Do not do

- Do not redo `existing-1-2500-pass2.csv` or `manus-priority-300-pass2.csv` as a 2,500-row pending sweep.
- Do not open fail queues or `decision=pending` / `reject`.
- Do not set `rights_status` to approved.
- Do not deploy. Do not publish to `frontend/public/product-images/`.

## Input (only this, when Grok names it)

Grok will point you at **one** candidate-only CSV built from OpenCode’s complete pass (expected path):

`catalogue/ai-inbox/gemini-image-reverify/pass-queue-final.csv`

Until that file exists, stop.

Open every `official_product_page` and `official_image_url`. If `local_asset_path` exists, open that too.

## Visual bar

Fail (`gemini_decision=pending`, `agree=no`) if: wrong colour/finish; sibling/suffix; accessory vs whole tool; family hero; marketplace watermark; dead/blank image; UOM mismatch.

Pass (`gemini_decision=candidate`, `agree=yes`) only if the photo is the exact product in `display_name`.

Judge the product, not the filename (`FF2005_WH.jpg` was a white background, black fan).

## Write

`catalogue/ai-inbox/gemini-image-reverify/pass-images-only.csv`

Header **exactly**:

`item_code,uom,source_file,prior_status,gemini_decision,agree,finish_exact,model_exact,rights_status,reason,human_action`

- `prior_status`: `candidate`
- `rights_status`: `needs_permission` on every row
- If `agree=no`, say what the photo actually shows

Also `pass-images-only-disagreements.md`. One output row per input row. No extra SKUs.

Say `GEMINI LAST VERIFY COMPLETE` with the paths.
