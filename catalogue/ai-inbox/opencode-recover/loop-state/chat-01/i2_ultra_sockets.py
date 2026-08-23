import urllib.request, re, sys, ssl
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

url = "https://www.retouch.my/showproducts/productid/5816557/cid/585126/ultra-rimless-13a-sockets/"
h = get(url)
open("catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/retouch-ultra-white-13a-sockets.html", "w", encoding="utf-8").write(h)
t = re.findall(r"<title>(.*?)</title>", h, re.S)[:1]
print("TITLE:", t)
for c in ["M08913W", "M08913", "08913"]:
    idxs = [m.start() for m in re.finditer(c, h)]
    print(c, "count:", len(idxs))
    for i in idxs[:3]:
        print("   ", re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "|", h[max(0, i-120):i+160]))[:240])
# og:image
og = re.findall(r'property="og:image" content="([^"]+)"', h)
print("OG:", og[:2])
