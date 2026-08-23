#!/usr/bin/env python3
"""Build blind-verify brief for L1 candidates + C2 candidate 3361."""
import csv
from pathlib import Path

LOOP = Path(__file__).resolve().parent
C01 = LOOP / "chat-01"

led = {x["source_position"]: x for x in csv.DictReader(
    open(LOOP / "loop-ledger.csv", encoding="utf-8"))}
out = []
for fn, only in (("shard-L1.csv", None), ("shard-0101-0150.csv", {"3361"})):
    for r in csv.DictReader(open(C01 / fn, encoding="utf-8-sig")):
        if r["researcher_decision"].strip().lower() != "candidate":
            continue
        if only is not None and r["source_position"] not in only:
            continue
        out.append(r)

cols = ["source_position", "item_code", "uom", "display_name", "category",
        "official_product_page", "official_image_url"]
with open(C01 / "verify-brief-VL1.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=cols)
    w.writeheader()
    for r in out:
        l = led.get(r["source_position"], {})
        w.writerow({"source_position": r["source_position"], "item_code": r["item_code"],
                    "uom": r["uom"], "display_name": l.get("display_name", ""),
                    "category": l.get("category", ""),
                    "official_product_page": r["official_product_page"],
                    "official_image_url": r["official_image_url"]})
print("verify brief rows:", len(out))
