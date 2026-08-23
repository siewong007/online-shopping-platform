#!/usr/bin/env python3
"""Validate shard-0251-0350.csv against chat-01.csv ordinals 251-350 and hashes.csv uniqueness."""
import csv, json
from pathlib import Path

D = Path(__file__).resolve().parent
SHARD = D / "shard-0251-0350.csv"
HASHES = D / "hashes.csv"
ASG = D.parent / "chat-assignments" / "chat-01.csv"

HDR = ["source_position","item_code","uom","official_product_page","official_image_url",
       "researcher_decision","match_confidence","finish_exact","model_exact","uom_assessment",
       "rights_status","reason","human_action"]

rows = list(csv.DictReader(open(SHARD, newline="", encoding="utf-8")))
hdr_ok = list(rows[0].keys()) == HDR
asg = [a for a in csv.DictReader(open(ASG, newline="", encoding="utf-8")) if 251 <= int(a["ordinal"]) <= 350]
mine = {a["source_position"]: a["item_code"] for a in asg}
got = {r["source_position"] for r in rows}
missing = sorted(set(mine) - got)
extra = sorted(got - set(mine))
mismatch = [(r["source_position"], r["item_code"], mine.get(r["source_position"]))
            for r in rows if r["source_position"] in mine and r["item_code"] != mine[r["source_position"]]]

hrows = list(csv.reader(open(HASHES, newline="", encoding="utf-8")))
hbody = hrows[1:]
pairs = [(r[0], r[4]) for r in hbody]
dup_pairs = len(pairs) - len(set(pairs))
dup_urls = len(pairs) - len(set((r[3]) for r in hbody))

cand = [r for r in rows if r["researcher_decision"] == "candidate"]
pend = [r for r in rows if r["researcher_decision"] == "pending"]
rej = [r for r in rows if r["researcher_decision"] == "reject"]

bad_cand = []
for r in cand:
    ev = json.loads((D / "evidence-F2.json").read_text(encoding="utf-8")).get(r["source_position"], {})
    ok = ev.get("image_status") == 200 and ev.get("px_w", 0) >= 500 and ev.get("image_bytes_len", 0) >= 20480 \
         and ev.get("image_content_type", "").startswith("image") and r["model_exact"] == "yes" and r["finish_exact"] == "yes"
    sha_in_hashes = any(h[4] == ev.get("image_sha256") for h in hbody)
    if not (ok and sha_in_hashes):
        bad_cand.append(r["source_position"])

print(f"header_exact={hdr_ok} rows={len(rows)} missing={missing} extra={extra} item_mismatch={mismatch}")
print(f"candidate={len(cand)} pending={len(pend)} reject={len(rej)}")
print(f"hashes_rows={len(hbody)} dup_url_sha_pairs={dup_pairs} dup_urls={dup_urls}")
print(f"candidates_failing_bar={bad_cand}")
