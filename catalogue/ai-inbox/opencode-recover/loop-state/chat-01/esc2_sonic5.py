#!/usr/bin/env python3
"""ESC-2: fetch Sonic Hardware Glotool PDPs; dump title/desc/images."""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

BASE = "https://sonichardware.com.my"
PAGES = [
    "185-cotton-glove-zs70",
    "183-cotton-glove-b104",
    "2378-glotool-sun-shade-netting-70",
    "158-semi-leather-glove-891gt-10-5",
    "174-welding-glove-900gt-14",
    "178-welding-glove-500sp-13",
]
for slug in PAGES:
    u = f"{BASE}/component/hikashop/product/{slug}"
    st, fin, ct, body = http_get(u, timeout=35)
    t = body.decode("utf-8", errors="ignore")
    m = re.search(r"<title[^>]*>(.*?)</title>", t, re.S)
    title = re.sub(r"\s+", " ", m.group(1)).strip() if m else "?"
    print("=" * 10, slug, "status", st)
    print("  title:", title[:130])
    md = re.search(r'<meta name="description" content="([^"]*)"', t)
    if md:
        print("  meta-desc:", re.sub(r"\s+", " ", md.group(1))[:200])
    imgs = re.findall(r'((?:https://sonichardware\.com\.my)?/images/com_hikashop/upload/[^"\s>]+\.(?:jpg|jpeg|png|webp))', t)
    seen = []
    for x in imgs:
        if x not in seen:
            seen.append(x)
    print("  imgs:")
    for x in seen[:8]:
        print("    -", x[:120])
