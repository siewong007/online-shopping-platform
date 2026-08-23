import re, sys, urllib.request, ssl
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

def codetable(h):
    # extract text around 'CODE' blocks stripped of tags
    segs = re.findall(r">[^<]*CODE[^<]*(?:<[^>]+>[^<]*){0,400}", h)
    out = []
    for s in segs[:2]:
        txt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "|", s))
        out.append(txt[:1200])
    return out

# 1) dump code tables from cached black-series pages
for f in ["eleg-blk-dp", "eleg-blk-16a", "eleg-blk-sock"]:
    h = open(f"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/retouch-{f}.html", encoding="utf-8").read()
    print("==", f)
    for t in codetable(h):
        print("   CT:", t)

# 2) enumerate subcategory tiles on elegance-black & ultra-white category pages
for cat, url in [
    ("elegance-blk-cat", "https://www.retouch.my/ourproducts/cid/577199/cat/switch-sockets-elegance-sense039s-black/"),
    ("ultra-white-cat", "https://www.retouch.my/ourproducts/cid/585126/cat/switch-sockets-ultra-rimless-series-white/"),
]:
    h = get(url)
    open(f"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/retouch-{cat}.html", "w", encoding="utf-8").write(h)
    tiles = list(dict.fromkeys(re.findall(r'href="(/showproducts/productid/\d+/cid/\d+/[^"]*)"[^>]*(?:alt|title)="([^"]*)"', h)))
    if not tiles:
        tiles = [(m[0], "") for m in list(dict.fromkeys(re.findall(r'href="(/showproducts/productid/\d+/[^"]*)"', h)))]
    print("==", cat)
    seen = set()
    for u, t in tiles:
        if u not in seen:
            seen.add(u)
            print("   ", t[:60], "->", u)
