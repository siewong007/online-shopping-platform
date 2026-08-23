import urllib.request, re, sys, ssl
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

PAGES = [
    ("eleg-blk-hotels", "https://www.retouch.my/showproducts/productid/5703836/cid/577199/hotels-series/"),
    ("eleg-blk-dimmer", "https://www.retouch.my/showproducts/productid/5703837/cid/577199/dimmer-and-others/"),
    ("eleg-blk-comm",   "https://www.retouch.my/showproducts/productid/5703835/cid/577199/communicate-outlets/"),
]
for name, url in PAGES:
    try:
        h = get(url)
        open("catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/retouch-" + name + ".html", "w", encoding="utf-8").write(h)
        codes = re.findall(r"[A-Z]{1,3}\d{1,4}[A-Z0-9+()\[\]]*(?:\+[A-Z0-9]+)*", re.sub(r"<[^>]+>", " ", h))
        codes = sorted({c for c in codes if len(c) >= 4 and any(ch.isdigit() for ch in c)})[:25]
        print("==", name)
        print("   codes:", codes)
        for c in ["E031B", "E08213B"]:
            if c.lower() in h.lower():
                print("   FOUND", c)
    except Exception as e:
        print("ERR", name, repr(e)[:90])

# homepage search form discovery
h = get("https://www.retouch.my/")
forms = re.findall(r'<form[^>]*action="([^"]*)"', h)[:5]
print("FORMS:", forms)
for m in re.findall(r'(?:name|id)="(?:q|keyword|search[^"]*)"[^>]*', h)[:6]:
    print("INPUT:", m)
