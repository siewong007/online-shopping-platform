#!/usr/bin/env python3
"""Merge round-02 shard+verify pairs (F, H-partial) into loop-ledger.csv.

Rules: candidate+verify pass -> candidate (await gate); candidate+verify fail -> open
(disagreement); candidate with NO verifier verdict -> open, flagged awaiting-blind-verify;
pending/reject -> open. Never lose researcher logs.
"""
from __future__ import annotations

import csv
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
PAIRS = [
    ("shard-0501-0600.csv", "verify-0501-0600.csv"),
    ("shard-0701-0800.csv", None),  # H partial: no verifier yet
]

def main() -> int:
    rnd = sys.argv[1] if len(sys.argv) > 1 else "2"
    rows = list(csv.DictReader(open(LEDGER, newline="", encoding="utf-8")))
    assert list(rows[0].keys()) == HEADER
    by_pos = {r["source_position"]: r for r in rows}
    cnt = Counter()
    for sf, vf in PAIRS:
        sp = STATE_DIR / f"round-{int(rnd):02d}" / sf
        if not sp.exists():
            print("missing", sf); continue
        seen = set()
        sh = {}
        for r in csv.DictReader(open(sp, encoding="utf-8-sig")):
            p = r["source_position"]
            if p in seen:
                continue  # first occurrence wins on partial-file duplicates
            seen.add(p)
            sh[p] = r
        vv = {}
        if vf and (STATE_DIR / f"round-{int(rnd):02d}" / vf).exists():
            vv = {r["source_position"]: r for r in csv.DictReader(
                open(STATE_DIR / f"round-{int(rnd):02d}" / vf, encoding="utf-8-sig"))}
        for pos, s in sh.items():
            lr = by_pos.get(pos)
            if lr is None or lr["state"] == "verified_pass":
                continue
            dec = (s.get("researcher_decision") or "").strip().lower()
            v = vv.get(pos)
            vverd = ((v or {}).get("verifier_verdict") or "").strip().lower()
            tag = f"| r{rnd}:{dec}" + (f"/verify:{vverd}" if v is not None else "/no-verifier")
            if tag not in lr["reason"]:
                extra = " log[" + (s.get("reason") or "")[:1500] + "]"
                if v is not None and v.get("justification"):
                    extra += " verifier[" + v["justification"][:300] + "]"
                lr["reason"] = lr["reason"] + tag + extra
            lr["round_last_touched"] = rnd
            tt = [t for t in (lr["tiers_tried"] or "").split("|") if t]
            if dec or pos in sh:
                if "2" not in tt:
                    tt.append("2")
                lr["tiers_tried"] = "|".join(tt)
            lr["rights_status"] = s.get("rights_status") or lr["rights_status"] or "unknown"
            lr["human_action"] = s.get("human_action") or lr["human_action"]
            if dec == "candidate":
                lr["official_product_page"] = s.get("official_product_page") or lr["official_product_page"]
                lr["official_image_url"] = s.get("official_image_url") or lr["official_image_url"]
                lr["match_confidence"] = s.get("match_confidence") or ""
                lr["researcher_decision"] = "candidate"
                if vverd == "pass":
                    lr["state"] = "candidate"; lr["verifier_verdict"] = "pass"
                    lr["model_exact"] = ((v or {}).get("model_exact") or s.get("model_exact") or "")
                    lr["finish_exact"] = ((v or {}).get("finish_exact") or s.get("finish_exact") or "")
                    cnt["to_gate"] += 1
                elif vverd == "fail":
                    lr["state"] = "open"; lr["verifier_verdict"] = "fail"; cnt["disagree"] += 1
                else:
                    lr["state"] = "open"
                    lr["verifier_verdict"] = "awaiting-blind-verify"
                    cnt["await_verify"] += 1
            else:
                lr["state"] = "open"; lr["researcher_decision"] = dec or "none"
                cnt["stay_" + (dec or "none")] += 1
    with open(LEDGER, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=HEADER); w.writeheader(); w.writerows(rows)
    print(dict(cnt))
    return 0

if __name__ == "__main__":
    sys.exit(main())
