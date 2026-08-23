#!/usr/bin/env python3
"""Chat-03 local setup: dirs, slice claims, research batches, dup analysis."""
import csv, json, os, sys
from pathlib import Path

BASE = Path(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform")
RECOVER = BASE / "catalogue" / "ai-inbox" / "opencode-recover"
LS = RECOVER / "loop-state"
ME = LS / "chat-03"
CLAIMS = LS / "chat-assignments" / "claims"

for d in [ME, ME / "results", ME / "batches", ME / "sandbox", CLAIMS]:
    d.mkdir(parents=True, exist_ok=True)

claimed = []
for n in range(35, 52):
    sid = "S%04d" % n
    f = CLAIMS / (sid + ".claim")
    try:
        fh = os.open(str(f), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fh, b"chat=03 utc=2026-08-22 status=working\n")
        os.close(fh)
        claimed.append(sid)
    except FileExistsError:
        print("already claimed by other:", sid)

rows = list(csv.DictReader(open(LS / "chat-assignments" / "chat-03.csv", encoding="utf-8-sig")))
search = [r for r in rows if r["action"] != "duplicate_listing"]
dups = [r for r in rows if r["action"] == "duplicate_listing"]

B = 25
nb = 0
for i in range(0, len(search), B):
    nb += 1
    chunk = search[i:i + B]
    slim = [{k: r[k] for k in ("ordinal", "source_position", "item_code", "uom",
                               "display_name", "category", "detected_brand", "detected_model",
                               "prior_page", "prior_image", "prior_reason")} for r in chunk]
    (ME / "batches" / ("r%03d.json" % nb)).write_text(json.dumps(slim, ensure_ascii=False, indent=0), encoding="utf-8")

print("search rows:", len(search), "batches:", nb, "dup rows:", len(dups))
for r in dups:
    print("DUPROW", r["ordinal"], r["source_position"], r["item_code"], r["uom"], "|", r["display_name"])

pc = [r for r in search if r["prior_page"].strip()]
print("prior candidates:", len(pc))
for r in pc:
    print("PRIORCAND", r["source_position"], r["item_code"], "|", r["prior_page"][:110], "||", r["prior_image"][:90])

wl_path = RECOVER / "remaining-all-worklist.csv"
if wl_path.exists():
    wl = list(csv.DictReader(open(wl_path, encoding="utf-8-sig")))
    byk = {}
    for w in wl:
        byk.setdefault((w["item_code"], w["uom"]), []).append(w)
    for r in dups:
        tw = byk.get((r["item_code"], r["uom"]), [])
        print("TWINS pos", r["source_position"], r["item_code"], [(t["source_position"], t["action"]) for t in tw])
else:
    print("worklist missing")

json.dump({"claimed_slices": claimed, "num_batches": nb}, open(ME / "state-setup.json", "w"))
print("setup done")
