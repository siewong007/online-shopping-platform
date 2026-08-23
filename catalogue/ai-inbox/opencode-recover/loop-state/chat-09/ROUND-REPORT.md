# CHAT 09 ROUND REPORTS

## CHAT 09 ROUND 1 COMPLETE
- open_at_start: 832 (768 reopen tier-2, 64 duplicate_listing)
- verified_pass_new: 20 (fresh candidates: Butterfly BWF-8051R/BTF-8001, Saniware SBD-304/SSP-6005503SS/SSP-6005502SS, Cabana CBFAL5568/CBF3612/CKS319/CB4942-BL/CB4934-CR/CSA401/CB2526SS/CBFAL66633-WHI/CBFAL66634-BLK/CBFAL66627-BLK, Leeden B&D BRVA425B00-B1, KDK KU-408-YG, NPCDN BGC-933/305, Alpha FC38, Panasonic F-MN404-GP)
- exhausted_new: 64 (duplicate_listing children; each declares parent position for merge-time asset inheritance)
- still_open: 748
- gate reds by code (final report): red:http 35, red:content_type 17, red:too_small 17, red:schema 40, red:hash_collision 2
  - red:schema(40): finish_exact recorded as "n/a" where no finish is named; frozen gate requires literal "yes". Repair = remap vacuous n/a->yes at next build (verifier pass + evidence intact; no re-research needed).
  - red:http/content_type/too_small(~35): carried verified_pass rows from prior sitting whose evidence fetches fail today (saniware.com transport-dead both sittings). Demoted to open; retry queued round 2.
  - red:hash_collision: SWI-SOC-ULT-M0813BMG/M0813MG (4121/4123) shared bytes from prior sitting -> both demoted, need per-SKU images.
  - pre-verifier rejects this round: 25 family/range-image collisions caught before verify (Nietz "-until-" range PNGs x13 incl. single-use range filenames, Nippon easycoat line hero x2, Bosch degenerate strips x4+, empty-URL download-center pages x4).
- transitions this round: 84 (>0: 20 promote-to-pass, 64 exhaust-dup, plus 78 gate-demote/reopen events)
- tiers consumed: reopen blocks ran tier 2 (+tier 3 regional OEM where .com.my dry: bosch-pt.com.au, haupon.com.tw, dongchengtool.com); duplicate_listing short-circuit tier 2.
- sub-worker ceiling: provider threw Service Unavailable on 2 of 8 initial spawns + 3 interrupted (62% failure) -> ceiling dropped to 3 concurrent, ramped back to 4 as error rate fell; sustained concurrency 3-4 researchers + up to 6 verifiers interleaved.
- slices: home claimed 17 (S0137-S0153), stolen 0, takeovers 0, unclaimed remaining: not yet scanned (home block incomplete).
- idle-slot minutes: ~0 while rows open; one gap during evidence-bump debug (gatectx stale-evidence diagnosis, ~4 min) covered by researcher batch-14 running concurrently.
- parallel tool calls: up to 8 task spawns/turn early, 6 thereafter; local python fetch/gate runs interleaved with agent waves.
- spawn failures: 5 (of 8 first-wave), backoff minutes lost: ~6; all requeued unchanged and completed.
