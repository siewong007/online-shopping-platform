# Handoff — product image loop — 23 August 2026

Everything needed to resume the Ekoway product-image sourcing loop on a different machine.

## Where the work stands

Nine parallel OpenCode chats ran from 22 Aug ~22:00 to 23 Aug ~15:30 (~17 hours), on top of a
single-chat run of 9.6 hours before that.

| state | rows | meaning |
|---|---:|---|
| `verified_pass` | **419** | bar + blind verify + gate green |
| `exhausted` | **1,062** | all tiers logged, no official image exists — owner action recorded |
| `candidate` | 98 | researched, awaiting verify or gate |
| `open` | 6,192 | not yet terminal |
| **total** | **7,771** | |

**Terminal: 1,481 / 7,771 = 19%.** The 98 `candidate` rows are the cheapest next win — they are
already researched and only need a verify plus a gate run.

Of the 419 passes, **288 are genuinely new images found by research** (145 `search` + 140 `reopen`
+ 3 `duplicate_listing`); the other 131 are `skip_pass` rows that already had a usable
image and were re-confirmed by live-check.

## The resume point

`catalogue/ai-inbox/opencode-recover/loop-state/loop-ledger.csv` — 7,771 rows, 27 columns, one per
`item_code+uom`. This is the **only** file a new machine needs to know where to continue.

It was consolidated from all nine per-chat ledgers by
`loop-state/consolidate.py`, which only ever moves a row forward
(`open` → `candidate` → `exhausted` → `verified_pass`) and never downgrades. Re-running it is safe.
A timestamped `loop-ledger.backup-*.csv` is written each time.

`loop-state/HANDOFF-STATE.md` holds the machine-generated before/after of the last consolidation.

## What is in git and what is not

Committed — the entire resume point:

- `loop-ledger.csv` plus all nine `chat-NN/` folders (shards, verify CSVs, hashes, round reports, scripts)
- `gate.py`, `consolidate.py`, `rebuild-assignments.py`, the assignment files and `slices.csv`
- the worklist, ordinal index, image manifest, and every prompt under `docs/ai-prompts/`

**Not committed** (see `.gitignore`) — regenerable or rights-encumbered binaries:

- `**/pagecache/` (~556 MB) — fetched HTML, regenerable and already stale
- `**/assets/` and `**/*-assets/` (~320 MB) — downloaded OEM product images and supplier PDFs
- image and PDF files anywhere under `catalogue/ai-inbox/`

The ledger records `official_image_url`, `image_sha256`, `image_px_w/h` and `image_bytes` for every
asset, so a new machine can re-fetch and verify against the recorded hash. **The images themselves
carry `rights_status = needs_permission` and must not be published or pushed to a public repo.**
This project folder lives in OneDrive — if the other machine signs into the same account, the
binaries arrive that way. That is the intended channel for them, not git.

> If both machines are ever active in this OneDrive folder at once, do not run git on both. A `.git`
> directory under live cloud sync will corrupt if two machines write it simultaneously.

## Resuming on the new machine

1. Clone or pull `siewong007/online-shopping-platform`, branch `joseph`.
2. Confirm the ledger arrived intact:

```bash
python -c "import csv,collections;r=list(csv.DictReader(open('catalogue/ai-inbox/opencode-recover/loop-state/loop-ledger.csv',encoding='utf-8-sig')));print(len(r),collections.Counter(x['state'] for x in r))"
```

Expect 7,771 rows and roughly the counts in the table above.

3. Rebuild the fleet assignments from the current ledger — the old ones are stale and would send
   workers at rows already done:

```bash
python catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/rebuild-assignments.py
```

It refuses to run if `claims/` is non-empty, so clear that directory only when starting a fresh fleet.

4. Start chat 01 with `docs/ai-prompts/opencode-chat-01-coordinator.md`, wait for
   `CHAT 01 PRIOR-WORK PUBLISHED`, then start the workers with
   `docs/ai-prompts/opencode-chat-worker.md` plus their assignment line.

## Data repairs already applied

`loop-state/repair-ledger.py` ran after the chats were stopped; `REPAIR-REPORT.md` has the detail.

- **`tiers_tried` normalised on 491 rows.** Four notations were in use — `1|2`, `2;3`, `T1,T5` and
  `T1(blocked),T5` — and tier escalation would have misread every one but the first. All rows are now
  canonical sorted `1|2|4`. Re-running the script is harmless.
- **8 of the 14 mis-keyed rows recovered.** Chat 04 had shifted a column and written the size into
  `uom` for eight `TOO-COM-IRO-BUL-*` rows, and let a backslash escape into `TIE-CAB-BLA-100MM-4"`.
  Re-keyed against the worklist; one promoted to `exhausted`, seven were already at or above their
  chat state.
- **15 chat-01 candidates recovered.** Chat 01 never wrote a `chat-NN-ledger.csv`, so its research sat
  in raw `shard-*.csv` files. Its `candidate` rows that were still `open` are now `candidate`.

## Still outstanding

- **6 rows exist in chat 02's ledger but not in the catalogue at all** — `SWI-T/BOX-PP100-923A`,
  `SWI-T/BOX-PP100-740B`, and four `SWI-T/SOC-FLE-TC-*`. No `item_code` prefix match in
  `remaining-all-worklist.csv` under any UOM. Either chat 02 invented them or they came from a source
  outside the worklist; they are excluded from the ledger and need an owner decision.
- **`chat-03/results/research-r022.json` is truncated** and was skipped. Chat 03 flushed a
  `chat-03-ledger.csv` on shutdown which covers most of the same rows, so the loss is likely small.
- **`red:schema` still fails rows whose evidence is sound** but whose query log is empty. The
  coordinator prompt asks for an `amber:log_incomplete` path instead; it was never implemented.
- **The 98 `candidate` rows were never gated** — no network was available in the session that stopped
  the fleet. Run `gate.py` over them first thing on the new machine.

## Why throughput was what it was

From the single-chat transcript, and the reason the fleet exists:

- 76 of 93 assistant turns issued exactly **one** tool call. Peak was four. The prompt asked for 20+.
- 6 of 22 sub-agent spawns died on provider errors (`network_error`, `Endpoint is unavailable`,
  `Service Unavailable`) on model `x-preview-f-free`, and retry storms with no backoff cost roughly
  two hours.

The worker prompt now carries saturation rules, backoff-and-release on spawn failure, and
filesystem work-stealing so a finished chat helps a lagging one. If the next fleet can run on a
paid, stable model, do that — provider availability was the real ceiling, not the loop design.
