import urllib.request, re, sys, ssl, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

CATS = [
    ("ultra-white", "https://www.retouch.my/ourproducts/cid/585126/cat/switch-sockets-ultra-rimless-series-white/"),
    ("ultra-all",   "https://www.retouch.my/ourproducts/cid/585125/cat/switch-sockets-ultra-rimless-series/"),
    ("elegance",    "https://www.retouch.my/ourproducts/cid/576969/cat/switch-sockets-elegance-sense039s/"),
    ("elegance-blk","https://www.retouch.my/ourproducts/cid/577199/cat/switch-sockets-elegance-sense039s-black/"),
]
CODES = ["m08913w","e20ab","e08213b","e031b"]
for name, url in CATS:
    try:
        h = get(url)
        open(os.path.join(BASE, "serp-I2", "retouch-cat-" + name + ".html"), "w", encoding="utf-8").write(h)
        prods = re.findall(r'href="(https://www\.retouch\.my/showproducts/productid/\d+/[^"]*)"', h)
        prods = list(dict.fromkeys(prods))
        print("==", name, len(prods), "products")
        for p in prods[:40]:
            print("   ", p)
        for c in CODES:
            hits = [p for p in prods if c.replace("-", "") in p.lower().replace("-", "").replace("_", "")] or ([l for l in h.splitlines() if c in l.lower()][:2])
            print("   code", c, "->", hits[:3] if hits else "none")
    except Exception as e:
        print("ERR", name, repr(e)[:100])
