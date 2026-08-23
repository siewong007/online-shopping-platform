#!/usr/bin/env python3
"""Chat-03: build blind-verifier input files from fetched evidence.
Verify-ready = page 200 + image 200 + >=20KB + long_edge>=500 + unique sha in block."""
import csv, json, sys
from pathlib import Path

BASE = Path(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform")
RECOVER = BASE / "catalogue" / "ai-inbox" / "opencode-recover"
LS = RECOVER / "loop-state"
ME = LS / "chat-03"

def main():
    ev = json.loads((ME / "sandbox" / "evidence-chat03.json").read_text(encoding="utf-8"))
    assign = {r["source_position"]: r for r in csv.DictReader(
        open(LS / "chat-assignments" / "chat-03.csv", encoding="utf-8-sig"))}
    bysha = {}
    for pos, e in ev.items():
        if e.get("image_status") == 200 and e.get("image_sha256"):
            bysha.setdefault(e["image_sha256"], []).append(pos)
    coll_pos = {p for ps in bysha.values() if len(ps) > 1 for p in ps}
    ready = []
    blocked = []
    for pos, e in sorted(ev.items(), key=lambda kv: int(kv[0])):
        a = assign.get(pos)
        if not a:
            continue
        ok = (e.get("page_status") == 200 and e.get("image_status") == 200
              and int(e.get("image_bytes_len") or 0) >= 20000
              and max(int(e.get("px_w") or 0), int(e.get("px_h") or 0)) >= 500)
        if pos in coll_pos:
            blocked.append((pos, "sha-collision"))
            continue
        if not ok:
            blocked.append((pos, "evidence-not-ok"))
            continue
        ready.append({
            "source_position": pos,
            "item_code": a["item_code"],
            "uom": a["uom"],
            "display_name": a["display_name"],
            "category": a["category"],
            "official_product_page": e.get("page_final_url", ""),
            "official_image_url": e.get("image_final_url", ""),
            "asset_file": e.get("asset_file", ""),
        })
    vdir = ME / "vin"
    vdir.mkdir(exist_ok=True)
    CH = 12
    nv = 0
    for i in range(0, len(ready), CH):
        nv += 1
        (vdir / ("v%03d.json" % nv)).write_text(json.dumps(ready[i:i+CH], ensure_ascii=False, indent=0), encoding="utf-8")
    print("verify-ready:", len(ready), "blocked:", len(blocked), "chunks:", nv)
    for pos, why in blocked:
        print("BLOCKED", pos, why)

if __name__ == "__main__":
    main()
