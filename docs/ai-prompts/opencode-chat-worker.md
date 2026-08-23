# Prompt — OpenCode worker chat (chats 02–09)

Open a **new** OpenCode chat per block. Paste the **assignment line** for that chat first, then everything below the line. Do not paste two assignment lines into one chat.

```
CHAT 02 — assignment catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-02.csv — ordinals 841-1680 — start tier 1
CHAT 03 — assignment catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-03.csv — ordinals 1681-2520 — start tier 1
CHAT 04 — assignment catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-04.csv — ordinals 2521-3360 — start tier 1
CHAT 05 — assignment catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-05.csv — ordinals 3361-4200 — start tier 1
CHAT 06 — assignment catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-06.csv — ordinals 4201-5040 — start tier 1
CHAT 07 — assignment catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-07.csv — ordinals 5041-5880 — start tier 1 for action=search, tier 2 for action=reopen
CHAT 08 — assignment catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-08.csv — ordinals 5881-6720 — start tier 2
CHAT 09 — assignment catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-09.csv — ordinals 6721-7558 — start tier 2
```

---

You are one of nine parallel OpenCode workers for Ekoway Hardware (永光五金, Salim, Sibu). Your chat number and assignment file are in the line above.

**Token cost is irrelevant. Context length is irrelevant.** Never trade accuracy for throughput, never trickle one SKU per turn to save tokens. Maximum parallel tool calls, every turn.

## Your lane

Your assignment CSV is your **entire** world. It holds every column you need, already joined: ordinal, source_position, item_code, uom, display_name, category, detected_brand, detected_model, action, prior_* fields from the last sitting, and the current ledger state.

Do not read other chats' assignment files. Do not process a row that is not in yours. Never process by "whatever looks unfinished" — go by your file.

### Write isolation — hard rule

Write **only** inside `catalogue/ai-inbox/opencode-recover/loop-state/chat-NN/` (your own number). Nine chats are running at once; a write outside your folder corrupts another worker's state.

Never write, never edit: `loop-state/loop-ledger.csv`, `loop-state/gate.py`, any other `loop-state/*.py`, `round-01/`, `round-02/`, `recover-pass1.csv`, `already-pass-livecheck-verified.csv`, `pass-queue-unreviewed-2501-plus-verified.csv`, priority-300, the forensic 1–2500 set. Import `gate.py`, run it, **do not modify it** — if you believe it is wrong, say so in your round report and carry on; chat 01 owns it.

Shared but safe: `assets/{source_position}.{ext}` (only for your own rows) and `pagecache/` (keyed by URL hash — reuse aggressively, never re-fetch an unchanged page).

Do not deploy. Do not write into `frontend/public/product-images/`. Do not edit `backend/` or `frontend/`. Rights stay `needs_permission` / `unknown` / `no_asset` — never `approved`.

## The loop

Round: research the open rows in your block → an **independent** worker blind-verifies → run `gate.py` → survivors go terminal, rejects return to open at **tier+1**. Repeat until your block has no open rows.

Terminal means exactly one of:

- **`verified_pass`** — the bar below holds, a blind verifier agreed, `gate.py` is green.
- **`exhausted`** — every tier through 5 was run and logged, with the full query list and every page opened.

Stop early only if a full round produces **zero** transitions in your block: mark those `exhausted_no_progress` and report.

Some rows genuinely have no official image — unbranded screws, discontinued opaque IDs, house-label goods. `exhausted` with a real owner action is the correct, expected outcome for those. Inventing a photo is the worst possible outcome.

## Ultra-accurate bar (candidate only if ALL are true)

1. Brand, model code, suffix, colour/finish, size/voltage if named, UOM — every named fact matches the catalogue **and** the page **and** the pixels.
2. Source is official MY, official global OEM, an official PDF cropped to **that model only**, or an authorised Malaysian distributor.
3. You opened the page **and** fetched the image bytes this round.
4. `model_exact=yes` **and** `finish_exact=yes`.
5. Not Shopee / Lazada / Facebook / AliExpress / Google Images when an OEM page exists.
6. Not a family hero, sibling SKU, accessory-vs-tool, or colour swap.
7. You can quote the model string from the page HTML or PDF text — never inferred from a filename.
8. Usable: long edge ≥ 800 px preferred, ≥ 500 px minimum, real image content-type, ≥ 20 KB. 500–799 px passes tagged `low_res`.

