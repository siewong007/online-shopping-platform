#!/usr/bin/env python3
"""Which ledger positions have no research record yet?"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
import csv
rows = list(csv.DictReader(open(HERE / "chat-05-ledger.csv", newline="", encoding="utf-8")))
order = [r["source_position"] for r in rows]
done = set()
for f in (HERE / "research").glob("r-batch-*.jsonl"):
    for line in open(f, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        try:
            done.add(str(json.loads(line)["pos"]))
        except Exception:
            pass
missing = [p for p in order if p not in done]
print(f"researched={len(done)} missing={len(missing)}")
print("MISSING_POS:" + ",".join(missing))
