#!/usr/bin/env python3
"""chat-09 local evidence fetcher - drives frozen fetch_evidence.fetch_row."""
import csv, json, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

MY = Path(__file__).resolve().parent
LOOP = MY.parent
sys.path.insert(0, str(LOOP))
import importlib.util
spec = importlib.util.spec_from_file_location("fe", LOOP / "fetch_evidence.py")
fe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fe)

EV_PATH = MY / "evidence-r1.json"
HASHES = MY / "hashes.csv"

ev_all = {}
if EV_PATH.exists():
    ev_all = json.loads(EV_PATH.read_text(encoding="utf-8"))

with open(MY / "r1" / "shard-r1-candidates.csv", encoding="utf-8-sig") as f:
    cands = [r for r in csv.DictReader(f)]
# skip rows already fetched OK this round
cands = [r for r in cands if ev_all.get(r["source_position"], {}).get("image_status") != 200]
print("candidates:", len(cands))

todo = [(r["source_position"], r["official_product_page"].strip(),
         r["official_image_url"].strip()) for r in cands]

results = {}
with ThreadPoolExecutor(max_workers=15) as ex:
    futs = {ex.submit(fe.fetch_row, p, pg, im): p for p, pg, im in todo if pg or im}
    for fut in as_completed(futs):
        p = futs[fut]
        try:
            ev = fut.result()
        except Exception as e:
            ev = {"page_status": -1, "image_status": -1, "error": repr(e)}
        ev["fetched_round"] = 1
        results[p] = ev

ev_all.update(results)
EV_PATH.write_text(json.dumps(ev_all), encoding="utf-8")

ok = sum(1 for e in results.values() if e.get("image_status") == 200)
pok = sum(1 for e in results.value if False) if False else sum(1 for e in results.values() if e.get("page_status") == 200)
print("pages_ok=%d images_ok=%d total=%d" % (pok, ok, len(results)))

# append to hashes.csv
newfile = not HASHES.exists()
with open(HASHES, "a", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    if newfile:
        w.writerow(["source_position", "item_code", "uom", "official_image_url",
                    "image_sha256", "image_px_w", "image_px_h", "image_bytes"])
    bypos = {r["source_position"]: r for r in cands}
    for p, e in sorted(results.items()):
        r = bypos[p]
        w.writerow([p, r["item_code"], r["uom"], e.get("image_final_url", ""),
                    e.get("image_sha256", ""), e.get("px_w", ""), e.get("px_h", ""),
                    e.get("image_bytes_len", "")])
print("hashes.csv appended")

for p, e in sorted(results.items()):
    if e.get("image_status") != 200:
        print("FAILIMG", p, e.get("image_status"), str(e.get("image_final_url"))[:90])
    elif max(int(e.get("px_w") or 0), int(e.get("px_h") or 0)) < 500 or int(e.get("image_bytes_len") or 0) < 20000:
        print("SMALL ", p, "%sx%s %sB" % (e.get("px_w"), e.get("px_h"), e.get("image_bytes_len")))
