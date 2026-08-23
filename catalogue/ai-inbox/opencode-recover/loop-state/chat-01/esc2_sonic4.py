#!/usr/bin/env python3
"""ESC-2: crawl sonichardware full product catalogue."""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

BASE = "https://sonichardware.com.my"
allp = {}
limitstart = 0
for page in range(40):
    u = f"{BASE}/index.php?option=com_hikashop&ctrl=product&task=listing&limitstart={limitstart}&limit=18"
    st, fin, ct, body = http_get(u, timeout=35)
    t = body.decode("utf-8", errors="ignore")
    items = re.findall(r'href="(/component/hikashop/product/\d+-[^"]+)"[^>]*>\s*([^<]{2,90})', t)
    new = 0
    for a, btxt in items:
        btxt = btxt.strip()
        if a not in allp and btxt:
            allp[a] = btxt
            new += 1
        elif a in allp and not allp[a] and btxt:
            allp[a] = btxt
            new += 1
    print(f"page {page} start={limitstart} status={st} total={len(allp)} new={new}")
    if new == 0:
        break
    limitstart += 18

open(r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\esc2-sonic-catalog.txt", "w",
     encoding="utf-8").write("\n".join(f"{a} | {b}" for a, b in sorted(allp.items())))
pat = re.compile(r"glo|zs70|b104|gt89|gt90|500sp|net|trap|snorkel|leather|weld", re.I)
hits = [(a, b) for a, b in sorted(allp.items()) if pat.search(a + " " + b)]
print("GLO-ish hits:", len(hits))
for a, b in hits:
    print("  *", a[:100], "|", b[:70])
