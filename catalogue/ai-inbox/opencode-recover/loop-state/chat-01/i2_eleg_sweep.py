import urllib.request, re, ssl, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

cat = open(r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/retouch-cat-elegance.html", encoding="utf-8").read()
links = sorted(set(re.findall(r'/showproducts/productid/(\d+)/[^"\']*', cat)))
print("productids:", links)
TARGETS = ["e031b", "e08213b"]
for pid in links:
    url = f"https://www.retouch.my/showproducts/productid/{pid}/"
    try:
        h = get(url)
        title = re.findall(r"<title>(.*?)</title>", h, re.S)[:1]
        title = re.sub(r"\s+", " ", title[0]) if title else "?"
        low = h.lower()
        found = [t.upper() for t in TARGETS if t in low]
        # pull code table snippet for found targets
        snips = []
        for t in TARGETS:
            i = low.find(t)
            if i >= 0:
                seg = re.sub(r"<[^>]+>", "|", h[max(0,i-200):i+220])
                seg = re.sub(r"\s+", " ", seg)
                snips.append(seg[:260])
        print(pid, "|", title[:80], "| FOUND:", found or "-")
        for s in snips:
            print("     ", s)
    except Exception as e:
        print(pid, "ERR", repr(e)[:60])
