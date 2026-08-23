import sys, csv, os, json, socket, subprocess
socket.setdefaulttimeout(25)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
sys.path.insert(0, CH)
import fetchlib as F

# merge shard view (later filename wins)
merged = {}
files = [fn for fn in sorted(os.listdir(CH)) if fn.startswith("shard-") and fn.endswith(".csv")]
owner = {}
for fn in files:
    for row in csv.DictReader(open(os.path.join(CH, fn), encoding="utf-8")):
        merged[row["source_position"]] = row
        owner[row["source_position"]] = fn

# 1. backfill page evidence for candidates lacking page_status
CANDS = ["964", "974", "980", "983", "984", "2682", "2795", "4755", "4913"]
ev = F.load_evidence()
for pos in CANDS:
    row = merged.get(pos)
    if not row:
        print(pos, "MISSING from shards"); continue
    e = ev.get(pos, {})
    if e.get("page_status") == 200:
        print(pos, "page ok already"); continue
    url = row.get("official_product_page", "").strip()
    if not url:
        print(pos, "NO PAGE URL"); continue
    try:
        rec = F.fetch_page(pos, url)
        print(pos, "backfill:", {k: rec.get(k) for k in ("page_status", "text_len")},
              "model_present:", F.precheck_model_in_page(pos, row["detected_model"], row["item_code"]))
    except Exception as ex:
        print(pos, "backfill FAIL:", repr(ex)[:100])

# 2. mechanical rights fix: invalid enums on non-candidate rows -> no_asset
VALID = {"needs_permission", "unknown", "no_asset"}
fixcount = 0
for pos, row in merged.items():
    rs = (row.get("rights_status") or "").strip().lower()
    if rs and rs not in VALID and row["state"] != "candidate":
        fn = owner[pos]
        path = os.path.join(CH, fn)
        rows = list(csv.reader(open(path, encoding="utf-8")))
        hdr = rows[0]
        i_pos = hdr.index("source_position"); i_rs = hdr.index("rights_status")
        changed = False
        for r in rows[1:]:
            if len(r) == len(hdr) and r[i_pos] == pos:
                r[i_rs] = "no_asset"; changed = True
        if changed:
            w = csv.writer(open(path, "w", encoding="utf-8", newline=""))
            w.writerows(rows)
            fixcount += 1
            print("rights fixed:", pos, "in", fn, "(was:", rs + ")")
print("rights fixes:", fixcount)

# 3. inspect 4309 reason + zpass2 coverage
for pos in ("4309",):
    row = merged.get(pos)
    if row:
        print(pos, "state=", row["state"], "| tiers=", row["tiers_tried"])
        print(pos, "reason head:", (row.get("reason") or "")[:220])

# 4. regate
res = subprocess.run([sys.executable, os.path.join(CH, "run_gate.py"), "--round", "4"],
                     capture_output=True, text=True, timeout=110)
print(res.stdout[-700:])
g = json.load(open(os.path.join(CH, "gate-report-r4.json"), encoding="utf-8"))
for r in g["reds"]:
    print(r["key"], r["code"], r["detail"][:90])
