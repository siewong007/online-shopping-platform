#!/usr/bin/env python3
"""ESC-2: sonic homepage menu + about page hunt."""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

st, fin, ct, body = http_get("https://sonichardware.com.my/", timeout=35)
t = body.decode("utf-8", errors="ignore")
links = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', t, re.S)
seen = []
for a, b in links:
    b2 = re.sub(r"<[^>]+>", "", b).strip()
    if (a, b2) not in seen and b2 and ".css" not in a and ".js" not in a:
        seen.append((a, b2))
menu = [x for x in seen if x[1]]
print("links:", len(menu))
for a, b in menu[:45]:
    print(f"  {b[:42]:42s} -> {a[:95]}")
