#!/usr/bin/env python3
"""ESC-2: sweep sonichardware search for Glotool codes."""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

BASE = "https://sonichardware.com.my"
QUERIES = ["GLO", "glotool", "ZS70", "B104", "GT891", "GT900", "500SP",
           "netting", "trap", "welding glove"]

for q in QUERIES:
    u = BASE + "/index.php?option=com_hikashop&ctrl=product&task=listing&search=" + q
    st, fin, ct, body = http_get(u, timeout=35)
    t = body.decode("utf-8", errors="ignore")
    items = re.findall(r'href="(/component/hikashop/product/[^"]+)"[^>]*>([^<]{0,90})', t)
    # dedupe by url
    seen = []
    for a, btxt in items:
        if (a, btxt.strip()) not in seen:
            seen.append((a, btxt.strip()))
    print(f"q={q!r} status={st} links={len(seen)}")
    for a, btxt in seen[:20]:
        print("   ", a[:100], "|", btxt[:70])
    nxt = re.search(r'limitstart=(\d+)&limit=(\d+)', t)
