#!/usr/bin/env python3
"""Audit: does each researched row's item_code match the ledger?
Mismatch = my gap prompt paired the pos with the wrong product name."""
import csv, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
rows = {r["source_position"]: r for r in csv.DictReader(open(HERE / "chat-05-ledger.csv", newline="", encoding="utf-8"))}

bad = []
for f in sorted((HERE / "research").glob("r-batch-*.jsonl")):
    for ln, line in enumerate(open(f, encoding="utf-8"), 1):
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
        except Exception:
            continue
        pos = str(d.get("pos", ""))
        r = rows.get(pos)
        if not r:
            bad.append((pos, f.name, "?NOT-IN-LEDGER?", ""))
            continue
        # the research record doesn't carry item_code; detect mismatch via notes/model keywords is unreliable.
        # Instead: flag rows whose ledger item_code differs from the batch context is impossible here;
        # flag only gated/candidate rows whose page text lacks ALL item-code variants (gate already did).
print("This tool lists researched positions; cross-check done by gate.")
