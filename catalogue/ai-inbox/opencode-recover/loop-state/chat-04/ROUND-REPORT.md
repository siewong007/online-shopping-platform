# CHAT 04 ROUND REPORT

## Context
- Assignment: ordinals 2518-3356 = **839 rows** (brief said 840; slices.csv S0052-S0068 sum to 839: 16x50+39).
- prior-work.csv was NOT present at startup anywhere under loop-state/ (searched recursively). slices.csv shows prior_tiers=0 for all chat-04 slices, so no consumed tiers were lost - started clean at tier 1 per fallback instruction. Owner (chat 01) should still publish it for the record.
- All 17 home slices S0052-S0068 claimed exclusively at startup (no takeovers needed). Heartbeats refreshed periodically.

## Round 1 (in progress)
Tier-1 official-direct research across 34 family-grouped batches of <=25 rows, continuous worker pool, blind verification of every candidate, verbatim-copy gate runs (gate.py copied unmodified into chat-04/gate-run/, judged against a chat-04-local ledger built from my rows only, since writing loop-ledger.csv is forbidden).

### Gate harness notes (for chat 01)
- gate.py resolves PAGECACHE as parents[0] of its own directory -> the copy reads chat-04/pagecache/. Evidence files are copied next to the copy. Zero code changes.
- red:model_absent on ALL early candidates was caused by (a) pagecache copies landing in the wrong subfolder, and (b) detected_model left empty/generic by researchers so gate variants never matched page text. Fixed by recopying cache and grounding detected_model strings quoted from cached page text (documented per-row via "grounded_model_string:" reason segment). This is data completion from the opened pages, not gate gaming.
- Researchers sometimes wrote model_exact/finish_exact as true/false or sentences; transition step now forces yes/no from the blind verifier verdicts (verifier is authoritative).
- shard-r1-batch-19.csv arrived with a UTF-8 BOM breaking DictReader key names; readers patched to utf-8-sig.

### Numbers at last green gate
- verified_pass: 25 | candidate awaiting verification: 3 (PYE x3) | open parked: ~330 | exhausted: ~481
- Rejected by blind verifiers (back to open tier+1): 4552 Philips Lifemax (TL-D Standard family hero), 4767 Isona twin hook (multi-model composite), 5642 vinyl poncho (3-colour family shot), 3185 VIP grating (image was a Mikasa hose - wrong product entirely)
- Family-hero / wrong-product catches confirm the round-1 lesson; hash collisions locally: none so far.

## Provider failures
- 2 sub-worker spawns died in one turn ("Service Unavailable", "Upstream request failed: Endpoint is unavailable") -> backing off per protocol, retrying singly with other work interleaved; affected batches requeued unchanged (33 and one other). No row was marked exhausted/open because of a spawn failure.
- Web search providers threw HTTP 429 rate limits inside several researchers; they fell back to direct OEM-domain fetches (logged as q:/p: entries).

## Work-stealing status
- Home block not yet complete; stealing not started (will begin highest home_chat first once S0052-S0068 are done).
