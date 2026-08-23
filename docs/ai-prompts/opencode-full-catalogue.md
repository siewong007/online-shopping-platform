# Prompt — OpenCode — full remaining catalogue (max quality + max speed)

Manus is **retired**. Gemini waits until you finish. Copy **everything below the line** into the **same OpenCode chat**. If you already pasted the older prompt, paste this **now** — it replaces the wave size and token rules.

---

You are OpenCode for Ekoway Hardware (永光五金, Salim, Sibu).

**Token cost is irrelevant. Context length is irrelevant. Do not economise.** Spend whatever it takes. Maximise **quality and speed together** — never trade accuracy for throughput, never trickle one SKU per turn to “save tokens”.

Job: **research + self-verify** until every catalogue row is an **exact official image** or a **documented fail** (full query log, no invented photo).

Catalogue: **7,771** listings (`catalogue/image-sourcing/product-image-manifest.csv`). Worklist:

`catalogue/ai-inbox/opencode-recover/remaining-all-worklist.csv`

| action | rows | What you do |
|---|---:|---|
| `skip_pass` | 213 | Live-check page+image **all in parallel**. Dead / missing image / not exact → `search`. Live and still exact → carry. |
| `search` | 5,193 | Full research + self-verify. Never thin-search. |
| `reopen` | 2,305 | Search **again** with extra query variants. Prior PENDING is a hint, not an answer. Copy prior fail **only after** the new parallel query set still finds nothing official. |
| `duplicate_listing` | 60 | Copy the earlier `item_code+uom` decision. |

Do **not** overwrite `recover-pass1.csv`, Job 1 verify CSV, priority-300, forensic 1–2500, or the 1001–2500 zip. Do not deploy. Do not copy into `frontend/public/product-images/`. Never set rights to approved (`needs_permission` / `unknown` / `no_asset` only).

## Ultra-accurate bar (candidate only if ALL are true)

1. Brand, model code, suffix, colour/finish, size/voltage if named, UOM — every named fact matches the catalogue **and** the page **and** the pixels.
2. Source is official MY, official OEM, official PDF crop of **that model only**, or authorised Malaysian distributor.
3. You opened the page **and** the image this sitting (local hash OK if CDN expired).
4. `model_exact=yes` **and** `finish_exact=yes`.
5. Not Shopee / Lazada / Facebook / AliExpress / Google Images / random dealer when an OEM page exists.
6. Not family hero, sibling SKU, accessory-vs-tool, or colour swap.
7. You can quote the model string from the page HTML/PDF, not from a filename guess.

Wrong photo is worse than no photo. `PENDING` only after the full query set is recorded. Empty page + empty image + no queries = **not done**.

## Max speed (mandatory)

**Fill every turn with the maximum number of parallel tool calls the harness will accept.** If a turn has fewer than ~20 tool calls while SKUs remain, you are too slow.

- **Never one SKU per turn. Never sequential search-then-wait-then-search for independent SKUs.**
- If you can spawn subagents / child sessions / parallel workers, do it: **4 workers × 50 SKUs** (or more). Each worker owns a disjoint shard. Do not overlap `item_code+uom`.
- Shard size: **100** rows (not 50), so you write less often.
- Inside a shard: waves of **25 SKUs** (or the harness max if smaller).
- Per SKU, fire **these searches in the same turn** (do not wait between them):
  1. `"{brand}" "{model}" site:.com.my`
  2. `"{model}" "{brand}" official`
  3. `"{model}" filetype:pdf`
  4. `"{model}" site:leeden.com.my OR site:theleedenstore.com.my`
  5. `"{brand}" "{model}" distributor Malaysia`
  6. `"{model}" authorised dealer`
- Then, **same or next turn, still parallel**: open every official hit (MY page, OEM page, PDF, distributor). Fetch every candidate image. Read the page for model/finish/UOM. Do not mark candidate from a SERP snippet.
- Job 0: live-check **all 213** URLs in as few turns as possible (batches of 50 GETs, not 1).
- Independent fetches never queue behind each other.
- Do not write long essays in chat. Write the CSV. Chat only the completion line + shard counts.

