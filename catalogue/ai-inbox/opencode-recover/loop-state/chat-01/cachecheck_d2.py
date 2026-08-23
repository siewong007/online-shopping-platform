#!/usr/bin/env python3
"""Check pagecache + chat-01 evidence for D2 positions."""
import json
import re
from pathlib import Path

RECOVER = Path(__file__).resolve().parents[1]
PC = RECOVER / "pagecache"
WANT = {"134", "138", "153", "168", "174", "178", "185", "186", "197", "201",
        "227", "232", "3872", "5009", "4976", "6227", "3623", "4225",
        "131", "3756", "3593"}

print("--- pagecache files for D2 positions ---")
for p in sorted(WANT, key=int):
    f = PC / f"{p}.txt"
    print(p, f.stat().st_size if f.exists() else "MISSING")

print("\n--- chat-01 evidence keys ---")
for name in ("evidence-harvest-lc.json", "evidence-S0003.json"):
    fp = HERE if False else Path(__file__).resolve().parent / name
    if fp.exists():
        ev = json.loads(fp.read_text(encoding="utf-8"))
        hit = [k for k in ev if k in WANT]
        print(name, "->", hit)
        for k in hit:
            e = ev[k]
            print(" ", k, "pg:", e.get("page_status"), "img:", e.get("image_status"),
                  "px:", e.get("px_w"), "x", e.get("px_h"), "bytes:", e.get("image_bytes_len"),
                  "| url:", (e.get("image_final_url") or "")[:100])
