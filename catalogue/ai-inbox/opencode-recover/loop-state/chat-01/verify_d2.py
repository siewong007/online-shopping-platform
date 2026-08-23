#!/usr/bin/env python3
"""D2 finalizer step 3: enforce >=500px AND >=20KB, cross-check sha/url uniqueness,
demote failures, append hashes.csv."""
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
EV = HERE / "evidence-D2.json"
SHARD = HERE / "shard-d2.csv"
HASHES = HERE / "hashes.csv"

ev = json.loads(EV.read_text(encoding="utf-8"))
rows = list(csv.DictReader(open(SHARD, newline="", encoding="utf-8")))

seen_sha = {}
seen_url = {}
problems = []
hash_rows = []

for r in rows:
    pos = r["source_position"]
    e = ev.get(pos, {})
    if r["researcher_decision"] != "candidate":
        continue
    ok = (e.get("image_status") == 200
          and max(e.get("px_w", 0) or 0, e.get("px_h", 0) or 0) >= 500
          and (e.get("image_bytes_len", 0) or 0) >= 20000)
    sha = e.get("image_sha256", "")
    url = (e.get("image_final_url") or "").split("?")[0]
    if not ok:
        problems.append((pos, f"floor-fail px={e.get('px_w')}x{e.get('px_h')} "
                              f"bytes={e.get('image_bytes_len')} status={e.get('image_status')}"))
        r["researcher_decision"] = "pending"
        r["match_confidence"] = "C"
        r["finish_exact"] = ""
        r["model_exact"] = ""
        r["rights_status"] = "no_asset"
        r["reason"] += f" | D2-bytecheck DEMOTED: {problems[-1][1]}"
        r["human_action"] = "request qualifying (>500px, >20KB) product photo from brand/dealer"
        continue
    if sha in seen_sha:
        problems.append((pos, f"sha-collides-with-pos-{seen_sha[sha]}"))
        r["researcher_decision"] = "pending"
        r["reason"] += f" | D2-bytecheck DEMOTED: sha collision with pos {seen_sha[sha]}"
        continue
    if url in seen_url:
        problems.append((pos, f"url-collides-with-pos-{seen_url[url]}"))
        r["researcher_decision"] = "pending"
        r["reason"] += f" | D2-bytecheck DEMOTED: url collision with pos {seen_url[url]}"
        continue
    seen_sha[sha] = pos
    seen_url[url] = pos
    hash_rows.append({
        "source_position": pos, "item_code": r["item_code"], "uom": r["uom"],
        "official_image_url": r["official_image_url"], "image_sha256": sha,
        "image_px_w": e.get("px_w"), "image_px_h": e.get("px_h"),
        "image_bytes": e.get("image_bytes_len")})

with open(SHARD, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

new = 0
if hash_rows:
    exists = HASHES.exists()
    with open(HASHES, "a", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["source_position", "item_code", "uom",
                                           "official_image_url", "image_sha256",
                                           "image_px_w", "image_px_h", "image_bytes"])
        if not exists or HASHES.stat().st_size == 0:
            w.writeheader()
        w.writerows(hash_rows)
        new = len(hash_rows)

print(f"kept candidates={len(hash_rows)} demoted={len(rows) - len(hash_rows) - 13} "
      f"(13 structural pendings) hash-append={new}")
for p in problems:
    print("PROBLEM", p)
for h in hash_rows:
    print(f"OK {h['source_position']} {h['image_px_w']}x{h['image_px_h']} "
          f"{h['image_bytes']}B {h['image_sha256'][:12]}...")
