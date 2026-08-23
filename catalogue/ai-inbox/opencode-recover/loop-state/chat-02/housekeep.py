import sys, csv, os, json, socket, subprocess
socket.setdefaulttimeout(25)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
LS = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state")

# 1. patch fetchlib: fetch_page persists evidence; field-level merge
p = os.path.join(CH, "fetchlib.py")
src = open(p, encoding="utf-8").read()
o1 = 'rec["page_error"] = repr(e)[:120]\n    return rec'
n1 = 'rec["page_error"] = repr(e)[:120]\n    append_evidence({str(pos): rec})\n    return rec'
o2 = '''        old = data.get(k)
        if old is None or (v.get("fetched_round") or 0) >= (old.get("fetched_round") or 0):
            data[k] = v'''
n2 = '''        cur = dict(data.get(k) or {})
        cur.update({kk: vv for kk, vv in v.items() if vv is not None})
        data[k] = cur'''
done = []
if o1 in src and "append_evidence({str(pos): rec})" not in src:
    src = src.replace(o1, n1); done.append("page_ev")
if o2 in src and "cur.update(" not in src:
    src = src.replace(o2, n2); done.append("merge")
open(p, "w", encoding="utf-8").write(src)
print("patched:", done)

sys.path.insert(0, CH)
import importlib, fetchlib as F
importlib.reload(F)

# 2. briefs 1020+ (idempotent)
rows = list(csv.DictReader(open(os.path.join(LS, "chat-assignments", "chat-02.csv"), encoding="utf-8-sig")))
cols = list(rows[0].keys())
made = []
for lo in range(1020, 1680, 30):
    hi = min(lo + 29, 1678)
    fn = os.path.join(CH, "brief-%d-%d.csv" % (lo, hi))
    if os.path.exists(fn) and os.path.getsize(fn) > 60:
        continue
    sel = [r for r in rows if lo <= int(r["ordinal"]) <= hi]
    with open(fn, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols); w.writeheader()
        for r in sel:
            w.writerow(r)
    made.append((lo, len(sel)))
print("briefs made:", made)

# 3. backfill 918 page evidence
try:
    r = F.fetch_page(918, "https://estore.jayamata.com.my/product/jm317-stainless-steel-red-handle-scissor-7-3-4")
    print("918 page:", {k: r.get(k) for k in ("page_status", "text_len")})
except Exception as e:
    print("918 backfill fail:", repr(e)[:120])
ev = F.load_evidence()
print("918 ev fields:", sorted(ev.get("918", {}).keys()))

# 4. inventory of open + schema-red rows
reds4 = {"904", "919", "921", "927"}
opens = []
for fn in sorted(os.listdir(CH)):
    if fn.startswith("shard-") and fn.endswith(".csv"):
        for row in csv.DictReader(open(os.path.join(CH, fn), encoding="utf-8")):
            if row["state"] == "open" or row["source_position"] in reds4:
                opens.append((row["source_position"], row["item_code"][:30], row["state"], row["tiers_tried"]))
print("open-or-red rows:", len(opens))
for o in opens:
    print(o)

# 5. gate r2
res = subprocess.run([sys.executable, os.path.join(CH, "run_gate.py"), "--round", "2"],
                     capture_output=True, text=True, timeout=110)
print(res.stdout[-900:])
print(res.stderr[-300:])
