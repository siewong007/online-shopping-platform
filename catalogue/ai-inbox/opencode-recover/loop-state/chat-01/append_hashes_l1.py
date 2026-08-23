#!/usr/bin/env python3
import csv
import json
import os

HASHES = r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\hashes.csv"
EV = r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\evidence-L1.json"
SHARD = r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\shard-L1.csv"

ev = json.load(open(EV, encoding="utf-8"))
meta = {}
with open(SHARD, newline="", encoding="utf-8") as fh:
    for r in csv.DictReader(fh):
        meta[r["source_position"]] = (r["item_code"], r["uom"], r["official_image_url"])

have = set()
if os.path.exists(HASHES):
    with open(HASHES, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            have.add(r["source_position"])

new = 0
exists = os.path.exists(HASHES)
with open(HASHES, "a", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    if not exists:
        w.writerow(["source_position", "item_code", "uom", "official_image_url",
                    "image_sha256", "image_px_w", "image_px_h", "image_bytes"])
    for pos, e in sorted(ev.items(), key=lambda kv: int(kv[0])):
        if not isinstance(e, dict) or not e.get("image_sha256"):
            continue
        if pos in have:
            continue
        code, uom, imgurl = meta.get(pos, ("", "", ""))
        w.writerow([pos, code, uom, imgurl or e.get("image_final_url", ""), e["image_sha256"],
                    e.get("px_w", 0), e.get("px_h", 0), e.get("image_bytes_len", 0)])
        new += 1
print("appended", new, "hash rows")
