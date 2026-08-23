# MERGE REPORT — chat 01 — 2026-08-22 (post-round-2 landing)

## Ledger state after merge
- total 7,771 · verified_pass **141** · open **7,630** · candidate 0 (23 held for exact-flag repair) · exhausted 0
- Per-state source: 132 skip_pass livecheck promotions − 9 Megaman family-hero collisions − … + research promotions = 141.

## Merged this sitting
| file | rows | outcome |
|---|---:|---|
| round-01 shard×4 + verify×4 | 400 | 36 gate-green → verified_pass (later −4 exact-flag, −9 collision) |
| round-02 shard-t2 + verify-t2 | 110 | 39 verify-pass → gate: 35 green, 4 red |
| round-02 shard-0401-0500 (E) + verify | 100 | 8 pass → gate green 7 |
| round-02 shard-0601-0700 (G) + verify | 100 | 8 pass → gate green |
| round-02 shard-0701-0800 (H partial, spawn died at 20/100) | 20 | merged as open; 1 candidate awaiting blind verify; 90 rows requeued |
| round-02 shard-0501-0600 (F) + late-delivered verify | 100 | 6 to gate → 4 promoted, 2 disagreements |

## Global collision enforcement (coordinator pass)
Megaman `wp-content/uploads` family heroes shared across distinct SKUs — **9 verified_pass rows demoted back to open** (positions 134,138,153,168,174,178,197,227,237). All are in `chat-01-livecheck-open.csv`; they restart at tier 2.

## Gate change (now FROZEN)
`red:schema` split per coordinator instruction:
- structural (missing key column, undeclared duplicate item_code+uom, header mismatch, verified_pass without literal exact flags) stays **red:schema**
- logging-only defects (empty reason / empty query log with otherwise-green evidence) are now **amber:log_incomplete** → repair by backfilling the log and re-gate; never discard.
23 verified_pass rows lacked literal `finish_exact=yes`/`model_exact=yes` → held in candidate, brief at
`round-02/exact-flag-repair-brief.csv`, verifier dispatched. No row was discarded.

## Spawn-failure accounting (this sitting)
spawn failures: 7 (shard-A researcher ×1 network_error, H ×3, V-F ×3 incl. aborted) — V-F's 4th attempt delivered its CSV despite the abort notice. Backoff policy now enforced: 30s / 2min / 5min, max 3, then release the slice.

## Checks
- ledger rows: 7,771 exactly; duplicate item_code+uom: only the 60 declared duplicate_listing pairs
- `gate.py --round 2`: clean except the 23 exact-flag holds (being repaired) 
- `python scripts/check-ai-inbox.py`: failed=0

---
# UPDATE � post-round-3 landing
- verified_pass 128 -> **147** (Saniware own-sitemap harvest +12, exact-flag repairs +10, D2 dealer-sitemap +5; minus verify-fail restores -2, hash-collision -1)
- open 7,624 � exhausted 0
- gate.py --round 3: ZERO reds across all 7,771 rows
- apply_gate.py bug fixed: promotions no longer clobber claimed URLs with stale evidence URLs
- check-ai-inbox.py: failed=0
