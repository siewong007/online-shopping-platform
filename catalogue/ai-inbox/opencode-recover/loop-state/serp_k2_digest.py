#!/usr/bin/env python3
import json, os, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(BASE, "chat-01", "serp-K2", "serps.json"), encoding="utf-8"))
SHOP = re.compile(r"shopee|lazada|lazmall|carousell|tiktok|facebook|amazon|ebay|aliexpress", re.I)
only = set(sys.argv[1:])
for pos in sorted(d, key=lambda x: [int(x) if x.isdigit() else 0]):
    if only and pos not in only:
        continue
    v = d[pos]
    print("=" * 20, pos, v["brand"], "|", v["model"])
    seen = set()
    for r in v["rows"]:
        key = tuple(sorted((t, u) for t, u in r["results"]))
        dup = key in seen
        seen.add(key)
        print(f"  q[{r['kind']}{'+dup' if dup else ''}] {r['q']}  note={r['note'][:80]}")
        if not dup:
            for t, u in r["results"][:6]:
                tag = " SHOP" if SHOP.search(u) else ""
                print(f"     - {t[:90]} | {u[:120]}{tag}")
