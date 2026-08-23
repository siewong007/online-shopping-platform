#!/usr/bin/env python3
"""Convert harvest output to researcher-style shard CSV (excluding known-bad matches)."""
import csv
from pathlib import Path

C01 = Path(__file__).resolve().parent / "chat-01"
rows = list(csv.DictReader(open(C01 / "harvest-livecheck.csv", encoding="utf-8-sig")))
bad = {"196", "85", "38", "94", "240", "1202", "1226"}
cols = ["source_position", "item_code", "uom", "official_product_page", "official_image_url",
        "researcher_decision", "match_confidence", "finish_exact", "model_exact",
        "uom_assessment", "rights_status", "reason", "human_action"]
n = 0
with open(C01 / "shard-harvest-lc.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=cols)
    w.writeheader()
    for r in rows:
        if r["decision"] != "candidate" or r["source_position"] in bad:
            continue
        w.writerow({
            "source_position": r["source_position"], "item_code": r["item_code"],
            "uom": r["uom"], "official_product_page": r["pdp_url"],
            "official_image_url": r["image_url"], "researcher_decision": "candidate",
            "match_confidence": "B", "finish_exact": "", "model_exact": "",
            "uom_assessment": "", "rights_status": "needs_permission",
            "reason": "harvest-tier4: saniware.com own-sitemap slug match (bot-wall bypassed); "
                      "p:" + r["pdp_url"],
            "human_action": ""})
        n += 1
print("harvest candidates written:", n)
