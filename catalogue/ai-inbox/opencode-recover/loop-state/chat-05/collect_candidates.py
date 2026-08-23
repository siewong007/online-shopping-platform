#!/usr/bin/env python3
"""Collect candidates from research/*.jsonl into a fetch list JSON.
Usage: collect_candidates.py out.json [--min-conf C]
Skips entries without an image_url. Records decision/no_result/blocked counts.
"""
import csv, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RES = HERE / "research"
LEDGER = HERE / "chat-05-ledger.csv"

rows = {r["source_position"]: r for r in csv.DictReader(open(LEDGER, newline="", encoding="utf-8"))}

out_path = Path(sys.argv[1])
holdfile = HERE / "hold.json"
held = set(json.loads(holdfile.read_text(encoding="utf-8"))) if holdfile.exists() else set()

_evid_p = HERE / "evidence-chat05.json"
green_pos = set()
if _evid_p.exists():
    _evd = json.loads(_evid_p.read_text(encoding="utf-8"))
    for _p, _e in _evd.items():
        _ct = _e.get("image_content_type") or ""
        if (_e.get("image_status") == 200 and _ct.startswith("image/")
                and (_e.get("image_bytes_len") or 0) >= 20000
                and max(_e.get("px_w") or 0, _e.get("px_h") or 0) >= 500):
            green_pos.add(str(_p))

items, stats = [], {"candidate": 0, "no_result": 0, "blocked": 0, "other": 0, "fetch": 0}
seen = set()
for f in sorted(RES.glob("r-batch-*.jsonl")):
    for ln, line in enumerate(open(f, encoding="utf-8"), 1):
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
        except Exception as e:
            print(f"WARN bad json {f.name}:{ln}: {e}")
            continue
        pos = str(d.get("pos", ""))
        dec = d.get("decision") or "other"
        stats[dec if dec in stats else "other"] += 1
        if pos not in rows:
            print(f"WARN pos {pos} not in ledger ({f.name})")
            continue
        seen.add(pos)
        if dec == "candidate" and d.get("image_url"):
            if pos in held:
                print(f"HOLD pos {pos} skipped by hold.json")
                continue
            if pos in green_pos:
                continue
            items.append({
                "pos": pos,
                "item_code": rows[pos]["item_code"],
                "uom": rows[pos]["uom"],
                "page_url": d.get("page_url", ""),
                "image_url": d["image_url"],
            })
            stats["fetch"] += 1

missing = [p for p in rows if p not in seen]
out_path.write_text(json.dumps({"items": items}, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"files_scanned": len(list(RES.glob('r-batch-*.jsonl'))),
                  "rows_covered_by_research": len(seen), **stats,
                  "not_yet_researched": len(missing)}))
