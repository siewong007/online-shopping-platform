#!/usr/bin/env python3
"""ESC-2: dump Cielo variants v2 (tolerant regex)."""
import re

t = open(r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\esc2-cielo.html",
         encoding="utf-8").read()

# variant names
names = re.findall(r'\\"name\\":\\"CIELO GEN2 T5[^"\\]*', t)
if not names:
    names = re.findall(r'"name":"(CIELO GEN2 T5[^"]+)"', t)
print("variant name hits:", len(names))
uniq = []
for n in names:
    n2 = n.split('":"')[-1].rstrip('"')
    if n2 not in uniq:
        uniq.append(n2)
for n in uniq:
    print("  -", n)

# all image urls in page with their product folder
folders = {}
for m in re.finditer(r"https://cdn1\.sgliteasset\.com/eluxelig/images/product/(product-\d+)/([A-Za-z0-9_.-]+?)(?:\.jpg|\.png|\.webp)", t):
    fold, fn = m.group(1), m.group(2)
    if "cached" in fn or "_150x150" in fn or "_420x420" in fn:
        continue
    folders.setdefault(fold, [])
    if fn not in [x for x in folders[fold]]:
        folders[fold].append(fn)
print("\n### original-size images per product folder")
for k in sorted(folders):
    print(" ", k)
    for fn in folders[k][:12]:
        print("   ", fn)
