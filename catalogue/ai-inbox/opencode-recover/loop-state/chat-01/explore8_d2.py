#!/usr/bin/env python3
"""D2 round-3f: extract ALL showproducts links+labels from saved JLL search pages."""
import re
from pathlib import Path
from urllib.parse import unquote

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache-d2"

OUT = []
def say(s=""):
    OUT.append(s)
    print(s)

for f in sorted(CACHE.glob("jllsearch-*.html")):
    txt = f.read_text(encoding="utf-8")
    say(f"\n### {f.name}")
    found = {}
    for m in re.finditer(r"href=[\"'](/showproducts/productid/\d+/[^\"']+)[\"'][^>]*>(.*?)</a>",
                         txt, re.S):
        href, inner = m.group(1), re.sub(r"<[^>]+>", " ", m.group(2))
        label = " ".join(inner.split())
        pid = re.search(r"productid/(\d+)", href).group(1)
        if len(label) >= 8 and (pid not in found or len(label) > len(found[pid][1])):
            found[pid] = (href, label)
    say(f"  distinct-product-links={len(found)}")
    for pid, (href, label) in sorted(found.items()):
        say(f"  R {pid}  {unquote(label)[:110]}")
    # also raw count
    raw = len(re.findall(r"showproducts/productid/", txt))
    say(f"  raw-showproducts-mentions={raw}")

Path(__file__).with_name("finds8-d2.txt").write_text("\n".join(OUT), encoding="utf-8")
print("\nwrote finds8-d2.txt")
