import csv, json, datetime, shutil
from pathlib import Path
BASE = Path(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover")
CHAT = BASE / "loop-state" / "chat-04"
CLAIMS = BASE / "loop-state" / "chat-assignments" / "claims"
(CHAT / "batches").mkdir(parents=True, exist_ok=True)
(CHAT / "gate-run" / "pagecache").mkdir(parents=True, exist_ok=True)
shutil.copyfile(BASE / "loop-state" / "gate.py", CHAT / "gate-run" / "gate.py")  # verbatim copy, not modified

claimed, skipped = [], []
for sid in ["S%04d" % i for i in range(52, 69)]:
    p = CLAIMS / (sid + ".claim")
    try:
        with open(p, "x", encoding="utf-8") as fh:
            fh.write("chat=04,utc=%s,status=working" % datetime.datetime.utcnow().isoformat())
        claimed.append(sid)
    except FileExistsError:
        skipped.append(sid)
print("claimed:", claimed)
print("skipped:", skipped)

rows = list(csv.DictReader(open(CHAT.parent / "chat-assignments" / "chat-04.csv", encoding="utf-8")))
print("rows:", len(rows))
open_rows = [r for r in rows if (r.get("ledger_state") or "open") == "open"]
print("open:", len(open_rows))

def fam(ic):
    parts = ic.split("-")
    return "-".join(parts[:3]) if len(parts) > 3 else ic

fams = {}
for r in open_rows:
    fams.setdefault(fam(r["item_code"]), []).append(r)
print("families:", len(fams))
big = sorted(((len(v), k) for k, v in fams.items()), reverse=True)[:12]
print("biggest families:", big)

batches, cur = [], []
for k in sorted(fams):
    g = fams[k]
    while g:
        take = g[:25 - len(cur)]
        cur += take; g = g[len(take):]
        if len(cur) == 25:
            batches.append(cur); cur = []
if cur: batches.append(cur)
print("batches:", len(batches), [len(b) for b in batches])
for i, b in enumerate(batches, 1):
    out = [{"ordinal": r["ordinal"], "source_position": r["source_position"], "item_code": r["item_code"],
            "uom": r["uom"], "display_name": r["display_name"], "category": r["category"],
            "detected_brand": r["detected_brand"], "detected_model": r["detected_model"],
            "action": r["action"]} for r in b]
    json.dump(out, open(CHAT / "batches" / ("batch-%02d.json" % i), "w", encoding="utf-8"), indent=1)
print("batch files written")