## Strategy tiers — escalate, never repeat

**Tier 1 — official direct.** All six per SKU in one turn:
`"{brand}" "{model}" site:.com.my` · `"{model}" "{brand}" official` · `"{model}" filetype:pdf` · `"{model}" site:leeden.com.my OR site:theleedenstore.com.my` · `"{brand}" "{model}" distributor Malaysia` · `"{model}" authorised dealer`

**Tier 2 — model-string normalisation.** Strip and re-insert separators (`2608-619-701` / `2608619701` / `2 608 619 701`), zero-pad, split suffixes (`-RS`, `-IP`, `-BL`, `-WH`, `-RG`), expand abbreviations in `display_name`, search the OEM's own part lookup. Prefixes: `BOS` Bosch, `CAB` Cabana, `SAN` Saniware, `KHI` Khind, `JOV` Joven, `DC`/`DONG` Dongcheng, `MID` Midea, `NIP` Nippon, `PAN` Panasonic, `STA` Stanley, `SIK` Sika, `KDK` KDK, `RUB` Rubine, `SOR` Sorento.

**Tier 3 — language and region.** Chinese and Malay product names (东成 Dongcheng, 博世 Bosch). Regional OEM domains `.sg` `.id` `.cn` `.com` `.com.tw` when `.com.my` has no PDP. Same model code only — a regional *variant* model is not a match.

**Tier 4 — documents and archives.** Official catalogue PDFs and spec sheets cropped to that model. Distributor B2B catalogues. `web.archive.org` snapshots of dead PDPs and dead image URLs. Derive the true model from a family spec table, then re-run tier 1 with the corrected model.

**Tier 5 — owner action.** `exhausted`, with `human_action` naming the concrete step: which supplier to email, which distributor holds the line, or "shoot in-store". Cross-reference `catalogue/image-sourcing/supplier-permission-contacts.csv`.

Your `ledger_tiers_tried` column tells you what a row has already consumed. Never re-run a consumed tier.

Rounds 1–2 of the single-chat sitting researched about 820 rows, and roughly 150 of them landed in blocks that are now someone else's. Chat 01 publishes `loop-state/chat-assignments/prior-work.csv` (item_code, uom, tiers consumed, prior decision, prior page, prior image, prior reason) before workers start. **Read it once at startup and join it to your block** — for any row it covers, start at the next unconsumed tier instead of tier 1. If the file is missing, ask the owner rather than redoing tier 1 blind.

## Blind verification

The verifier must be a **different** worker than the researcher, and must not see the researcher's `reason`, `match_confidence`, or `decision`. Give it only `item_code, uom, display_name, category, official_product_page, official_image_url`. It opens the page, fetches the image, returns its own `verifier_verdict` (`pass`/`fail`), `finish_exact`, `model_exact`, and a one-line justification.

- candidate + pass → gate it.
- Any disagreement → back to open at tier+1. Never resolve a disagreement by letting the researcher argue.
- Researcher `pending` → stays open, no verifier needed.

**Round 1 lesson: the blind verifier passed 29 Megaman `wp-content/uploads` images that were the same family hero reused across a dozen SKUs.** The gate caught them on hash collision. If several SKUs in your block resolve to the same image URL or the same bytes, that is a family hero — fail all of them and escalate a tier.

## Gate, and the two defects that ate round 1

Run `gate.py` at the end of every round. It decides, not you.

Round 1 converted 820 researched rows into **zero** verified passes. Two causes, both avoidable:

1. **`red:schema` killed rows that were otherwise green.** A row with a correct image still fails if `reason` is empty, the query log is empty, a required column is missing, or `item_code+uom` is duplicated in your file. Fill every column, log every query and every page opened, append rather than replace. Never truncate `reason` — tokens are free.
2. **Family heroes.** See above. Check every downloaded asset's SHA-256 against the others in your block before you call anything a candidate.

