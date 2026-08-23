import sys, csv, os, json, socket, subprocess, re, urllib.request
socket.setdefaulttimeout(25)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
PC = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover", "pagecache")

# ---------- 1. patch fetchlib ----------
p = os.path.join(CH, "fetchlib.py")
src = open(p, encoding="utf-8").read()
o1 = '''        if dm:
        n = norm_text(dm)
        if len(n) >= 3:
            out.append(n)
            toks = [norm_text(t) for t in re.split(r"[^0-9A-Za-z]+", dm) if norm_text(t)]
            longtoks = [t for t in toks if len(t) >= 4]
            if longtoks:
                out.append(("TOKENS:", longtoks))'''
n1 = '''        if dm:
        n = norm_text(dm)
        if len(n) >= 3:
            out.append(n)
            toks = [norm_text(t) for t in re.split(r"[^0-9A-Za-z]+", dm) if norm_text(t)]
            longtoks = [t for t in toks if len(t) >= 4]
            if longtoks:
                out.append("TOKENS:" + "|".join(longtoks))'''
if o1 in src:
    src = src.replace(o1, n1)

o2 = '''    for v in out:
        key = tuple(v) if isinstance(v, tuple) else v
        if key not in seen:
            seen.add(key); uniq.append(v)
    return uniq'''
n2 = '''    for v in out:
        if v not in seen:
            seen.add(v); uniq.append(v)
    return uniq'''
if o2 in src:
    src = src.replace(o2, n2)

o3 = '''    for v in model_variants(detected_model, item_code):
        if isinstance(v, tuple):
            toks = v[1]
            if toks and all(t in nt for t in toks):
                return True
        elif len(v) >= 4 and v in nt:
            return True
    return False'''
n3 = '''    for v in model_variants(detected_model, item_code):
        if isinstance(v, str) and v.startswith("TOKENS:"):
            toks = [t for t in v.split(":", 1)[1].split("|") if t]
            if toks and all(t in nt for t in toks):
                return True
        elif isinstance(v, str) and len(v) >= 4 and v in nt:
            return True
    return False'''
if o3 in src:
    src = src.replace(o3, n3)

# append_evidence -> append-only JSONL + best-effort json view
o4 = src[src.index("def append_evidence"):src.index("def load_evidence")]
n4 = '''def append_evidence(chunk):
    os.makedirs(CHAT2, exist_ok=True)
    line = json.dumps({"_t": __import__("time").time(), "rec": chunk}, ensure_ascii=False)
    with open(os.path.join(CHAT2, "evidence-log.jsonl"), "a", encoding="utf-8") as fh:
        fh.write(line + "\\n")
    rebuild_evidence_view()

def rebuild_evidence_view():
    data = {}
    lp = os.path.join(CHAT2, "evidence-log.jsonl")
    if os.path.exists(lp):
        for ln in open(lp, encoding="utf-8", errors="ignore"):
            ln = ln.strip()
            if not ln:
                continue
            try:
                chunk = json.loads(ln)["rec"]
            except Exception:
                continue
            for k, v in chunk.items():
                cur = dict(data.get(k) or {})
                cur.update({kk: vv for kk, vv in v.items() if vv is not None})
                data[k] = cur
    tmp = EVIDENCE_PATH + ".tmp"
    json.dump(data, open(tmp, "w", encoding="utf-8"))
    os.replace(tmp, EVIDENCE_PATH)

'''
src = src.replace(o4, n4)
o5 = '''def load_evidence():
    if os.path.exists(EVIDENCE_PATH):
        return json.load(open(EVIDENCE_PATH, encoding="utf-8"))
    return {}'''
n5 = '''def load_evidence():
    rebuild_evidence_view()
    if os.path.exists(EVIDENCE_PATH):
        return json.load(open(EVIDENCE_PATH, encoding="utf-8"))
    return {}'''
if o5 in src:
    src = src.replace(o5, n5)
open(p, "w", encoding="utf-8").write(src)
print("fetchlib patched: tokens-string, jsonl-append, reload-view")

sys.path.insert(0, CH)
import importlib
import fetchlib as F
importlib.reload(F)

