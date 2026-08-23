#!/usr/bin/env python3
"""Build loop-ledger.csv from remaining-all-worklist.csv (real CSV reader, quoted fields safe)."""
from __future__ import annotations
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]  # online-shopping-platform/
WORKLIST = ROOT / "catalogue" / "ai-inbox" / "opencode-recover" / "remaining-all-worklist.csv"
LEDGER = Path(__file__).resolve().parent / "loop-ledger.csv"

HEADER = [
    "source_position", "item_code", "uom", "display_name", "category",
    "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
    "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
    "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
    "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
    "machine_gate", "reason", "human_action",
]

def main() -> int:
    with open(WORKLIST, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    print(f"worklist rows: {len(rows)}")
    from collections import Counter
    actions = Counter(r["action"] for r in rows)
    print("action counts:", dict(actions))
    seen = set()
    dups = []
    out = []
    for i, r in enumerate(rows):
        key = (r["item_code"], r["uom"])
        if key in seen:
            dups.append((i + 2, key))
        seen.add(key)
        out.append({
            "source_position": r["source_position"],
            "item_code": r["item_code"],
            "uom": r["uom"],
            "display_name": r["display_name"],
            "category": r["category"],
            "detected_brand": r["detected_brand"],
            "detected_model": r["detected_model"],
            "state": "open",
            "round_first_seen": "1",
            "round_last_touched": "",
            "tiers_tried": "",
            "official_product_page": r.get("prior_page", ""),
            "official_image_url": r.get("prior_image", ""),
            "image_px_w": "", "image_px_h": "", "image_bytes": "", "image_sha256": "",
            "match_confidence": "", "finish_exact": "", "model_exact": "",
            "uom_assessment": "", "rights_status": "unknown",
            "researcher_decision": "", "verifier_verdict": "",
            "machine_gate": "", 
            "reason": f"seed: action={r['action']}; prior_decision={r.get('prior_decision','')}; prior_source={r.get('prior_source','')}",
            "human_action": "",
        })
    with open(LEDGER, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=HEADER)
        w.writeheader()
        w.writerows(out)
    print(f"ledger written: {len(out)} rows -> {LEDGER}")
    if dups:
        print(f"WARNING duplicate item_code+uom in worklist: {dups[:20]} ({len(dups)} total)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
