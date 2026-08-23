#!/usr/bin/env python3
import json, re, sys
from urllib.parse import urlparse

d = json.load(open(r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-L1/serps.json", encoding="utf-8"))
pos_list = sys.argv[1:]
lines = []
for pos in pos_list:
    lines.append("=" * 8 + " " + pos)
    for r in d.get(pos, []):
        lines.append("  Q: " + r["q"][:90] + "  [" + r["kind"] + "]")
        for t, u in r["results"][:4]:
            host = urlparse(u).netloc.replace("www.", "")
            lines.append(f"      {host} | {t[:80]} | {u[:120]}")
open(r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-L1/digest.txt", "w", encoding="utf-8").write("\n".join(lines))
print("wrote digest", len(lines), "lines")
