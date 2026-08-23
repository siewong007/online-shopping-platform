#!/usr/bin/env python3
"""ESC-2: dump all Cielo Gen2 T5 variants: name + image urls."""
import re

t = open(r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\esc2-cielo.html",
         encoding="utf-8").read()
# find variant JSON objects
objs = re.findall(r'\{"id":(\d{6,7}),"store_id":4710,"name":"([^"]+)","parent_id":(\d+),"item_id":(\d+)', t)
print("variants:", len(objs))
for vid, name, par, iid in objs:
    print(f"  {vid} parent={par} item={iid} :: {name}")

# map variant id -> image block
for m in re.finditer(r'\{"id":(\d{6,7}),"store_id":4710,"name":"([^"]+)".*?"image":\{(.*?)\}', t[:2000000]):
    pass
# simpler: find each variant object start and grab following 1200 chars for image keys
print("\n### variant image blocks")
seen_names = set()
for m in re.finditer(r'"thumbnail_url":"([^"]+)","x420_url":"([^"]+)"', t):
    print("  thumb:", m.group(1)[-70:])
    print("    x420:", m.group(2)[-90:])
