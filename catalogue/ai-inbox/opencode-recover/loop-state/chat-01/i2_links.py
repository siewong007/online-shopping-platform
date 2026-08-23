import re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
for f in ["retouch-cat-ultra-white.html", "retouch-cat-ultra-all.html", "retouch-cat-elegance-blk.html", "retouch-cat-elegance.html"]:
    p = "catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/" + f
    try:
        h = open(p, encoding="utf-8").read()
    except Exception as e:
        print(f, "missing"); continue
    links = list(dict.fromkeys(re.findall(r'/showproducts/productid/\d+/[^"\']*', h)))
    print("==", f, len(h), len(links))
    for l in links[:25]:
        print("   ", l)
