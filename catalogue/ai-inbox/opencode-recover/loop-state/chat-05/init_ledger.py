#!/usr/bin/env python3
"""Chat 05: build chat-05-ledger.csv (27 cols) from chat-05 assignment file."""
import csv, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSIGN = HERE.parent / "chat-assignments" / "chat-05.csv"
LEDGER = HERE / "chat-05-ledger.csv"
QUEUE = HERE / "queue_state.json"

HEADER = [
    "source_position", "item_code", "uom", "display_name", "category",
    "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
    "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
    "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
    "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
    "machine_gate", "reason", "human_action",
]

rows = []
with open(ASSIGN, newline="", encoding="utf-8-sig") as fh:
    rdr = csv.DictReader(fh)
    for r in rdr:
        rows.append({
            "source_position": r["source_position"].strip(),
            "item_code": r["item_code"].strip(),
            "uom": r["uom"].strip(),
            "display_name": r["display_name"].strip(),
            "category": r["category"].strip(),
            "detected_brand": (r.get("detected_brand") or "").strip(),
            "detected_model": (r.get("detected_model") or "").strip(),
            "state": "open",
            "round_first_seen": "1",
            "round_last_touched": "",
            "tiers_tried": "",
            "official_product_page": "",
            "official_image_url": "",
            "image_px_w": "", "image_px_h": "", "image_bytes": "", "image_sha256": "",
            "match_confidence": "", "finish_exact": "", "model_exact": "",
            "uom_assessment": "",
            "rights_status": "",
            "researcher_decision": "",
            "verifier_verdict": "",
            "machine_gate": "",
            "reason": "",
            "human_action": "",
        })

with open(LEDGER, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=HEADER)
    w.writeheader()
    w.writerows(rows)

queue = {r["source_position"]: {"tier": 1, "state": "open"} for r in rows}
QUEUE.write_text(json.dumps(queue, indent=0), encoding="utf-8")

keys = [(r["item_code"], r["uom"]) for r in rows]
dups = len(keys) - len(set(keys))
print(f"rows={len(rows)} dup_item_code_uom_within_block={dups}")
ord_lo = min(int(r['source_position']) for r in rows)  # placeholder; ordinal col absent here
