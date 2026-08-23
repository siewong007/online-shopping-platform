#!/usr/bin/env python3
"""Write round-02 ledger snapshot + chat-assignments/prior-work.csv."""
import csv
from pathlib import Path

STATE = Path(__file__).resolve().parent
rows = list(csv.DictReader(open(STATE / "loop-ledger.csv", encoding="utf-8")))
hdr = list(rows[0].keys())

with open(STATE / "round-02" / "loop-ledger-snapshot.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=hdr)
    w.writeheader()
    w.writerows(rows)

n = 0
pw = STATE / "chat-assignments" / "prior-work.csv"
with open(pw, "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(["item_code", "uom", "tiers_tried", "prior_decision",
                "prior_page", "prior_image", "prior_reason"])
    for r in rows:
        touched = ("r1:" in r["reason"]) or ("r2:" in r["reason"]) or bool(r["tiers_tried"])
        if touched:
            dec = r["researcher_decision"] or ("verified_pass" if r["state"] == "verified_pass" else "")
            w.writerow([r["item_code"], r["uom"], r["tiers_tried"], dec,
                        r["official_product_page"], r["official_image_url"],
                        (r["reason"] or "")[:2000]])
            n += 1
print("snapshot written; prior-work rows:", n)
