#!/usr/bin/env python3
"""ESC-2 bing deep check: does the SERP body contain organic results?"""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

q = sys.argv[1]
st, fin, ct, body = http_get("https://www.bing.com/search?q=" + q + "&count=20&setlang=en", timeout=25)
t = body.decode("utf-8", errors="ignore")
print("status", st, "len", len(t), "final", fin)
for marker in ("b_algo", "b_results", "cite", "sj_ce", "g_captcha", "challenge", "location-box"):
    print(marker, t.count(marker))
# any external hrefs at all?
hrefs = re.findall(r'href="(https?://(?!www\.bing|go\.micro|cn\.bing|support\.micro|privacy|account|choice)[^"]+)"', t)
uniq = []
for u in hrefs:
    if u not in uniq:
        uniq.append(u)
print("ext refs:", len(uniq))
for u in uniq[:15]:
    print(" -", u[:150])
