import urllib.request, re, ssl, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

cands = [
    "https://www.retouch.my/showproducts?search_name=E031B",
    "https://www.retouch.my/search?search_name=E031B",
    "https://www.retouch.my/searchproducts?search_name=E031B",
    "https://www.retouch.my/ourproducts?search_name=E031B",
    "https://www.retouch.my/searchproduct?search_name=E031B",
]
for u in cands:
    try:
        h = get(u)
        n = len(re.findall(r"showproducts/productid", h))
        has = "E031B" in h.upper()
        print("OK", u, len(h), "prods:", n, "E031B:", has)
        if n:
            links = list(dict.fromkeys(re.findall(r'/showproducts/productid/\d+/[^"\']*', h)))
            for l in links[:12]:
                print("    ", l)
            break
    except Exception as e:
        print("--", u, repr(e)[:70])
