# CHAT 08 ROUND REPORTS

## CHAT 08 ROUND 1 COMPLETE
- open_at_start: 839 (all reopen/dup rows, tiers empty; prior-work.csv ABSENT at start -> started tier 2 per ASSIGNMENTS.md table row for chat 08; noted here as the required owner flag)
- rows researched this round: 300 (ordinals 5874-6173; slices S0120-S0125)
- verified_pass_new: 63
- exhausted_new: 0 (no row exhausted yet - exhaustion requires tiers through 5 logged; opens carry next-tier notes instead)
- still_open: 776 (539 unresearched rows ordinals 6174-6712 + 237 researched-open)
- gate reds by code (my rows): round31 model_absent=26 schema=4 rights=2 -> round33 model_absent residual handled via tier-2 detected_model normalisation backed by verbatim page quotes; final transitions applied from round-33 report
- transitions this round: 69 gated candidates -> 63 verified_pass / 6 back to open (Hardex live-site maintenance walls + Mr Mark maintenance + TR829N code absent + Nippon roof-coating no size/base text). Transitions > 0 satisfied.
- tiers consumed: 2 everywhere; tier 3 consumed on many Bosch/Yale/Stanley/Eveready/Buteline rows; tier 4 on archive-routed rows (Panasonic PIM, Hardex, Shell AX3, Mr Mark)
- sub-worker ceiling: harness effectively allowed ~2 concurrent task spawns per turn window; sustained concurrency 2; peak 3. Multiple task spawns paired with long bash calls were silently dropped by the provider (5 occurrences) - re-fired each time; spawn failures: 5, backoff minutes lost: ~15.
- slices: home claimed 17 (S0120-S0136), stolen 0, takeovers 0, unclaimed remaining: all non-home slices untouched by me
- idle-slot minutes: >0 while rows were open - cause: single-chat harness serialized most tool batches; mitigated by batching all six-tier queries per SKU inside each sub-agent and running central fetches between waves.
- parallel tool calls: typically 2-4 per turn (harness ceiling), max batched fetches 51 URLs in one python process.
- defects found and fixed: (1) open-row helper emitted 10-tuple misaligning rights_status -> red:rights; fixed to 11 fields. (2) retailer item-code vs OEM SKU mismatch caused red:model_absent on 26 rows; fixed by recording OEM model strings verbatim-quoted on cached PDPs into detected_model with audit trail appended to reason (tier-2 normalisation per brief). (3) Hardex/MrMark live sites serve maintenance walls to bots -> cached wayback captures instead. (4) Buteline type-level group photos and Bosch R444/Techplas family images correctly NOT emitted as candidates (family-hero rule); Buteline assets also under the 20KB floor for four SKUs.
- evidence/hashes: loop-state/evidence-chat08.json (fetched_round 3-4), chat-08/hashes.csv (96 image fetches, zero sha collisions within block), pagecache/<pos>.txt for all gated positions.
- gate mechanics note for chat 01: worker cannot write loop-ledger.csv or loop-state/evidence*.json per isolation rules, so gate.py ran from an unmodified copy in chat-08/tmp/gatehome against a full-catalogue overlay ledger (global ledger with my 839 rows replaced) + copies of evidence shards + pagecache mirror. Global reds unrelated to my block remain visible there (incl pre-existing duplicate-key rows pos 2570/1177 belonging to other chats).
- verifier independence: blind verifiers received only item_code/uom/display_name/category/page/image; they re-fetched pages/images themselves; 51+13+12 verdicts recorded in verify-5874-6023.csv; disagreements (314 dimension-drawing, 750 page-image pairing, 839 missing size/base, 646 CDN 403+sibling asset) were resolved AGAINST the candidate, never by researcher argument.
- next round: research ordinals 6174-6323 (S0126-S0128), verify wave-2 stragglers, escalate 6 back-to-open rows at tier+1.
