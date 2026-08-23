#!/usr/bin/env python3
"""Discovery aid: DuckDuckGo HTML endpoint -> result links (leads only)."""
import os, re, ssl, sys, time, urllib.parse, urllib.request
os.environ.setdefault("G2_INSECURE", "1")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}
CTX = ssl._create_unverified_context()
RES = re.compile(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.S)
TAG = re.compile(r"<[^>]+>")


def ddg(q):
    u = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote_plus(q)
    req = urllib.request.Request(u, headers=UA)
    h = urllib.request.urlopen(req, timeout=25, context=CTX).read().decode("utf-8", "ignore")
    out = []
    for m in RES.finditer(h):
        href = m.group(1)
        if "uddg=" in href:
            qq = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
            href = qq.get("uddg", [href])[0]
        elif href.startswith("//"):
            href = "https:" + href
        out.append((TAG.sub("", m.group(2)).strip()[:110], href[:200]))
    return out


if __name__ == "__main__":
    qs = []
    for a in sys.argv[1:]:
        if os.path.isfile(a):
            with open(a, encoding="utf-8") as fh:
                qs += [ln.strip() for ln in fh if ln.strip()]
        else:
            qs.append(a)
    for q in qs:
        print("###", q)
        try:
            for t, u in ddg(q)[:7]:
                print("   ", t, "|", u)
        except Exception as e:
            print("   ERR", repr(e)[:90])
        time.sleep(2.0)
