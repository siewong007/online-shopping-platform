#!/usr/bin/env python3
"""Append rows (as JSON list-of-lists in a sidecar file) to shard-0251-0350.csv, dedupe by source_position."""
import csv, json, sys
from pathlib import Path

D = Path(__file__).resolve().parent
SHARD = D / "shard-0251-0350.csv"
NEW = D / "f2-new-rows.json"

HDR = ["source_position","item_code","uom","official_product_page","official_image_url",
       "researcher_decision","match_confidence","finish_exact","model_exact","uom_assessment",
       "rights_status","reason","human_action"]

rows = list(csv.DictReader(open(SHARD, newline="", encoding="utf-8")))
fn = list(rows[0].keys()) if rows else HDR
have = {r["source_position"] for r in rows}
added = 0
if NEW.exists():
    for rec in json.loads(NEW.read_text(encoding="utf-8")):
        if str(rec[0]) in have:
            continue
        rows.append(dict(zip(fn, [str(x) for x in rec])))
        have.add(str(rec[0])); added += 1
w = csv.DictWriter(open(SHARD, "w", newline="", encoding="utf-8"), fieldnames=fn)
w.writeheader(); w.writerows(rows)
print(f"added={added} total={len(rows)}")
