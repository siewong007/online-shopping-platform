import urllib.request, re, sys, ssl, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

PAGES = {
    "eleg-blk-dp":   "https://www.retouch.my/showproducts/productid/5703833/cid/577199/doublepole-switches/",
    "eleg-blk-16a":  "https://www.retouch.my/showproducts/productid/5703832/cid/577199/16a-switches/",
    "eleg-blk-sock": "https://www.retouch.my/showproducts/productid/5703834/cid/577199/sockets/",
    "ultra-white":   "https://www.retouch.my/showproducts/productid/5818230/cid/585126/ultra-rimless-doublepole-switches/",
}
CODES = ["E20AB", "E031B", "E08213B", "M08913W"]
for name, url in PAGES.items():
    try:
        h = get(url)
        open("catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/retouch-" + name + ".html", "w", encoding="utf-8").write(h)
        t = re.findall(r"<title>(.*?)</title>", h, re.S)[:1]
        print("==", name, len(h), t)
        for c in CODES:
            idxs = [m.start() for m in re.finditer(c, h)]
            for i in idxs[:2]:
                print("  ", c, "->", re.sub(r"<[^>]+>", " ", h[max(0, i-90):i+130]).replace("\n", " ")[:190])
            if not idxs:
                print("  ", c, "-> none")
        imgs = re.findall(r'(?:property="og:image" content="([^"]+)"|(cdn1\.npcdn\.net[^"\s]+))', h)[:6]
        for im in imgs:
            print("   IMG:", im[0] or im[1][:160])
    except Exception as e:
        print("ERR", name, repr(e)[:100])
