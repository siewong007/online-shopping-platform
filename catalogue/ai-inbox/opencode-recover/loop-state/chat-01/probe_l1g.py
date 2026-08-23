#!/usr/bin/env python3
"""Round-7: cabana full crawl; bosch api guesses; panasonic robots."""
import json
import re
import ssl
import urllib.request
import gzip
import io

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept": "*/*", "Accept-Encoding": "gzip"}
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def get(url, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    r = urllib.request.urlopen(req, timeout=timeout, context=CTX)
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
        try:
            raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
        except Exception:
            pass
    return raw.decode("utf-8", "ignore"), r.status


home, _ = get("https://cabana.com.my/")
cats = sorted(set(l for l in re.findall(r'href="(/index\.php/products[^"]*)"', home)))
details = {}
for c in cats:
    if c.rstrip("/").endswith("products"):
        continue
    url = "https://cabana.com.my" + c
    try:
        h, st = get(url)
    except Exception:
        continue
    for d in set(re.findall(r'href="(/index\.php/products/[^"]*detail)"', h)):
        details.setdefault(d, c)
print("detail pages discovered:", len(details))

WANT = {
    "3772": ["cb6331"],
    "1900": ["cb2807"],
    "2022": ["cb65ss-gm", "cb65ssgm"],
    "4880": ["cb2805a"],
    "4881": ["cb2806a"],
}
for pos, keys in WANT.items():
    hits = [d for d in details if any(k in d.lower() for k in keys)]
    print(pos, keys, "->", hits[:5])

out = {"details_count": len(details), "matches": {}}
for pos, keys in WANT.items():
    out["matches"][pos] = [d for d in details if any(k in d.lower() for k in keys)][:6]

json.dump(out, open(r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-L1/cabana.json", "w"), indent=1)

print()
print("== BOSCH api guesses ==")
for u in [
    "https://www.bosch-pt.com.my/my/en/search.html?searchTerm=GKS+140",
    "https://www.bosch-pt.com.my/myboschapi/search/v2/products?text=GKS%20140",
    "https://www.bosch-pt.com.my/api/search?query=GKS%20140",
]:
    try:
        h, st = get(u)
        print(st, len(h), u[:80])
    except Exception as e:
        print("FAIL", repr(e)[:70], u[:80])

print()
print("== PANASONIC robots ==")
try:
    t, st = get("https://www.panasonic.com/my/robots.txt")
    print(st)
    print(t[:600])
except Exception as e:
    print("FAIL", repr(e)[:90])
