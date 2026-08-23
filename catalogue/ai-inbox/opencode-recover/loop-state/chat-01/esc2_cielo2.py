#!/usr/bin/env python3
"""ESC-2: Cielo PDP variant structure analysis."""
import re

t = open(r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\esc2-cielo.html",
         encoding="utf-8").read()

def ctx(pat, span=260, limit=8):
    out = []
    for m in list(re.finditer(pat, t))[:limit]:
        s = re.sub(r"\s+", " ", t[max(0, m.start()-span): m.start()+span])
        out.append(s)
    return out

print("### Daylight contexts")
for c in ctx("Daylight"):
    print(" *", c[:420], "\n")

print("### option/variant structures")
for pat in [r'"variants?"\s*:', r'option', r'selectedVariant', r'variantId',
            r'"sku"', r'SKU']:
    ms = list(re.finditer(pat, t))
    print(f"pat {pat!r}: {len(ms)}")

# JSON blobs mentioning product ids
for pid in ["5938586", "5938608", "5938621", "5938632"]:
    idx = [m.start() for m in re.finditer(pid, t)]
    print(f"pid {pid}: {len(idx)} hits")
    if idx:
        s = re.sub(r"\s+", " ", t[max(0, idx[0]-300): idx[0]+300])
        print("   ", s[:520], "\n")
