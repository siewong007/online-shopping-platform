#!/usr/bin/env python3
"""ESC-2 alt-engine SERP test: mojeek + bing."""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

def title(t):
    m = re.search(r"<title[^>]*>(.*?)</title>", t, re.S)
    return re.sub(r"<[^>]+>", " ", m.group(1))[:150] if m else "no title"

q = sys.argv[1] if len(sys.argv) > 1 else "test"

st, fin, ct, body = http_get("https://www.mojeek.com/search?q=" + q, timeout=25)
t = body.decode("utf-8", errors="ignore")
print("MOJEEK", st, len(t), "|", title(t))
links = re.findall(r'<a[^>]+class="title"[^>]+href="([^"]+)"', t)
if not links:
    links = re.findall(r'<h2><a href="([^"]+)"', t)
print("  results:", len(links))
for u in links[:10]:
    print("   -", u[:140])

st, fin, ct, body = http_get("https://www.bing.com/search?q=" + q + "&count=20", timeout=25)
t = body.decode("utf-8", errors="ignore")
print("BING", st, len(t), "|", title(t))
links = re.findall(r'<h2><a href="([^"]+)"', t)
print("  h2 results:", len(links))
for u in links[:12]:
    print("   -", u[:140])
print("  wall markers:", "captcha" in t.lower(), "verify" in t.lower())
