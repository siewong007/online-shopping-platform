#!/usr/bin/env python3
"""ESC-2 Bing SERP extractor v2: decodes bing.com/ck/a u=a1<base64url> wrappers."""
import re, sys, html, base64
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

def decode_ck(u):
    m = re.search(r"[?&]u=a1([A-Za-z0-9_\-]+)", u)
    if not m:
        return u
    s = m.group(1)
    s += "=" * (-len(s) % 4)
    try:
        return base64.urlsafe_b64decode(s).decode("utf-8", errors="replace")
    except Exception:
        return u

q = sys.argv[1]
st, fin, ct, body = http_get("https://www.bing.com/search?q=" + q + "&count=20&setlang=en", timeout=30)
t = body.decode("utf-8", errors="ignore")
print("Q:", q, "| status", st, "| bytes", len(t))
items = re.split(r'class="b_algo"', t)[1:]
seen = set()
n = 0
for it in items[:14]:
    m = re.search(r'<h2[^>]*><a[^>]+href="([^"]+)"', it) or re.search(r'<a[^>]+class="b_attribution[^"]*"[^>]+href="([^"]+)"', it) or re.search(r'<cite>(.*?)</cite>', it, re.S)
    if not m:
        continue
    raw = html.unescape(m.group(1))
    u = decode_ck(re.sub(r"<[^>]+>", "", raw))
    ttl = re.search(r"<a[^>]*>(.*?)</a>", it, re.S)
    ttl_txt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", ttl.group(1))).strip()[:110] if ttl else ""
    host = re.sub(r"^https?://([^/]+).*", r"\1", u)
    key = re.sub(r"^https?://", "", u).split("?")[0][:80]
    if key in seen or "bing.com" in host:
        continue
    seen.add(key)
    n += 1
    print(f"  [{n}] {host} | {ttl_txt}\n      {u[:170]}")
if n == 0:
    print("  NO ORGANIC RESULTS PARSED")
