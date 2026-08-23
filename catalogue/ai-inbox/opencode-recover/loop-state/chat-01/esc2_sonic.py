#!/usr/bin/env python3
"""ESC-2: sonichardware hikashop search probes."""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

BASE = "https://sonichardware.com.my"
cands = [
    BASE + "/index.php?option=com_hikashop&ctrl=product&task=listing&search=GLO",
    BASE + "/component/hikashop/product/listing?search=GLO",
    BASE + "/search?searchword=glove",
    BASE + "/index.php?option=com_search&searchword=GT900",
]
for u in cands:
    st, fin, ct, body = http_get(u, timeout=35)
    t = body.decode("utf-8", errors="ignore")
    hits = re.findall(r'href="(/product/[^"]+)"[^>]*>([^<]{0,80})', t)
    print("URL", u, "->", st, len(t))
    if st == 200:
        glo = [h for h in hits if re.search(r"glo|gt9|zs70|b104|500sp|gt89", h[0] + h[1], re.I)]
        print("  product links:", len(hits), "| glo-ish:", len(glo))
        for h in glo[:12]:
            print("   -", h[0][:90], "|", h[1].strip()[:60])
