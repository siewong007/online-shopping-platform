#!/usr/bin/env python3
"""Print exact ledger lines for the next N unresearched positions (prompt-safe)."""
import csv, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
N = int(sys.argv[1]) if len(sys.argv) > 1 else 12
SKIP = int(sys.argv[2]) if len(sys.argv) > 2 else 0

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

rows = list(csv.DictReader(open(HERE / "chat-05-ledger.csv", newline="", encoding="utf-8")))
missing = [r for r in rows if r["source_position"] not in done]
chunk = missing[SKIP:SKIP + N]
for r in chunk:
    print(f"{r['source_position']}|{r['item_code']}|{r['uom']}|{r['display_name']}|{r['category']}")
print(f"--missing_total={len(missing)}", file=sys.stderr)
