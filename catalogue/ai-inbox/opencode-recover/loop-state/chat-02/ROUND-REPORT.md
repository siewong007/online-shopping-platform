# CHAT 02 ROUND REPORT — rounds 1–12 (rolling)

CHAT 02 ROUND R COMPLETE (R = gate cycle 12)
open_at_start: 839 (all open, zero prior tiers consumed — prior-work.csv absent, assignment file's prior_* columns all empty, so tier-1 start was correct per protocol)
verified_pass_new: 3 (4132 Jayamata JM-317 scissor; 2653 Cabana CB476-BL bracket; 5771 Truflo G503B bib tap — each researcher-candidate + independent blind verifier pass + gate green)
exhausted_new: 267 (all with q:/p: logs + concrete human_action)
still_open: 29 (+1 candidate Bosny 3508 pending real-PDP hunt)
gate reds by code (r12): red:model_absent ×1 (3508 Bosny — cached page is a server error shell, recovery queued)
transitions this round: >0 every cycle since r2 (verifier fails→open re-research; passes→terminal)
tiers consumed: T1–T5 per row as logged in shard reasons; no consumed tier repeated

## Defects found and fixed (root causes, for chat 01's attention)
1. **Ordinal/position confusion** — researchers in ranges 900–929, 960–989, 1020–1049(part), 1050–1079(part), 1170–1199 wrote catalogue ORDINALS into source_position. Fixed by item_code+uom join to assignment truth: 150 row-keys remapped across shards, pagecache/assets/evidence/hashes re-keyed, verify briefs remapped. Zero conflicts.
2. **Fabricated candidate URLs** — blind verification pass rate was 1/15 before protocol v2; every failure was a guessed slug or redirect-to-different-product. Protocol v2 (sitemap/category-derived URLs only, title/H1 model check, self-view image before nominating) is now mandatory in all researcher prompts. Post-v2 verification pass rate: 3/3 among surviving candidates.
3. **fetchlib defects fixed mid-run**: fetch_page did not persist page evidence (page_status=None reds); append_evidence whole-file rewrite race between concurrent workers → replaced with append-only JSONL log + rebuilt view; model_variants unhashable-tuple bug (TOKENS variant stored a list inside a tuple) → aligned string format with gate.py.
4. **Foreign-item quarantine**: 6 shard rows carried item_codes not present in chat-02's block (e.g. EPO-HAR-* Hardex paste at positions whose true items are GUM-HAR-* HE4251/HE4252 valve grinding paste) → flipped open/reject with quarantine note; true items remain open at T1,T4.
5. **Evidence log junk keys** ('2613a','4931q1' style probe ids) dropped during log rebuild; 54 removed.

## Saturation / concurrency honesty
- Multi-call Task batches repeatedly executed only ONE of the spawned calls (harness-side drop, not provider error). Adapted to ONE Task + ONE bash per turn; this cost idle-slot minutes and is reported as required: **idle-slot minutes > 0, cause = harness multi-call drop + provider instability; mitigation = strict one-spawn-per-turn pipeline with local work paired every turn.**
- spawn failures: 6 total (Endpoint unavailable ×1, network_error ×3, Service Unavailable ×1, plus one tool-interrupt) over ~20 spawns ≈ 30% — ABOVE the 25% threshold; ceiling already dropped from intended 6-wide waves to 1-wide sustained. Backoff minutes lost ≈ 10.
- websearch provider (exa) returned HTTP 429 fleet-wide for most of the session; all workers fell back to direct OEM probes + Wayback CDX + Bing RSS as specified.

## Slices
home claimed: 17/17 (S0018–S0034), takeovers: 0, stolen: 0 (home block still has 539 untouched rows — no stealing yet per "take your own block first")
heartbeats rewritten every cycle.

## Next
RECOVER-B (10 verify-failed rows with concrete leads) — respawning after Service-Unavailable backoff.
RECOVER-C (~14 parked/dead-brand opens incl. Bosny PDP hunt).
Research ranges 1200–1678 (18 × 30 rows) under protocol v2.