## Max quality (mandatory — extra work is required, tokens are free)

For every `search` / `reopen` row:

- Parse brand + longest model token from `item_code` **and** `display_name`. Item-code groups: `BOS` Bosch, `CAB` Cabana, `SAN` Saniware, `KHI` Khind, `JOV` Joven, `DC`/`DONG` Dongcheng, `MID` Midea, `NIP` Nippon, `PAN` Panasonic, `STA` Stanley, `SIK` Sika, `KDK` KDK, `RUB` Rubine, `SOR` Sorento.
- After `.com.my` product page: official global OEM, official PDF (crop **that** model), authorised MY distributor. Do not stop at “no .com.my PDP”.
- Colour in the name and photo is the other colour → `PENDING` + keep page + `colour_unproven`. Never ship the wrong colour.
- SET vs PCS: a set photo cannot be one piece; a piece photo cannot be the kit.
- Sibling trap: if the page SKU differs by one letter/suffix (RS, IP, BL, WH, RG, kit), it is **not** a match.
- Generic unbranded screw/bolt/sandpaper: still run the full query set. If nothing official → `PENDING` / `generic_unbranded` with queries. Never steal a sibling pack photo.
- `reopen` rows: run the **new** query set even if Manus/OpenCode already said pending. Prior reason is a starting hint. Especially retry Dongcheng opaque IDs, official PDFs, and authorised distributors — that is how recover-pass1 gained candidates.
- Before `candidate`: confirm model string on the page, finish, live image, source tier. If any check is weak, keep `PENDING` with the URL.

## Output

### Job 0 — live-check (first)

Input: `catalogue/ai-inbox/opencode-verify/already-pass-livecheck.csv` (213)

Write: `catalogue/ai-inbox/opencode-verify/already-pass-livecheck-verified.csv`

Header:

`source_position,item_code,uom,display_name,prior_status,opencode_decision,finish_exact,model_exact,url_live,source_ok,official_product_page,official_image_url,local_asset_path,rights_status,reason,human_action`

`pass` | `fail`. Fails join `search`. Say `OPENCODE LIVECHECK COMPLETE`.

### Research shards (100 rows)

Walk worklist file order, `action=search` first, then `action=reopen`, plus livecheck fails.

`catalogue/ai-inbox/opencode-recover/full-shard-0001-0100.csv`

then `full-shard-0101-0200.csv`, … until every remaining unique key has a line.

Header **exactly**:

`item_code,uom,display_name,category,official_product_page,official_image_url,match_confidence,finish_exact,model_exact,uom_assessment,rights_status,decision,reason,human_action`

- `match_confidence`: A (model+finish) · B (model only) · C (family) · R (reject)
- `decision`: `candidate` | `pending` | `reject`
- `candidate` only if the ultra-accurate bar passes
- `reason` must list **all** queries and pages opened (tokens are free — do not truncate)

After each shard: candidate / pending-with-URL / pending-no-URL / queries-empty (**must be 0**) / parallel tool-call count this shard.

Assets: `catalogue/ai-inbox/opencode-recover/assets/{source_position}.{ext}`

Say `OPENCODE FULL SHARD COMPLETE NNNN-MMMM`.

If workers run in parallel, each worker writes its own shard file and says the completion line. No two workers write the same range.

### Coverage (required for COMPLETE)

`catalogue/ai-inbox/opencode-recover/coverage-index.csv` — **7,771** rows, worklist order:

`source_position,item_code,uom,action,decision,official_product_page,official_image_url,match_confidence,rights_status,reason`

Then:

`catalogue/ai-inbox/opencode-recover/remaining-all-pass1.csv`

When coverage is 7,771/7,771 and queries-empty is 0:

`OPENCODE FULL CATALOGUE COMPLETE`

Grok schema-checks. **Only then** Gemini reviews `decision=candidate` pixels. Never send pending/reject to Gemini.

## Start now

Job 0: 213 live-checks in parallel batches of 50. Then start **two shards at once** if you can (`0001-0100` and `0101-0200`). Maximum parallel tool calls every turn. Maximum exact-match strictness every row.
