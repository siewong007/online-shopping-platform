#!/usr/bin/env python3
"""Append G2 evidence hashes to chat-01/hashes.csv (dedupe by source_position+sha)."""
import csv, json, os

BASE = os.path.dirname(os.path.abspath(__file__))
HASHES = os.path.join(BASE, "hashes.csv")
EV = os.path.join(BASE, "evidence-G2.json")
SHARD = os.path.join(BASE, "shard-0351-0450.csv")

ev = json.load(open(EV, encoding="utf-8"))
meta = {}
with open(SHARD, newline="", encoding="utf-8") as fh:
    for r in csv.DictReader(fh):
        meta[r["source_position"]] = (r["item_code"], r["uom"])

existing = set()
with open(HASHES, newline="", encoding="utf-8") as fh:
    for r in csv.DictReader(fh):
        existing.add((r["source_position"], r["image_sha256"]))

new = 0
with open(HASHES, "a", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    for pos, e in ev.items():
        if not isinstance(e, dict) or not e.get("image_sha256"):
            continue
        if e.get("image_status") != 200:
            continue
        key = (pos, e["image_sha256"])
        if key in existing:
            print("skip dup", pos)
            continue
        code, uom = meta.get(pos, ("", ""))
        w.writerow([pos, code, uom, e.get("image_final_url", ""), e["image_sha256"],
                    e.get("px_w", 0), e.get("px_h", 0), e.get("image_bytes_len", 0)])
        existing.add(key)
        new += 1
print("appended", new, "rows ->", HASHES)
