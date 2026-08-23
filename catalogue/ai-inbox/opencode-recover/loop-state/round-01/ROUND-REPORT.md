# ROUND 1 COMPLETE
open_at_start 7771 / verified_pass_new 101 / exhausted_new 0 / still_open 7670

## skip_pass livecheck (213 rows)
- promoted verified_pass: 65
- demoted to open: 148 (gate reds + 14 lacking prior exact flags)
- gate reds by code: red:http 42, red:content_type 37, red:too_small 19, red:model_absent 20, red:hash_collision 16, schema-missing-exact 14

## research shards 0001-0400 (400 rows)
- researcher: candidate 107 / pending 155+62A / reject 138+33B+60C+45D... final merge: candidate+pass->gate 79, disagreement 17, pending/reject stay open
- verifier blind results: A 29/9 pass/fail, B 37/1, C 13/7, D 11/0
- machine gate on 79 agreed candidates: green 36 -> verified_pass; reds: model_absent 22, hash_collision 12, too_small 8, content_type 1
- transitions this round: 272 (>0)

## notes
- Megaman family-hero images and <20KB thumbnails systematically caught by shared_image/hash_collision/too_small.
- Bosch ocsmedia thumbnail transforms auto-upgraded where larger transform returned 200.
- Workers B/C/D systemic blockers logged in shard notes; Dongcheng/Saniware bot-walls need tier-3/4.

## tiers consumed this round
- skip_pass rows: livecheck only (no tier consumed)
- 400 research rows: tier 1

## parallel tool calls
- ~40 concurrent HTTP fetches per batch x 5 batches; 4 research workers spawned together; 4 blind verifiers spawned together
