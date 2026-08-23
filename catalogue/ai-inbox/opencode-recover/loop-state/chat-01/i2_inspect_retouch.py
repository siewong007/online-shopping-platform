import re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
h = open(r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/retouch-cat-elegance-blk.html", encoding="utf-8", errors="ignore").read()
print(len(h), "bytes; showproducts count:", h.count("showproducts"))
for m in re.findall(r'href=["\']([^"\']*showproducts[^"\']*)["\']', h)[:10]:
    print("LINK:", m)
t = re.findall(r"<title>(.*?)</title>", h, re.S)
print("TITLE:", t[:1])
for c in ["E20AB", "E08213B", "E031B", "M08913W", "20A", "16A"]:
    idxs = [m.start() for m in re.finditer(c, h)][:3]
    for i in idxs:
        print(c, "->", re.sub(r"<[^>]+>", " ", h[max(0, i-100):i+150]).replace("\n", " ")[:200])
