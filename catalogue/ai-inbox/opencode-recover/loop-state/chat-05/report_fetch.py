#!/usr/bin/env python3
"""Report fetch outcomes: which positions have green image evidence."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
EVID = HERE / "evidence-chat05.json"
ev = json.loads(EVID.read_text(encoding="utf-8")) if EVID.exists() else {}

good, bad = [], []
for pos in sorted(ev, key=lambda p: int(p) if p.isdigit() else 10 ** 9):
    e = ev[pos]
    ct = (e.get("image_content_type") or "")
    pw, ph = e.get("px_w") or 0, e.get("ph_h") if False else (e.get("px_h") or 0)
    blen = e.get("image_bytes_len") or 0
    ok = (e.get("image_status") == 200 and ct.startswith("image/")
          and max(pw, ph) >= 500 and blen >= 20000)
    line = f"{pos}|{pw}x{ph}|{blen}B|{ct.split(';')[0]}|img{e.get('image_status')}|pg{e.get('page_status')}"
    (good if ok else bad).append(line)

print(f"GREEN ({len(good)}):")
print("\n".join(good))
print(f"\nRED/PENDING ({len(bad)}):")
print("\n".join(bad))
