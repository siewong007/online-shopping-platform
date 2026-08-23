#!/usr/bin/env python3
"""chat-09: build escalation input (tier3/4 set) from ledger."""
import csv
from pathlib import Path

MY = Path(__file__).resolve().parent
SPECIAL = {"1067", "1643", "1690", "1713", "1148", "1522",
           "1625", "2292", "1370", "1427", "1444", "4121", "4123"}

with open(MY / "chat-09-ledger.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
esc = []
for r in rows:
    if r["state"] != "open":
        continue
    reason = r["reason"]
    if ("verify:fail" in reason or "disagreement" in reason
            or "gate-fail red:model_absent" in reason
            or r["source_position"] in SPECIAL):
        esc.append(r)
print("escalation set:", len(esc))
with open(MY / "r1" / "esc-01.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["source_position", "item_code", "uom", "display_name", "category",
                "detected_brand", "detected_model", "tiers_already",
                "prior_page", "prior_image"])
    with open(MY.parent / "chat-assignments" / "chat-09.csv", encoding="utf-8-sig") as af:
        A = {r["source_position"]: r for r in csv.DictReader(af)}
    for r in esc:
        a = A[r["source_position"]]
        w.writerow([r["source_position"], r["item_code"], r["uom"], a["display_name"],
                    a["category"], a["detected_brand"], a["detected_model"],
                    r["tiers_tried"], r["official_product_page"],
                    r["official_image_url"]])
for r in esc:
    print(" ", r["source_position"], r["item_code"], "| tiers:", r["tiers_tried"])
