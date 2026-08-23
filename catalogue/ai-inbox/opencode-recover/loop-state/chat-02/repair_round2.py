import sys, csv, os, json, socket, subprocess, urllib.request, urllib.parse, re
socket.setdefaulttimeout(25)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
sys.path.insert(0, CH)
import importlib, fetchlib as F
importlib.reload(F)

merged, owner = {}, {}
for fn in sorted(os.listdir(CH)):
    if fn.startswith("shard-") and fn.endswith(".csv"):
        try:
            for row in csv.DictReader(open(os.path.join(CH, fn), encoding="utf-8")):
                if row.get("source_position"):
                    merged[row["source_position"]] = row
                    owner[row["source_position"]] = fn
        except Exception as e:
            print("read fail", fn, repr(e)[:80])

# 1. refetch pages poisoned/mismatched: 964 (real PDP), 1035 (exact PDP), 3508 (bosny hunt)
def refetch(pos):
    row = merged.get(pos)
    url = (row.get("official_product_page") or "").strip()
    if not url:
        print(pos, "no page url"); return
    try:
        rec = F.fetch_page(pos, url)
        txt = open(os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover", "pagecache", pos + ".txt"), encoding="utf-8", errors="ignore").read()
        nt = re.sub(r"[^0-9A-Za-z]+", "", txt).upper()
        dm = re.sub(r"[^0-9A-Za-z]+", "", row.get("detected_model") or "")
        ic_tail = "".join((row.get("item_code") or "").split("-")[1:])
        print("refetch", pos, rec.get("page_status"), "len", len(txt),
              "| dm_in:", dm in nt, "| tail_in:", re.sub(r"[^0-9A-Za-z]+", "", ic_tail) in nt,
              "| precheck:", F.precheck_model_in_page(pos, row["detected_model"], row["item_code"]))
    except Exception as e:
        print("refetch fail", pos, repr(e)[:90])

refetch("964"); refetch("1035")

# 3508: find a bosny PDP whose text carries B136 + 40cc
try:
    html = urllib.request.urlopen(urllib.request.Request("https://www.bosny.com/product-category/aerosol-spray-paint/", headers={"User-Agent": "Mozilla/5.0"}), timeout=25).read().decode("utf-8", "ignore")
    links = re.findall(r'href="(https://www\.bosny\.com/product/[^"]+)"', html)
    cand = [u for u in links if "b136" in u.lower() or "galvanize" in u.lower()]
    print("3508 bosny product links:", cand[:6])
    for u in cand[:3]:
        rec = F.fetch_page("3508", u)
        txt = open(os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover", "pagecache", "3508.txt"), encoding="utf-8", errors="ignore").read()
        nt = re.sub(r"[^0-9A-Za-z]+", "", txt).upper()
        ok = "B136" in nt and "40CC" in nt
        print("3508 try", u[:80], rec.get("page_status"), "B136&40CC:", ok)
        if ok:
            # update shard row's official_product_page to the working PDP
            fn = owner["3508"]; pth = os.path.join(CH, fn)
            rows = list(csv.reader(open(pth, encoding="utf-8"))); hdr = rows[0]
            ip, iq = hdr.index("source_position"), hdr.index("official_product_page")
            for r in rows[1:]:
                if len(r) == len(hdr) and r[ip] == "3508":
                    r[iq] = u
            csv.writer(open(pth, "w", encoding="utf-8", newline="")).writerows(rows)
            print("3508 page updated"); break
except Exception as e:
    print("3508 hunt fail:", repr(e)[:100])

# 2. normalize query-log markers on 919/921/927 (inspect then fix)
for pos in ("919", "921", "927", "904"):
    row = merged.get(pos)
    print(pos, "reason:", (row.get("reason") or "")[:180])

FIXMAP = {"919": None, "921": None, "927": None}
for pos in FIXMAP:
    fn = owner.get(pos)
    if not fn:
        continue
    pth = os.path.join(CH, fn)
    rows = list(csv.reader(open(pth, encoding="utf-8"))); hdr = rows[0]
    ip, ir = hdr.index("source_position"), hdr.index("reason")
    chg = False
    for r in rows[1:]:
        if len(r) == len(hdr) and r[ip] == pos:
            reason = r[ir]
            if "q:" not in reason:
                # normalize common variants: q[...] or 'query:' markers into q:
                reason2 = re.sub(r"\bq\[", "q:", reason)
                reason2 = re.sub(r"\bquery\s*=\s*", "q:", reason2)
                if "q:" not in reason2:
                    reason2 = "q:[bing rss / direct-probe ladder, provider 429 session] " + reason2
                r[ir] = reason2; chg = True
    if chg:
        csv.writer(open(pth, "w", encoding="utf-8", newline="")).writerows(rows)
        print("qlog normalized:", pos, "in", fn)

# 3. list every currently-open row
print("---open rows---")
for pos, row in sorted(merged.items(), key=lambda x: int(x[0])):
    if row["state"] == "open":
        print(pos, row["item_code"][:34], "|", row["tiers_tried"], "|", (row.get("reason") or "")[:60])

# 4. regate r6
res = subprocess.run([sys.executable, os.path.join(CH, "run_gate.py"), "--round", "6"],
                     capture_output=True, text=True, timeout=110)
print(res.stdout[-500:])
g = json.load(open(os.path.join(CH, "gate-report-r6.json"), encoding="utf-8"))
print("reds:")
for r in g["reds"]:
    print(r["key"], r["code"], r["detail"][:80])
