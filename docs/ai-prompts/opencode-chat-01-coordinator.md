# Prompt — OpenCode chat 01 — coordinator + block 1

Paste into the **existing** OpenCode chat (the one that has been running the loop). It narrows that chat's scope and adds the merge duty. Eight new worker chats start from `opencode-chat-worker.md` once you have published `prior-work.csv`.

---

Stop expanding scope. Your role has changed. Eight more OpenCode chats are starting in parallel; you are now **chat 01** — one research block plus the coordinator duties nobody else can do.

## Where you actually are — read this before arguing with it

After 9.6 hours (04:30–14:05 UTC, 95 messages, 106 tool calls):

- `loop-ledger.csv`: 7,771 rows, **146 `verified_pass`, 7,625 `open`**.
- 132 of those are `skip_pass` rows that already had an image. **Only 14 are new images found by research.**
- About 600 rows have consumed a tier (290 at tier 1, 200 at tier 2, 110 at both). That is **~62 rows/hour**, and 7,544 rows are still open — roughly 120 more hours at this rate in one chat.

The gate is doing its job: the Megaman `wp-content/uploads` family heroes were correctly caught on hash collision after the blind verifier passed 29 of them. Three things are not working, and all three are why the number is 14 and not 300:

1. **You are running at one tool call per turn.** 76 of your 93 assistant turns issued exactly **one** tool call. Your peak was **four**. The prompt asked for twenty or more, and everything about the throughput follows from this one fact.
2. **`red:schema` is failing rows that are otherwise green.** 8 rows passed blind verification and died on schema — empty `reason`, empty query log, or a missing column. That is bookkeeping destroying good research.
3. **Retry storms.** Six of 22 sub-worker spawns died on provider errors and you retried two of them back-to-back with no backoff until the session ended.

Fix all three before anyone scales this up. Nine chats each running at one tool call per turn is nine times too slow, not nine times faster.

## Two tasks were still hung when your session was exported

`Research shard 08 third attempt` and `Blind verify shard F fourth attempt` were both left `running`, after
`network_error` / `Service Unavailable` killed the three attempts before them. `round-02/shard-0701-0800.csv`
has 10 rows in it, not 100.

Kill both, requeue their rows, and never retry a failed spawn more than three times in a row again — back off
30s / 2min / 5min, then release the work and take something else. Six of your 22 sub-worker spawns died on
provider errors; the retries cost you roughly the last two hours of the run. Those are infrastructure failures,
not research failures: no row may be marked `pending` or `exhausted` because a sub-worker died.

## Task 0 — unblock, then publish (do this first, before the other chats start)

1. **Land the merge you were mid-way through.** 146 `verified_pass` are in the ledger (132 `skip_pass` + 14
   `search`), so the pipeline does convert — it is just slow. Finish merging every unmerged shard and verify
   file from rounds 1 and 2, including the T2 batch, so nothing is left living only in this chat's context.
2. **Merge rounds 1 and 2 into the ledger properly.** Take `round-01/shard-*.csv` + `verify-*.csv` and `round-02/shard-*.csv` + `verify-*.csv` + `shard-t2.csv` + `verify-t2.csv`, apply verdicts, run `gate.py`, and write the true state for all ~820 researched rows. Snapshot to `round-02/loop-ledger-snapshot.csv`.
3. **Fix the `red:schema` path in `gate.py`.** A row must not fail schema for a reason that is a logging defect rather than an evidence defect. Distinguish `red:schema` (structurally unusable — missing key column, duplicate `item_code+uom`, header mismatch) from `amber:log_incomplete` (evidence is fine, the query log needs backfilling — repair it and re-gate, do not discard the row). Re-run the 8 affected rows.
4. **Freeze `gate.py`.** After this fix it is read-only for all nine chats. Workers import and run it, never edit it. If a worker reports a gate bug, you make the change and tell every chat to re-run.
5. **Publish `loop-state/chat-assignments/prior-work.csv`** — every row already researched in rounds 1–2, with `item_code,uom,tiers_tried,prior_decision,prior_page,prior_image,prior_reason`. About 150 of those rows now sit in other chats' blocks; without this file eight workers redo tier 1 on rows that already failed tier 1.

The slice manifest and claim directory are already generated for you: `chat-assignments/slices.csv` (156 slices of 50 rows, covering all 7,674) and `chat-assignments/claims/`. Do not regenerate them — nine chats depend on those `slice_id`s being stable.

