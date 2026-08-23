#!/usr/bin/env python3
"""ESC-2: map Cielo variant id -> name -> images."""
import re

t = open(r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\esc2-cielo.html",
         encoding="utf-8").read()
starts = [m for m in re.finditer(r'\\"id\\":(\d{6,7}),\\"store_id\\":4710,\\"name\\":\\"(CIELO GEN2 T5[^"\\]*)', t)]
if not starts:
    starts = [m for m in re.finditer(r'"id":(\d{6,7}),"store_id":4710,"name":"(CIELO GEN2 T5[^"]*)', t)]
print("variant objects:", len(starts))
for i, m in enumerate(starts):
    vid, name = m.group(1), m.group(2)
    end = starts[i+1].start() if i+1 < len(starts) else min(len(t), m.start()+6000)
    seg = t[m.start():end]
    imgs = re.findall(r'(https://cdn1\.sgliteasset\.com/eluxelig/images/product/(?:product-\d+)/[A-Za-z0-9_.-]+\.(?:jpg|png|webp))', seg)
    orig = []
    for u in imgs:
        if "_150x150" not in u and "_420x420" not in u and "cached" not in u and u not in orig:
            orig.append(u)
    tag = name.split("SIRIM CETIFICATED")[-1] or "(PARENT)"
    print(f"  {vid} :: {tag}")
    for u in orig[:4]:
        print("      ", u)
