import re, os
BASE = r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01"
pats = ["e20ab","e08213b","e031b","m08913w","2727","ee1427","mx-?667","kancil","lug","elegance","ultra","night"]
for f in ["sitemapproducts-smjelectrical_com_my.txt","sitemapproducts-www_jllelectrical_com_my.txt"]:
    t = open(os.path.join(BASE,f), encoding="utf-8", errors="ignore").read()
    urls = set(re.findall(r"https?://[^<>\s\"']+", t))
    print("==", f, len(urls), "urls", flush=True)
    for p in pats:
        hits = sorted({u for u in urls if re.search(p, u, re.I)})
        for h in hits[:6]:
            print("  ", p, "->", h)
        if not hits:
            print("  ", p, "-> none")
