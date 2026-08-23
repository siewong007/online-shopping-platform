import urllib.request, re, sys, ssl
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url, ctx_=None):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25, context=ctx_) as r:
        return r.read().decode("utf-8", "ignore")

h = get("https://www.retouch.my/products/sitemap.xml", ctx)
urls = re.findall(r"<loc>([^<]+)</loc>", h)
print("retouch product urls:", len(urls))
open(r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/sitemap-retouch-products.txt", "w", encoding="utf-8").write("\n".join(urls))
pats = ["m08913","e20ab","e08213","e031b","elegance","ultra","2727","ee1427","mx-667","mx667","kancil"]
for p in pats:
    hits = [u for u in urls if re.search(p, u, re.I)]
    print(p, "->", hits[:4] if hits else "none")

# leeden search with relaxed SSL
for q in ["996060809", "9960651630"]:
    try:
        h2 = get("https://www.theleedenstore.com.my/catalogsearch/result/?q=" + urllib.parse.quote(q), ctx)
        prods = list(dict.fromkeys(re.findall(r'href="(https://(?:www\.)?theleedenstore\.com\.my/[^"]+\.html)"', h2)))
        print("leeden", q, len(h2), "hits:", prods[:6])
    except Exception as e:
        print("leeden ERR", q, repr(e)[:100])
