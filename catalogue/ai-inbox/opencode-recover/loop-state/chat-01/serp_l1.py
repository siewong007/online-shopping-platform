#!/usr/bin/env python3
"""Run the six fixed tier-1 queries per SKU against Bing and archive SERPs.

Outputs chat-01/serp-L1/serps.json : pos -> [{q, url, kind, results:[[title,url]], note}]
kind: ok | no_results | safesearch | rewritten | error
If a query's leading phrase gets rewritten by Bing (junk X.com SERP), a
brand-led variant is also run and recorded with q_variant=True.
"""
import csv, json, re, sys, time, urllib.parse, urllib.request

BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state"
OUT = BASE + r"\chat-01\serp-L1"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}

SKUS = [
    ("627",  "Deka",      "X-One 46"),
    ("469",  "Khind",     "GC6010"),
    ("632",  "Deka",      "KONI 54"),
    ("826",  "Bosch",     "GKS 140"),
    ("640",  "Deka",      "Concept Mini"),
    ("991",  "Bosch",     "GO 3"),
    ("446",  "Khind",     "VC68P"),
    ("821",  "Bosch",     "GKS 235 Turbo"),
    ("810",  "Bosch",     "GAS 15 PS"),
    ("856",  "Bosch",     "GRW 140"),
    ("621",  "Panasonic", "F-M14DZVBKH"),
    ("578",  "Khind",     "SPC6"),
    ("440",  "Khind",     "VC8020MS"),
    ("950",  "Bosch",     "GDC 140"),
    ("449",  "Panasonic", "NI-317W"),
    ("442",  "Khind",     "HM200"),
    ("523",  "Khind",     "EI405"),
    ("986",  "Bosch",     "GST 90 BE"),
    ("647",  "Khind",     "VC8630"),
    ("477",  "Khind",     "EK502"),
    ("522",  "Khind",     "MC121"),
    ("2602", "Sika",      "SikaCeram-88"),
    ("2557", "Bosch",     "2608521043"),
    ("1202", "Saniware",  "SWS-304-3977"),
    ("1440", "Saniware",  "SW-SS-AV-80"),
    ("3772", "Cabana",    "CB6331"),
    ("1028", "Midea",     "MRM18010BDG"),
    ("1900", "Cabana",    "CB2807"),
    ("1996", "Cabana",    "CB91SS"),
    ("2022", "Cabana",    "CB65SS-GM"),
    ("2067", "Cabana",    "CB90SS"),
    ("3630", "Sika",      "Sikagard 703 Groutseal"),
    ("4880", "Cabana",    "CB2805A"),
    ("4881", "Cabana",    "CB2806A"),
]

def queries(brand, model):
    return [
        f'"{brand}" "{model}" site:.com.my',
        f'"{model}" "{brand}" official',
        f'"{model}" filetype:pdf',
        f'"{model}" site:leeden.com.my OR site:theleedenstore.com.my',
        f'"{brand}" "{model}" distributor Malaysia',
        f'"{model}" authorised dealer',
    ]

ALGO_RE = re.compile(r'<li class="b_algo".*?<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.S)
TAG_RE = re.compile(r"<[^>]+>")
XJUNK = re.compile(r"https?://[a-z.]*(x\.com|x\.company|about\.x|softonic\.com)", re.I)

def fetch(q):
    u = "https://www.bing.com/search?q=" + urllib.parse.quote_plus(q) + "&count=10&mkt=en-MY"
    req = urllib.request.Request(u, headers=UA)
    try:
        html = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", "ignore")
    except Exception as e:
        return u, "error", [], repr(e)[:100]
    res = []
    for m in ALGO_RE.finditer(html):
        href = urllib.parse.unquote(m.group(1))
        title = TAG_RE.sub("", m.group(2)).strip()
        res.append([title[:160], href[:300]])
    if not res or "SafeSearch" in html and len(res) == 0:
        if "SafeSearch" in html:
            return u, "safesearch", res, "safesearch-blocked"
        return u, "no_results", res, ""
    junk = sum(1 for _, h in res[:5] if XJUNK.search(h))
    if junk >= 3:
        return u, "rewritten", res, "bing-rewrote-leading-phrase"
    return u, "ok", res, ""

def main():
    import os
    os.makedirs(OUT, exist_ok=True)
    out_path = OUT + r"\serps.json"
    all_data = {}
    if os.path.exists(out_path):
        all_data = json.load(open(out_path, encoding="utf-8"))
    only = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    for pos, brand, model in SKUS:
        if only and pos not in only:
            continue
        rows = []
        for q in queries(brand, model):
            u, kind, res, note = fetch(q)
            rows.append({"q": q, "url": u, "kind": kind, "results": res[:8], "note": note})
            time.sleep(1.2)
            if kind == "rewritten":
                vq = f'"{brand}" ' + q[len(f'"{model}" '):]
                u2, kind2, res2, note2 = fetch(vq)
                rows.append({"q": vq, "url": u2, "kind": kind2, "results": res2[:8],
                             "note": (note2 + " variant-of-rewrite").strip()})
                time.sleep(1.2)
        all_data[pos] = rows
        json.dump(all_data, open(out_path, "w", encoding="utf-8"))
        summ = "; ".join(f"{r['kind']}:{len(r['results'])}" for r in rows)
        print(pos, brand, model, "->", summ, flush=True)
    print("saved", out_path)

if __name__ == "__main__":
    main()
