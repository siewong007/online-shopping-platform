# Prompt — Manus — full-catalogue deep image identification

**Campaign closed 19 August 2026** (pass 1 + branded retry delivered). Do not paste this again.

Next Manus paste: `docs/ai-prompts/manus-priority-300.md` (DeepSeek’s retired job).

Historical prompt below.

---

You are Manus doing **deep product identification and official-image finding** for Ekoway Hardware, a real Malaysian hardware shop in Salim, Sibu (永光五金).

**Parallel run (historical):** DeepSeek was doing `priority-300.csv` — that job is now yours via `manus-priority-300.md`. Gemini re-checked forensic files for products 1–2500. You do **not** wait for them.

**Your exclusive range:** catalogue positions **2501–7771** (everything after the finished 1001–2500 package), plus a **coverage index** for all 7,771 keys. Reuse 1–2500 only to mark them covered. **Do not redo 1–2500 research.**

Goal: for **every remaining row in your range**, identify the **exact physical product** and, where it exists, the **official manufacturer or authorised-distributor image**. Highest accuracy. No time limit. Do not guess. Do not stop early.

## What “exact” means (fail the row if any of these is wrong)

You must match **all** of these when the catalogue names them:

1. **Manufacturer / brand** (Bosch ≠ Dongcheng ≠ generic).
2. **Model code** including letters, hyphens, and regional SKU (SL30iP ≠ SL30E; SA20e ≠ SA8e).
3. **Package / suffix** (RS, IP, kit contents, trap type P180 vs S-trap).
4. **Finish / colour** (black ≠ white; gold ≠ rose gold). **Never** use a white photo for a black row. The Joven SL30iP black/white split is the known trap.
5. **Size / capacity / voltage** when present (3.6kW vs other; 540×440 sink vs sibling).
6. **UOM** (PCS vs SET vs GROSS). A SET photo must be the set, not one piece.
7. **Malaysia market** first. Prefer `*.com.my` and official MY pages over EU/US twins.

If you cannot prove the match, mark it **pending** or **reject**. A wrong image is worse than no image.

## Do not do

- **Do not regenerate products 1001–2500.** That research is finished. Zip SHA-256 must remain `b90ce77adf6f9a849df22161540d8ca363af4db5fec0c48b1838eab715955f9d` at `manus/P1-CAT-01_products_1001_2500_research_outputs/P1-CAT-01_products_1001_2500_research_outputs.zip`. If the zip is missing, **stop and report**. Do not invent a replacement.
- Do not treat Google Images, Shopee, Lazada, Facebook, or AliExpress as official.
- Do not reuse one family photo across several SKUs unless you prove it is the same exact model **and** finish.
- Do not set `rights_status` to approved. The owner is **not** waiting on permission emails. You still record the truth: `needs_permission` / `unknown` / `no_asset`. Finding the file is not a legal grant.
- Do not enable website buying, deploy, or copy files into `frontend/public/product-images/`.
- Do not invent prices, stock, wattage, or kit contents. If the catalogue omits a spec, leave it blank.

## Sources of truth (read first)

1. `online-shopping-platform/catalogue/image-sourcing/product-image-manifest.csv` — **7,771** rows. This is the full worklist (`item_code`, `uom`, `display_name`, `category`, `stock_qty`, `price_myr`).
2. Already done — **reuse, do not redo**:
   - Priority 1–50: `priority50_forensic_audit_input/ekoway_priority50_forensic_reviewed.csv`
   - 51–100 and 101–1000 forensic folders under `priority50_forensic_audit_input/`
   - 1001–2500: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv` (1,500 rows)
3. Method sample (copy these columns): `priority50_forensic_audit_input/ekoway_priority50_forensic_reviewed.csv`
4. Pilot notes: `online-shopping-platform/catalogue/image-sourcing/official-source-pilot.csv` and `priority-300.csv`

Skip a row only if it already has a **VERIFIED** / A-level exact match **and** an official image URL in those files. Re-open it if finish or UOM was unresolved.

## Work order (no time cap)

1. Build a coverage index: which of the 7,771 `item_code+uom` keys already have a deep forensic row. Write it to `catalogue/ai-inbox/manus-images/coverage-index.csv`. Mark 1–2500 as `covered_existing` — do not re-research them.
2. Research **every uncovered row in 2501–7771**. Skip `priority-300.csv` (DeepSeek’s job) unless a row is also in 2501+ and still uncovered.
3. For each row, search in this order:
   - Official Malaysian product page
   - Official MY category / series page
   - Official catalogue PDF (crop must be that model only)
   - Authorised Malaysian distributor page
   - Stop. Do not fall back to marketplaces.
4. Save evidence: official page URL, image URL, SHA-256 of the downloaded bytes if you store a file, resolution, and a one-line reason.
5. Write shards of **100 SKUs** so a crash does not lose the week. Name them `shard-NNNN-MMMM-reviewed.csv`.
6. After each shard, write `shard-NNNN-MMMM-notes.md` with counts: exact / pending / reject / no_asset, and every colour-swap risk.
7. Continue until the coverage index is 7,771/7,771. Then write `COMPLETE.md`.

## Output columns (every shard, same order as the priority-50 forensic file if possible)

Minimum required if you must shorten:

`item_code,uom,display_name,category,manufacturer,brand,forensic_model,manufacturer_part_number,model_exact,suffix_exact,finish_exact,size_capacity_exact,configuration_exact,uom_assessment,official_malaysia_page,primary_image_url,primary_image_source,primary_image_sha256,identity_confidence,image_confidence,rights_status,first_pass_status,human_action,reason`

Use:

- `model_exact` / `finish_exact` / `suffix_exact`: `yes` | `no` | `unresolved`
- `identity_confidence` / `image_confidence`: 0–100 integers
- `rights_status`: `needs_permission` | `unknown` | `no_asset` only
- `first_pass_status`: `VERIFIED_CANDIDATE` | `PENDING` | `REJECT`

A row may be `VERIFIED_CANDIDATE` only if model **and** finish are `yes` and the image is from an official MY source.

## Quality bar

- Prefer one extra hour of checking over a wrong photo.
- If two official images disagree, keep `PENDING` and describe the conflict.
- If the catalogue name is too vague to uniquely identify (example: “Joven Instant Water Heater” with no model), do not pick the hero of the series. Mark `PENDING` and `human_action` = photograph the carton label in store.

## When a shard is done

Say: `MANUS SHARD COMPLETE NNNN-MMMM` and the file paths. Do not start publishing. Grok will schema-check; Gemini may reverify.

When the whole catalogue is done, say: `MANUS FULL CATALOGUE IMAGE PASS COMPLETE`.