Parse every CSV with a **real CSV reader**. These files contain quoted fields with embedded commas; splitting on `,` corrupts roughly 140 rows and silently mis-assigns the `action` column.

## Saturation — keep every agent slot full at all times (mandatory)

**The rule: while a single row anywhere in the catalogue is still open, no sub-worker of yours is idle.** Not between waves, not between phases, not between rounds, not in the tail, not while you are writing a CSV. Anything below that is a defect, and you report it.

**Find the ceiling and hold it.** Do not use a fixed worker count. Ramp sub-workers up until the harness refuses to spawn more, then run at that ceiling permanently. When one finishes, spawn its replacement in the **same** turn you collect its result — never collect now and refill later. Re-probe the ceiling each round; if it rose, take the extra slots.

The four things that silently idle agents — all four are banned:

- **No wave barrier.** Do not run "waves of 25" where everyone waits for the slowest SKU. Keep a queue and refill continuously: the instant a sub-worker returns, hand it the next 25 rows off the queue. A worker must never wait for a sibling.
- **No phase barrier.** Do not research the whole block, then verify the whole block. Blind verification starts as soon as the first candidates exist and runs **concurrently** with research on later rows. Researchers and verifiers are live at the same time, always.
- **No round barrier.** `gate.py` runs on completed batches while research continues on the rest. Never park every worker to wait for a gate run or a ledger write.
- **No tail collapse.** When your block is nearly done, **shrink the slice, not the worker count.** Forty rows left and eight slots free means five rows each, not one worker doing forty. This is the single biggest idle sink — the tail is where a nine-chat run loses its hours.

**Never block on a stalled row.** Bot-walls (Dongcheng, Saniware), slow PDFs, CDN timeouts — park the row with what you have, return it to the queue at tier+1, and pull the next one immediately. A worker waiting on one hostile host while rows remain unclaimed is the same defect as an idle worker.

Also: maximum parallel tool calls every turn (fewer than ~20 while SKUs remain is too slow), never one SKU per turn, never sequential search-wait-search for independent SKUs, all six tier queries per SKU in one turn, HTTP fetches in batches of 40–50.

## Work-stealing — never go idle just because *your* block is done

Blocks are not equally hard. Chats 02–06 hold `search` rows; chats 08–09 hold `reopen` rows that already failed once and will take far longer. A finished chat sitting idle while another has 600 rows left wastes the whole point of running nine.

`loop-state/chat-assignments/slices.csv` cuts all 7,674 rows into **156 slices of 50**, each with a `slice_id` and a `home_chat`. Claim through the filesystem — no coordinator round-trip needed:

1. **Claim before working.** Create `chat-assignments/claims/{slice_id}.claim` with **exclusive create** (`open(path,'x')`, `O_EXCL`). Write `chat=NN, utc=<timestamp>, status=working`. If the create fails, another chat owns it — move on without retrying.
2. **Heartbeat.** Rewrite your claim file every ~15 minutes while you hold it.
3. **Release.** On completion write `claims/{slice_id}.done` containing your chat number and the row count.
4. **Take your own block first**, in order.
5. **When your home slices are all claimed or done, steal.** Scan `slices.csv` for slices with no `.claim` and no `.done`, and take them **starting from the highest `home_chat` number** — chats 08–09 lag, so that is where help is worth most. Work stolen slices exactly as your own; write the output into **your** `loop-state/chat-NN/` folder as `stolen-{slice_id}.csv`, never into the other chat's folder.
6. **Stale claims are reclaimable.** A `.claim` older than 45 minutes with no `.done` means that chat died. Take it: write `claims/{slice_id}.takeover-NN` alongside, then proceed. Note every takeover in your round report.

**Never finish idle.** `CHAT NN BLOCK COMPLETE` does not mean stop — it means your home block is done. Keep stealing until no unclaimed slice exists anywhere. Only then report `CHAT NN DRAINED` and stop.

## When the provider fails — the real ceiling is availability, not ambition

The single-chat sitting lost roughly two hours to this: 6 of 22 sub-worker spawns died on `Provider finish_reason: network_error`, `Endpoint is unavailable`, and `Service Unavailable`, and the chat burned the rest of its run retrying two of them back-to-back with no backoff.

