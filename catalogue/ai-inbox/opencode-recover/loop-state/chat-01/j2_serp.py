#!/usr/bin/env python3
"""J2 slot: run six fixed tier-1 queries per SKU against Bing HTML, archive SERPs.

Usage: python j2_serp.py <pos> [<pos> ...]   (no args = all remaining)
Output chat-01/serp-J2/serps.json : pos -> [{q,url,kind,results,note}]
"""
import json, os, re, sys, time, urllib.parse, urllib.request, base64

def deref(href):
    m = re.search(r'u=a1([A-Za-z0-9_-]+)', href)
    if m:
        s = m.group(1)
        s += "=" * (-len(s) % 4)
        try:
            return base64.urlsafe_b64decode(s).decode("utf-8", "ignore")
        except Exception:
            return href
    return href

BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state"
OUT = os.path.join(BASE, "chat-01", "serp-J2")
SKUS = json.load(open(r"C:\Users\DELL\AppData\Local\Temp\opencode\j2_skus.json"))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}

def queries(brand, model):
    b = brand or model.split()[0]
    return [
        f'"{brand}" "{model}" site:.com.my' if brand else f'"{model}" site:.com.my',
        f'"{model}" "{b}" official',
        f'"{model}" filetype:pdf',
        f'"{model}" site:leeden.com.my OR site:theleedenstore.com.my',
        f'"{brand}" "{model}" distributor Malaysia' if brand else f'"{model}" distributor Malaysia',
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
        href = deref(urllib.parse.unquote(m.group(1)))
        title = TAG_RE.sub("", m.group(2)).strip()
        res.append([title[:160], href[:300]])
    if not res:
        if "SafeSearch" in html:
            return u, "safesearch", res, "safesearch-blocked"
        return u, "no_results", res, ""
    junk = sum(1 for _, h in res[:5] if XJUNK.search(h))
    if junk >= 3:
        return u, "rewritten", res, "bing-rewrote-leading-phrase"
    return u, "ok", res, ""

def main():
    os.makedirs(OUT, exist_ok=True)
    out_path = os.path.join(OUT, "serps.json")
    all_data = {}
    if os.path.exists(out_path):
        all_data = json.load(open(out_path, encoding="utf-8"))
    only = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    for pos, brand, model in SKUS:
        if pos in all_data and not only:
            continue
        if only and pos not in only:
            continue
        rows = []
        for q in queries(brand, model):
            u, kind, res, note = fetch(q)
            rows.append({"q": q, "url": u, "kind": kind, "results": res[:8], "note": note})
            time.sleep(1.0)
        all_data[pos] = rows
        json.dump(all_data, open(out_path, "w", encoding="utf-8"))
        summ = "; ".join(f"{r['kind']}:{len(r['results'])}" for r in rows)
        print(pos, brand or "-", model[:40], "->", summ, flush=True)
    print("saved", out_path)

if __name__ == "__main__":
    main()
