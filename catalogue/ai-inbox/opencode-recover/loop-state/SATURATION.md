# SATURATION — chat 01 — initial publish 2026-08-22

## Fleet
| chat | home rows | slices | claimed | done | unclaimed |
|---|---:|---:|---:|---:|---:|
| 01 | 840 + 116 livecheck | 17 | 0 | 0 | 17 |
| 02–09 | 840/838 each | 136 | 0 | 0 | 136 |

claims/: empty at publish. No stale claims. No takeovers.

## Projection
- chats 02–06 (search, tier 1): expect ~60–120 rows/h/chat once saturated.
- chats 07–09 (reopen, tier 2): expect the long pole; steal priority target for idle chats.
- Chat 01 dual-hats coordinator merges; merges run on separate slots and must never park researchers.

## Rules in force
- claim = exclusive-create `.claim` in `chat-assignments/claims/`, heartbeat ≤15 min, `.done` on completion
- stale claim: `.claim` >45 min without `.done` → takeover file + proceed
- spawn failures: backoff 30s / 2min / 5min, max 3 consecutive, then release slice and take different work

---
# UPDATE � search outage
websearch provider HTTP 429 fleet-wide since ~session start of round 3. All research pivoted to
sitemap_harvest.py (own-sitemap crawling, no search engine). Slots B/C partially blocked; generic
unbranded rows cannot receive required query logs until provider recovers. Backoff retries ongoing.
chat-01 slots active this round: B(50 done-pending), C(interrupted ~30), D2(21 done), V-HARV, V-D2, flag-repair.

---
# UPDATE � chat-01 block status
- Home block ordinals 1-839: fully researched at least once.
- exhausted: 252 generic commodities (tiers t1..t5 logged, shoot-in-store owner actions).
- verified_pass: 164. open in block: ~507 branded pendings awaiting tier escalation + livecheck stragglers.
- spawn failures this sitting: 3 consecutive (ESC-1 x2, ESC-2 x1) -> backoff engaged, slices halved per policy.
- search provider flapping: subagents report 429 most sessions; bing-html fallback junk; direct OEM probes + sitemaps carrying the load.