- **A spawn failure is not a research failure.** Never mark a row `pending`, `reject`, or `exhausted` because a sub-worker died. Requeue the slice unchanged.
- **Back off, don't hammer.** Retry a failed spawn after 30s, then 2 min, then 5 min. Three consecutive failures on the same slice means release the claim (delete your `.claim`), put it back in the pool, and take different work. Never retry the same failing spawn more than three times in a row.
- **A failing spawn must never idle the fleet.** While a retry is backing off, those slots go to other slices. Do not sit and wait — that is what cost the last run its evening.
- **Report it.** Put `spawn failures: N, backoff minutes lost: M` in your round report. If failures exceed ~25% of spawns, say so plainly and drop your ceiling by a third — the provider is saturated and more concurrency makes it worse, not better.

Nine chats each running eight sub-workers is 72 concurrent calls. If the fleet is on a free or preview model, that ceiling is not reachable — find the real one by ramping and watching the error rate, and hold below it.

## Your outputs — all inside `loop-state/chat-NN/`

- `shard-<ordlo>-<ordhi>.csv` — researcher output
- `verify-<ordlo>-<ordhi>.csv` — blind verifier output
- `hashes.csv` — `source_position,item_code,uom,official_image_url,image_sha256,image_px_w,image_px_h,image_bytes` for **every** image you fetch, pass or fail. Chat 01 needs this for the global collision pass.
- `chat-NN-ledger.csv` — your 840 rows (chat 09: 838), **exactly** this 27-column header:

`source_position,item_code,uom,display_name,category,detected_brand,detected_model,state,round_first_seen,round_last_touched,tiers_tried,official_product_page,official_image_url,image_px_w,image_px_h,image_bytes,image_sha256,match_confidence,finish_exact,model_exact,uom_assessment,rights_status,researcher_decision,verifier_verdict,machine_gate,reason,human_action`

- `ROUND-REPORT.md` — append one block per round:

```
CHAT NN ROUND R COMPLETE
open_at_start / verified_pass_new / exhausted_new / still_open
gate reds by code
transitions this round (must be > 0)
tiers consumed
sub-worker ceiling / sustained concurrency / peak
slices: home claimed N, stolen N, takeovers N, unclaimed remaining N
idle-slot minutes this round (target 0 — anything above 0 needs a one-line cause)
parallel tool calls
```

`idle-slot minutes` is not decoration. If it is above zero while rows were open anywhere, say why in one line and fix it next round.

Keep chat output to the report block. Write the CSVs, not essays.

## Finish

When your home block has no open rows, confirm `chat-NN-ledger.csv` has exactly your assigned row count and no duplicate `item_code+uom`, then say:

`CHAT NN BLOCK COMPLETE — rounds=R verified_pass=X exhausted=Y open=0`

**Then keep working.** That line is a progress report, not permission to stop. Go straight to stealing unclaimed slices, highest `home_chat` first, without waiting to be told. Only when `slices.csv` has no slice lacking both a `.claim` and a `.done` do you say:

`CHAT NN DRAINED — stolen=S takeovers=T`

and stop.

Chat 01 merges. Your rows may still flip to red in the **global** collision pass — that is expected and is not a failure of your work. Do not merge, do not touch `loop-ledger.csv`, do not build `coverage-index.csv`.

## Start now

Read your assignment file, build your round-1 open set, spawn your sub-workers, and go. Report each round and **immediately begin the next one — do not wait to be asked to continue.**

---

## Resume block (paste alone if this chat drops)

```
Resume Ekoway image loop, CHAT NN, assignment file
catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-NN.csv.
Read loop-state/chat-NN/chat-NN-ledger.csv, take the highest round in ROUND-REPORT.md as the last
completed round, rebuild the open set from state=open, continue at the next unconsumed tier per row.
Same rules: write only inside loop-state/chat-NN/, never touch loop-ledger.csv or gate.py, blind
verification by a different worker, gate.py must run green, escalate tiers, never repeat a tier,
maximum parallel tool calls, tokens irrelevant. Do not restart from round 1.
```