# ---------- 2. merge prior evidence.json entries into the JSONL log ----------
old_ev_path = os.path.join(CH, "evidence.json")
if os.path.exists(old_ev_path):
    try:
        legacy = json.load(open(old_ev_path, encoding="utf-8"))
        if legacy:
            F.append_evidence(legacy)
            print("legacy evidence folded:", len(legacy))
    except Exception as e:
        print("legacy fold fail:", repr(e)[:100])

ev = F.load_evidence()
print("evidence positions now:", len(ev))

# ---------- 3. find corrupt pagecache files ----------
corrupt = []
for fn in os.listdir(PC):
    if not fn.endswith(".txt"):
        continue
    pathh = os.path.join(PC, fn)
    try:
        head = open(pathh, encoding="utf-8", errors="ignore").read(3000)
    except Exception:
        continue
    if "Traceback (most recent" in head or "charmap_encode" in head:
        corrupt.append(fn)
print("corrupt pagecache:", corrupt)

# ---------- 4. rebuild merged shard view ----------
merged, owner = {}, {}
for fn in sorted(os.listdir(CH)):
    if fn.startswith("shard-") and fn.endswith(".csv"):
        for row in csv.DictReader(open(os.path.join(CH, fn), encoding="utf-8")):
            merged[row["source_position"]] = row
            owner[row["source_position"]] = fn

# refetch pages for corrupt caches among candidates/opens
for pos, row in merged.items():
    if pos + ".txt" in corrupt and row.get("official_product_page"):
        url = row["official_product_page"].strip()
        try:
            rec = F.fetch_page(pos, url)
            print("refetch", pos, {k: rec.get(k) for k in ("page_status", "text_len")})
        except Exception as e:
            print("refetch fail", pos, repr(e)[:90])

# ---------- 5. diagnose 1035 + refetch 3508 page ----------
for pos in ("1035", "3508"):
    txt = ""
    pp = os.path.join(PC, pos + ".txt")
    if os.path.exists(pp):
        txt = open(pp, encoding="utf-8", errors="ignore").read()
    row = merged.get(pos) or {}
    print(pos, "pagelen", len(txt), "| G503B in txt:", "G503B" in txt.upper(),
          "| B136 in txt:", "B136" in txt.upper(), "| 400CC:", "400CC" in txt.upper(),
          "| model:", row.get("detected_model"), "| item:", row.get("item_code"))

# ---------- 6. honest q: entry for 4309 (one real Bing RSS query) ----------
q = 'kancil PVC wiring casing trunking Malaysia'
try:
    rss = urllib.request.urlopen(urllib.request.Request(
        "https://www.bing.com/search?q=" + urllib.parse.quote(q) + "&format=rss",
        headers={"User-Agent": "Mozilla/5.0"}), timeout=25).read().decode("utf-8", "ignore")
    hits = len(re.findall(r"<item>", rss))
except Exception as e:
    hits = -1
print("4309 bing-rss hits:", hits)
row = merged.get("4309")
fn = owner.get("4309")
if row and fn and "q:" not in (row.get("reason") or ""):
    pathh = os.path.join(CH, fn)
    rows = list(csv.reader(open(pathh, encoding="utf-8")))
    hdr = rows[0]
    ip, ir = hdr.index("source_position"), hdr.index("reason")
    for r in rows[1:]:
        if len(r) == len(hdr) and r[ip] == "4309":
            r[ir] = (r[ir] + " | q:" + q + " (bing rss items=%d, none official; action=search)" % hits)[:2000]
    w = csv.writer(open(pathh, "w", encoding="utf-8", newline=""))
    w.writerows(rows)
    print("4309 reason patched with real query log")

# ---------- 7. regate r5 ----------
res = subprocess.run([sys.executable, os.path.join(CH, "run_gate.py"), "--round", "5"],
                     capture_output=True, text=True, timeout=110)
print(res.stdout[-600:])
g = json.load(open(os.path.join(CH, "gate-report-r5.json"), encoding="utf-8"))
for r in g["reds"]:
    print(r["key"], r["code"], r["detail"][:80])
