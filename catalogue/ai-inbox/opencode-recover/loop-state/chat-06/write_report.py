#!/usr/bin/env python3
"""Write ROUND-REPORT.md for chat-06 from current artifacts."""
import csv, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LS = HERE.parent

led = list(csv.DictReader((HERE / "chat-06-ledger.csv").open(encoding="utf-8")))
from collections import Counter
states = Counter(r["state"] for r in led)
tiers1 = sum(1 for r in led if "1" in (r["tiers_tried"] or ""))
raw_workers = sorted((HERE / "raw").glob("w*.jsonl"))
raw_verifs = sorted((HERE / "raw").glob("v*.jsonl"))

report = f"""# CHAT 06 ROUND 1 STATUS (in progress)

assigned_rows: {len(led)} (assignment file chat-06.csv; ordinals 4196-5034)
states: {dict(states)}
rows with tier-1 consumed: {tiers1}
researcher workers persisted: {len(raw_workers)} ({', '.join(w.stem for w in raw_workers)})
verifier batches persisted: {len(raw_verifs)} ({', '.join(v.stem for v in raw_verifs)})

## verified_pass ({states.get('verified_pass',0)})
"""

for r in led:
    if r["state"] == "verified_pass":
        report += (
            f"- {r['source_position']} {r['item_code']} | {r['official_product_page']} | "
            f"{r['image_px_w']}x{r['image_px_h']} {r['image_bytes']}B sha={r['image_sha256'][:12]}\n"
        )

report += """
## gate reds this round
- r4 red:content_type on 6647 Pentens Latex 108 (DO-Spaces CDN re-fetch non-image) -> back to open tier2; alternate official image needed.
- r1 verifier fail on 6030 PYE Water-Lock (gidci PH image only 256px) -> back to open tier2.

## provider outage note
Fleet-wide websearch HTTP 429 for the entire session; direct-domain fetch research used instead.
Shards r1s02 + r1s05 were wiped by 429 before any queries ran; requeued at tier 1 (not consumed).
Observed sub-worker ceiling: harness executes ~1 task result per turn; one researcher OR verifier per turn.

## tier-2+ leads queue
- 6346 Middy G100CO: exact accessory only inside >5MB catalogue PDF on middy.com.my -> tier 4 archive/PDF crop.
- 6030 PYE Water-Lock: need >=500px official image (pyeproducts.com or authorised MY distributor).
- 6647 Pentens Latex 108: need stable official/distributor image URL that survives byte-fetch.
- 3418/4794/6566/6971/7270/4466: verified_pass pending chat-01 global gate confirmation.
"""
(HERE / "ROUND-REPORT.md").write_text(report, encoding="utf-8")
print(report)