Say `CHAT 01 PRIOR-WORK PUBLISHED` when 1–5 are done. **The other eight chats start then, not before.**

## Your research block

`catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-01.csv` — ordinals 1–840 (838 `search`, 2 `duplicate_listing`). 252 of them already carry tier 1, so resume those at **tier 2**.

Plus `chat-01-livecheck-open.csv` — the **116** `skip_pass` rows your live-check demoted (35 `red:content_type`, 28 `red:model_absent`, 19 `red:too_small`, 16 `red:hash_collision`, 4 `red:http`, 4 `red:schema`, 10 unflagged). These had an image that failed the usability bar, so they start at **tier 2**: the prior page is a strong hint, you need a better asset from it or a better source.

Anything you have already touched that falls **outside** ordinals 1–840 is now another chat's row. Hand it off through `prior-work.csv` and do not process it.

Everything else — the bar, the five tiers, blind verification by a different worker, the usability floor, the write-isolation rules, the **saturation and work-stealing rules**, the output layout — is exactly as in `opencode-chat-worker.md`. Your outputs go in `loop-state/chat-01/`, same file names, same 27-column `chat-01-ledger.csv`.

Saturation applies to you too, with one addition: **merging must never park your researchers.** Run merges on a separate slot while research continues at ceiling. If a merge stalls your block, you have built it wrong.

## Coordinator duties (only you)

**`loop-ledger.csv` is yours alone.** No worker writes it. You rebuild it from the nine `chat-NN-ledger.csv` files.

**Global collision pass.** `red:shared_image` and `red:hash_collision` compare a row against the whole catalogue, and a worker only sees its own 840 rows. When you merge, concatenate all nine `hashes.csv` files and re-run both checks across the full 7,771. A row that is locally green can be globally red — your verdict wins, and those rows go back to their owning chat at tier+1. Tell that chat explicitly which rows flipped.

**Per-merge checks.** After each merge: 7,771 rows exactly, no duplicate `item_code+uom`, no row lost, every `verified_pass` green under the *current* `gate.py`, and `python scripts/check-ai-inbox.py` clean. Publish `loop-state/MERGE-REPORT.md` with state counts, per-chat progress, global reds, and rows sent back.

Merge whenever a chat reports `CHAT NN BLOCK COMPLETE`, and at least once every few hours regardless so the picture stays current.

**Saturation watch.** You own `chat-assignments/claims/` and are the only one who can see the whole fleet. Every merge, and at least hourly, write `loop-state/SATURATION.md`:

- slices claimed / done / unclaimed, by home chat
- **stale claims** — `.claim` older than 45 min with no `.done`. That chat is dead or stuck. Name it so the owner can restart it, and confirm another chat has taken it over.
- **chats that reported `CHAT NN BLOCK COMPLETE` but not `CHAT NN DRAINED`** while unclaimed slices exist. That chat is idling and must be told to resume stealing.
- projected finish per chat from its rows-per-hour, so the owner sees which block is the long pole before it becomes the long pole.

The fleet is only as fast as its worst-balanced hour. `search` blocks (02–06) will drain well before `reopen` blocks (08–09) — expect and plan for five chats stealing into two.

## Locked — do not touch

`recover-pass1.csv`, `already-pass-livecheck-verified.csv`, `pass-queue-unreviewed-2501-plus-verified.csv`, priority-300, the forensic 1–2500 set, the 1001–2500 zip. No deploy. Nothing into `frontend/public/product-images/`. No edits to `backend/` or `frontend/`. Rights stay `needs_permission` / `unknown` / `no_asset`. Pickup on, card pay off, delivery off.

## Finish

When all nine chats report `CHAT NN DRAINED`, no slice in `slices.csv` lacks a `.done`, and the merged ledger has `open = 0`:

- `coverage-index.csv` — 7,771 rows, worklist order: `source_position,item_code,uom,action,state,official_product_page,official_image_url,match_confidence,rights_status,reason`
- `remaining-all-pass1.csv` — `verified_pass` rows only, 14-column priority-300 header, ready for Grok

Then say exactly:

`OPENCODE LOOP GREEN — chats=9 verified_pass=X exhausted=Y open=0`

Only then does Gemini do the last pixel pass, and only on `verified_pass` rows.

## Start now

Task 0, items 1–4, at maximum parallelism. Report `CHAT 01 PRIOR-WORK PUBLISHED`, then start your own block and keep looping without waiting to be asked.
