#!/usr/bin/env python3
"""Regenerate hashes.csv from chat-06 evidence shards + update queue-r1.csv."""
import csv, json
from pathlib import Path

HERE = Path(__file__).resolve().parent
LS = HERE.parent

ev = {}
for ef in sorted(LS.glob("evidence-shard-chat06-*.json")):
    ev.update(json.loads(ef.read_text(encoding="utf-8")))

assign = {r["source_position"]: r for r in csv.DictReader(
    (LS / "chat-assignments" / "chat-06.csv").open(encoding="utf-8"))}

with (HERE / "hashes.csv").open("w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(["source_position", "item_code", "uom", "official_image_url",
                "image_sha256", "image_px_w", "image_px_h", "image_bytes"])
    for pos, e in sorted(ev.items(), key=lambda kv: int(kv[0])):
        a = assign.get(pos, {})
        w.writerow([pos, a.get("item_code", ""), a.get("uom", ""),
                    e.get("image_final_url", ""), e.get("image_sha256", ""),
                    e.get("px_w", ""), e.get("px_h", ""), e.get("image_bytes_len", "")])
print((HERE / "hashes.csv").read_text(encoding="utf-8"))

done = {}
for wf in sorted((HERE / "raw").glob("w*.jsonl")):
    try:
        n = int(wf.stem[1:])
    except ValueError:
        continue
    done[f"r1s{n:02d}"] = "ok"
for sid in ("r1s02", "r1s05"):
    if sid not in done:
        done[sid] = "wiped429_requeue"
with (HERE / "queue-r1.csv").open("w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(["shard", "status"])
    for i in range(1, 85):
        sid = f"r1s{i:02d}"
        w.writerow([sid, done.get(sid, "pending")])
print("queue updated")
