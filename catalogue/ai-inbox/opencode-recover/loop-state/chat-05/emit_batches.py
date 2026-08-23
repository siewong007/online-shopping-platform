#!/usr/bin/env python3
"""Emit compact research batches: BATCH NN lines + pos|code|uom|name|category rows."""
import csv, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
B = 12
if len(sys.argv) > 1:
    lo, hi = int(sys.argv[1]), int(sys.argv[2])   # batch numbers inclusive
else:
    lo, hi = 1, 10 ** 6
rows = list(csv.DictReader(open(HERE / "chat-05-ledger.csv", newline="", encoding="utf-8")))
batches = [rows[i:i + B] for i in range(0, len(rows), B)]
out = []
for bi, b in enumerate(batches, 1):
    if bi < lo or bi > hi:
        continue
    out.append(f"BATCH {bi:02d} ({len(b)} rows)")
    for r in b:
        out.append(f"{r['source_position']}|{r['item_code']}|{r['uom']}|{r['display_name']}|{r['category']}")
print("\n".join(out))
