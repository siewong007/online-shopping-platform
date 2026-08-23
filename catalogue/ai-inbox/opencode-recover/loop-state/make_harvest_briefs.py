#!/usr/bin/env python3
"""Build sitemap-harvest briefs for chat 01 (block branded + livecheck branded)."""
import csv
from pathlib import Path

LOOP = Path(__file__).resolve().parent
C01 = LOOP / "chat-01"
C01.mkdir(exist_ok=True)

cols = ["source_position", "item_code", "uom", "display_name", "detected_brand", "detected_model"]

rows = list(csv.DictReader(open(LOOP / "chat-assignments" / "chat-01.csv", encoding="utf-8-sig")))
br = [r for r in rows if (r.get("detected_brand") or "").strip()]
with open(C01 / "harvest-brief-block.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=cols); w.writeheader()
    for r in br:
        w.writerow({k: r.get(k, "") for k in cols})
print("block branded:", len(br))

lc = list(csv.DictReader(open(LOOP / "chat-assignments" / "chat-01-livecheck-open.csv", encoding="utf-8-sig")))
lb = [r for r in lc if (r.get("detected_brand") or "").strip()]
with open(C01 / "harvest-brief-livecheck.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=cols); w.writeheader()
    for r in lb:
        w.writerow({k: r.get(k, "") for k in cols})
print("livecheck branded:", len(lb), "of", len(lc))
