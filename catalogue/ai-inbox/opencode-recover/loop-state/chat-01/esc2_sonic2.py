#!/usr/bin/env python3
"""ESC-2: sonichardware deep look + S&J sitemap index."""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

st, fin, ct, body = http_get("https://www.spearandjackson.com/sitemap.xml", timeout=30)
print("SJ sitemap:", st)
print(body.decode("utf-8", errors="replace")[:600])

u = BASE = "https://sonichardware.com.my"
st, fin, ct, body = http_get(u + "/index.php?option=com_hikashop&ctrl=product&task=listing&search=GLO", timeout=35)
t = body.decode("utf-8", errors="ignore")
links = re.findall(r'href="([^"]*hikashop[^"]*)"', t)
uniq = []
for x in links:
    if x not in uniq:
        uniq.append(x)
print("\nsonic hikashop links on listing page:", len(uniq))
for x in uniq[:15]:
    print("   -", x[:130])
m = re.search(r"<title[^>]*>(.*?)</title>", t, re.S)
print("title:", re.sub(r"\s+", " ", m.group(1))[:120] if m else None)
