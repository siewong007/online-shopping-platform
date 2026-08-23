#!/usr/bin/env python3
"""ESC-2: re-probe Cielo Gen2 T5 PDP on cimalighting.com.my, list image URLs + variants."""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

URL = "https://www.cimalighting.com.my/product/cielo-gen2-t5-led-batten-2ft-3ft-4ft-10w-14w-18w-sirim-cetificated"
st, fin, ct, body = http_get(URL, timeout=40)
t = body.decode("utf-8", errors="ignore")
open(r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\esc2-cielo.html", "w", encoding="utf-8").write(t)
print("status", st, "len", len(body), "final", fin)

urls = re.findall(r"https://[a-zA-Z0-9.\-]*sgliteasset[^\"'\s)<>]+", t)
seen = []
for u in urls:
    if u not in seen and ("product" in u or "cached" in u or "s3.ap" in u):
        seen.append(u)
print("product-ish sglite urls:", len(seen))
for u in seen[:40]:
    print("  ", u[:170])

for pat in ["DL-860", "dl860", "860", "Daylight", "daylight", "Warm", "warm white",
            "3000K", "4000K", "6500K", "18W"]:
    hits = [m.start() for m in re.finditer(re.escape(pat), t)]
    print(f"pat {pat!r}: {len(hits)}")
