#!/usr/bin/env python3
"""Build D2 brief: exactly the assigned source_positions, from loop-ledger.csv."""
import csv
from pathlib import Path

HERE = Path(__file__).resolve().parent
LEDGER = HERE.parent / "loop-ledger.csv"
WANT = ["134", "138", "153", "168", "174", "178", "185", "186", "197", "201",
        "227", "232", "3872", "5009", "4976", "6227", "3623", "4225",
        "131", "3756", "3593"]
COLS = ["source_position", "item_code", "uom", "display_name",
        "detected_brand", "detected_model"]

rows = {}
with open(LEDGER, newline="", encoding="utf-8") as fh:
    for r in csv.DictReader(fh):
        rows[r["source_position"]] = r

out = []
missing = []
for w in WANT:
    r = rows.get(w)
    if not r:
        missing.append(w)
        continue
    out.append({c: r.get(c, "") for c in COLS})

with open(HERE / "brief-d2.csv", "w", newline="", encoding="utf-8") as fh:
    wtr = csv.DictWriter(fh, fieldnames=COLS)
    wtr.writeheader()
    wtr.writerows(out)

print(f"brief rows={len(out)} missing={missing}")
for o in out:
    print(o["source_position"], "|", o["item_code"], "|", o["uom"], "|",
          o["display_name"][:60], "|", o["detected_brand"], "|", o["detected_model"])
