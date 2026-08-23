#!/usr/bin/env python3
"""G2 slot tier-1 SERP runner v2 (bing_fallback channel).

- decodes bing.com/ck/a redirect targets (u=a1<base64>)
- detects rewrite/junk SERPs (no query-token overlap) and fires brand-led variant
Usage: python g2_serp.py [pos pos ...]   (no args = all)
"""
import base64, csv, json, os, re, sys, time, urllib.parse, urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "serp-G2")
MANIFEST = os.path.join(BASE, "g2_skus.json")
ASSIGN = os.path.normpath(os.path.join(BASE, "..", "chat-assignments", "chat-01.csv"))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}
SLEEP = float(os.environ.get("G2_SLEEP", "0.9"))

ALGO_RE = re.compile(r'<li class="b_algo".*?<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.S)
TAG_RE = re.compile(r"<[^>]+>")
B64_RE = re.compile(r"[?&]u=a1([A-Za-z0-9_\-=]+)")


def decode_href(href):
    m = B64_RE.search(href)
    if not m:
        return href
    s = m.group(1)
    s += "=" * (-len(s) % 4)
    try:
        return base64.urlsafe_b64decode(s).decode("utf-8", "ignore")
    except Exception:
        return href


def tokens(q):
    return [t.lower() for t in re.findall(r"[A-Za-z0-9]{3,}", q)]


def looks_junk(q, results):
    tk = tokens(q)
    if not results:
        return False
    hits = 0
    for t, h in results[:5]:
        blob = (t + " " + h).lower()
        if any(x in blob for x in tk):
            hits += 1
    return hits == 0


def fetch(q):
    u = "https://www.bing.com/search?q=" + urllib.parse.quote_plus(q) + "&count=10&mkt=en-MY"
    req = urllib.request.Request(u, headers=UA)
    try:
        html = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", "ignore")
    except Exception as e:
        return u, "error", [], repr(e)[:100]
    res = []
    for m in ALGO_RE.finditer(html):
        href = decode_href(urllib.parse.unquote(m.group(1)))
        if href.startswith("http"):
            res.append([TAG_RE.sub("", m.group(2)).strip()[:160], href[:300]])
    if not res:
        kind = "safesearch" if "SafeSearch" in html else "no_results"
        return u, kind, res, ""
    kind = "rewritten" if looks_junk(q, res) else "ok"
    return u, kind, res, ""


def main():
    os.makedirs(OUT, exist_ok=True)
    out_path = os.path.join(OUT, "serps.json")
    all_data = {}
    if os.path.exists(out_path):
        all_data = json.load(open(out_path, encoding="utf-8"))
    skus = json.load(open(MANIFEST, encoding="utf-8"))["skus"]
    only = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    for s in skus:
        pos = s["pos"]
        if only and pos not in only:
            continue
        rows = []
        qs = [
            f'"{s["qm"]}" site:.com.my',
            f'"{s["qm"]}" official {s["brand"] or ""}'.strip(),
            f'"{s["qm"]}" filetype:pdf',
            f'"{s["qm"]}" site:leeden.com.my OR site:theleedenstore.com.my',
            f'{s["brand"]} "{s["qm"]}" distributor Malaysia'.strip(),
            f'"{s["qm"]}" authorised dealer',
        ]
        for q in qs:
            u, kind, res, note = fetch(q)
            rows.append({"q": q, "url": u, "kind": kind,
                         "results": [[t, h] for t, h in res[:8]], "note": note})
            time.sleep(SLEEP)
            if kind == "rewritten":
                vq = f'{s["brand"]} "{s["qm"]}"'.strip()
                u2, k2, r2, n2 = fetch(vq)
                rows.append({"q": vq, "url": u2, "kind": k2,
                             "results": [[t, h] for t, h in r2[:8]],
                             "note": (n2 + " variant-of-rewrite").strip()})
                time.sleep(SLEEP)
        all_data[pos] = {"ord": s["ord"], "brand": s["brand"], "qm": s["qm"],
                         "queries": rows}
        json.dump(all_data, open(out_path, "w", encoding="utf-8"))
        summ = "; ".join(f"{r['kind']}:{len(r['results'])}" for r in rows)
        print(pos, (s["brand"] or "-"), s["qm"], "->", summ, flush=True)
    print("saved", out_path)


if __name__ == "__main__":
    main()
