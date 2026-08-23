#!/usr/bin/env python3
"""Chat-03: fetch hard evidence (page bytes, image bytes, sha, px) for candidate rows.
Usage: python fetch_batch.py r005 r006 ...
Writes/merges sandbox/evidence-chat03.json, rewrites hashes.csv (deduped by position).
"""
import csv, json, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = Path(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform")
RECOVER = BASE / "catalogue" / "ai-inbox" / "opencode-recover"
LS = RECOVER / "loop-state"
ME = LS / "chat-03"
sys.path.insert(0, str(LS))
import fetch_evidence as FE

ROUND = 1

def main(batch_ids):
    hashes_path = ME / "hashes.csv"
    seen = {}
    if hashes_path.exists():
        for r in csv.DictReader(open(hashes_path, encoding="utf-8-sig")):
            seen[r["source_position"]] = r
    ev_path = ME / "sandbox" / "evidence-chat03.json"
    ev_all = json.loads(ev_path.read_text(encoding="utf-8")) if ev_path.exists() else {}
    assignment = {r["source_position"]: r for r in csv.DictReader(
        open(LS / "chat-assignments" / "chat-03.csv", encoding="utf-8-sig"))}
    todo = []
    for bid in batch_ids:
        rf = ME / "results" / ("research-%s.json" % bid)
        if not rf.exists():
            print("missing result file:", bid)
            continue
        try:
            data = json.loads(rf.read_text(encoding="utf-8"))
        except Exception as e:
            print("bad json", bid, repr(e))
            continue
        for row in data:
            if row.get("decision") != "candidate":
                continue
            pos = str(row["source_position"])
            page = (row.get("official_product_page") or "").strip()
            img = (row.get("official_image_url") or "").strip()
            if not page or not img:
                print("candidate missing urls pos=%s" % pos)
                continue
            todo.append((pos, page, img))
    print("to fetch:", len(todo))
    fetched = {}
    with ThreadPoolExecutor(max_workers=16) as ex:
        futs = {ex.submit(FE.fetch_row, p, pg, im): p for p, pg, im in todo}
        for fut in as_completed(futs):
            p = futs[fut]
            try:
                ev = fut.result()
            except Exception as e:
                ev = {"page_status": -1, "image_status": -1, "error": repr(e)}
            ev["fetched_round"] = ROUND
            fetched[p] = ev
    ev_all.update(fetched)
    ok_img = ok_page = 0
    for pos, ev in fetched.items():
        if ev.get("page_status") == 200:
            ok_page += 1
        if ev.get("image_status") == 200 and int(ev.get("image_bytes_len") or 0) >= 20000:
            ok_img += 1
        if ev.get("image_status") == 200 and ev.get("image_sha256"):
            a = assignment.get(pos)
            if a:
                seen[pos] = {
                    "source_position": pos, "item_code": a["item_code"], "uom": a["uom"],
                    "official_image_url": ev.get("image_final_url", ""),
                    "image_sha256": ev.get("image_sha256", ""),
                    "image_px_w": ev.get("px_w", 0), "image_px_h": ev.get("px_h", 0),
                    "image_bytes": ev.get("image_bytes_len", 0),
                }
    bysha = {}
    for pos, r in sorted(seen.items()):
        bysha.setdefault(r["image_sha256"], []).append(pos)
    coll = {s: p for s, p in bysha.items() if len(p) > 1}
    w = csv.DictWriter(open(hashes_path, "w", newline="", encoding="utf-8"),
                       fieldnames=["source_position", "item_code", "uom", "official_image_url",
                                   "image_sha256", "image_px_w", "image_px_h", "image_bytes"])
    w.writeheader()
    w.writerows(seen.values())
    ev_path.write_text(json.dumps(ev_all), encoding="utf-8")
    print("fetched=%d pages_ok=%d images_ok(>=20KB)=%d" % (len(fetched), ok_page, ok_img))
    if coll:
        print("INTRA-BLOCK SHA COLLISIONS (family heroes):")
        for s, p in coll.items():
            print("  ", s[:20], p)
    else:
        print("no intra-block sha collisions")

if __name__ == "__main__":
    main(sys.argv[1:])
