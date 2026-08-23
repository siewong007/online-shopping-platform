"""Bing RSS fallback: python bingrss.py "q1" "q2" ..."""
import sys, re, html, urllib.request, urllib.parse
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36"}

def rss(q):
    u = "https://www.bing.com/search?q=" + urllib.parse.quote(q) + "&format=rss&count=10"
    raw = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20).read().decode("utf-8", "ignore")
    items = re.findall(r"<item>(.*?)</item>", raw, re.S)
    out = []
    for it in items:
        t = re.search(r"<title>(.*?)</title>", it, re.S)
        l = re.search(r"<link>(.*?)</link>", it, re.S)
        if t and l:
            out.append((html.unescape(t.group(1))[:100], html.unescape(l.group(1)).strip()))
    return out

if __name__ == "__main__":
    for q in sys.argv[1:]:
        print("=== q:", q, flush=True)
        try:
            res = rss(q)
        except Exception as e:
            print("  FAIL", repr(e)[:100], flush=True); continue
        if not res:
            print("  (empty)", flush=True)
        for i, (t, l) in enumerate(res[:8]):
            print(f"  [{i}] {t} | {l}", flush=True)
