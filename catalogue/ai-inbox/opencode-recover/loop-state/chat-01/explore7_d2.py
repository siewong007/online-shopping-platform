#!/usr/bin/env python3
"""D2 round-3e: locate embedded data/API in JLL search shell + fix &amp; greps."""
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache-d2"

OUT = []
def say(s=""):
    OUT.append(s)
    print(s)

p = CACHE / "jllsearch-yta60z1.html"
txt = p.read_text(encoding="utf-8")
say(f"### {p.name} bytes={len(txt)}")
for m in list(re.finditer(r"yta60", txt, re.I))[:6]:
    a, b = max(0, m.start() - 250), m.end() + 250
    frag = " ".join(txt[a:b].split())
    say(f"\n  CTX: {frag[:480]}")
# look for api-ish urls
apis = sorted(set(re.findall(r"[\"']([^\"']*(?:api|json|ajax|getproduct|search)[^\"']*)[\"']", txt, re.I)))
say(f"\n### api-ish strings ({len(apis)}):")
for a in apis[:30]:
    say(f"  A {a[:150]}")

# mrmarks with &amp;
p2 = CACHE / "mrmark-search-12300.html"
if p2.exists():
    t2 = p2.read_text(encoding="utf-8")
    ids = sorted(set(re.findall(r"products_id=(?:amp;)?(\d+)", t2)))
    say(f"\n### mrmark-search-12300 ids(&amp;-safe)={ids}")
    for m in list(re.finditer(r"12300", t2))[:5]:
        a, b = max(0, m.start() - 150), m.end() + 150
        say(f"  CTX: {' '.join(t2[a:b].split())[:300]}")

Path(__file__).with_name("finds7-d2.txt").write_text("\n".join(OUT), encoding="utf-8")
print("\nwrote finds7-d2.txt")
