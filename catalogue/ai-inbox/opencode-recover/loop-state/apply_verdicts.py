#!/usr/bin/env python3
"""Merge researcher shard CSVs + blind-verifier CSVs into loop-ledger.csv.

Transitions:
  researcher candidate + verifier pass   -> state=candidate (awaits machine gate)
  researcher candidate + verifier fail   -> state=open, disagreement logged, tier+1
  researcher pending                     -> stays open (tier consumed)
  researcher reject                      -> stays open (tier consumed)
"""
from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from pathlib import Path

STATE_DIR = Path(__file__).resolve().parent
LEDGER = STATE_DIR / "loop-ledger.csv"
HEADER = [
    "source_position", "item_code", "uom", "display_name", "category",
    "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
    "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
    "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
    "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
    "machine_gate", "reason", "human_action",
]
SHARDS = [
    ("0001-0100", "A"), ("0101-0200", "B"), ("0201-0300", "C"), ("0301-0400", "D"),
]

def main() -> int:
    rnd = sys.argv[1] if len(sys.argv) > 1 else "1"
    with open(LEDGER, newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh)
        assert rdr.fieldnames == HEADER
        rows = list(rdr)
    by_pos = {r["source_position"]: r for r in rows}

    counts = Counter()
    for rng, _w in SHARDS:
        shard_fn = STATE_DIR / f"round-{int(rnd):02d}" / f"shard-{rng}.csv"
        verify_fn = STATE_DIR / f"round-{int(rnd):02d}" / f"verify-{rng}.csv"
        if not shard_fn.exists():
            print(f"MISSING {shard_fn}")
            continue
        sh = {r["source_position"]: r for r in csv.DictReader(open(shard_fn, encoding="utf-8-sig"))}
        vf = {}
        if verify_fn.exists():
            vf = {r["source_position"]: r for r in csv.DictReader(open(verify_fn, encoding="utf-8-sig"))}
        for pos, srow in sh.items():
            lr = by_pos.get(pos)
            if lr is None:
                continue
            dec = (srow.get("researcher_decision") or "").strip().lower()
            v = vf.get(pos)
            vverd = ((v or {}).get("verifier_verdict") or "").strip().lower()
            # append reason log once
            tag = f"| r{rnd}:{dec}"
            if v is not None:
                tag += f"/verify:{vverd}"
            if tag not in lr["reason"]:
                extra = []
                if srow.get("reason"):
                    extra.append("log[" + srow["reason"][:1500] + "]")
                if v is not None and v.get("justification"):
                    extra.append("verifier[" + v["justification"][:300] + "]")
                lr["reason"] = (lr["reason"] + f" {tag} " + " ".join(extra)).strip()

            lr["round_last_touched"] = rnd
            if not lr["tiers_tried"]:
                lr["tiers_tried"] = "1"
            elif "1" not in lr["tiers_tried"].split("|"):
                lr["tiers_tried"] += "|1"
            lr["rights_status"] = srow.get("rights_status") or lr["rights_status"] or "unknown"
            lr["uom_assessment"] = srow.get("uom_assessment") or lr["uom_assessment"]
            lr["human_action"] = srow.get("human_action") or lr["human_action"]
            lr["match_confidence"] = srow.get("match_confidence") or ""
            lr["finish_exact"] = srow.get("finish_exact") or ""
            lr["model_exact"] = srow.get("model_exact") or ""

            if dec == "candidate":
                lr["official_product_page"] = srow.get("official_product_page") or lr["official_product_page"]
                lr["official_image_url"] = srow.get("official_image_url") or lr["official_image_url"]
                lr["researcher_decision"] = "candidate"
                if vverd == "pass":
                    lr["state"] = "candidate"
                    lr["verifier_verdict"] = "pass"
                    if v:
                        lr["finish_exact"] = v.get("finish_exact") or lr["finish_exact"]
                        lr["model_exact"] = v.get("model_exact") or lr["model_exact"]
                    counts["to_gate"] += 1
                elif vverd == "fail":
                    lr["state"] = "open"
                    lr["verifier_verdict"] = "fail"
                    lr["machine_gate"] = ""
                    counts["disagree"] += 1
                else:
                    lr["state"] = "open"
                    counts["no_verdict"] += 1
            else:
                lr["state"] = "open"
                lr["researcher_decision"] = dec or "none"
                counts[f"stay_open_{dec or 'none'}"] += 1

    with open(LEDGER, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=HEADER)
        w.writeheader()
        w.writerows(rows)
    print(dict(counts))
    return 0


if __name__ == "__main__":
    sys.exit(main())
