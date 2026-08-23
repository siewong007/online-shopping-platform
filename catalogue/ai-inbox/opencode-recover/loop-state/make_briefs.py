#!/usr/bin/env python3
"""Emit per-shard brief files (pipe-separated SKU lines) for worker subagents."""
import csv
from pathlib import Path

STATE = Path(__file__).resolve().parent
rows = list(csv.DictReader(open(STATE / "loop-ledger.csv", encoding="utf-8")))
opn = [r for r in rows if r["state"] == "open"]
out_dir = STATE / "round-01"
out_dir.mkdir(parents=True, exist_ok=True)
for i, chunk in enumerate([opn[j:j + 100] for j in range(0, len(opn), 100)][0:4]):
    fn = out_dir / f"shard-{i+1:02d}-brief.txt"
    with open(fn, "w", encoding="utf-8") as fh:
        fh.write("source_position|item_code|uom|display_name|category|detected_brand|detected_model\n")
        for r in chunk:
            fh.write("|".join([r["source_position"], r["item_code"], r["uom"],
                               r["display_name"], r["category"], r["detected_brand"],
                               r["detected_model"]]) + "\n")
    print(fn, len(chunk))
