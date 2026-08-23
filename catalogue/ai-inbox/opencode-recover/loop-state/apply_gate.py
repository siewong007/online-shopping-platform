#!/usr/bin/env python3
"""Apply gate results to ledger states (driver-side transitions).

Rules:
  state=candidate & no red for its key -> verified_pass (machine_gate=green)
  state=candidate & red(s)            -> open (machine_gate=red:<code>, reason appended)
  exhausted/exhausted_no_progress/verified_pass untouched here.
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


def main() -> int:
    rnd = sys.argv[1] if len(sys.argv) > 1 else "0"
    report_path = STATE_DIR / f"round-{int(rnd):02d}" / "gate-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    red_by_key = {}
    amber_by_key = {}
    for x in report["reds"]:
        pos = x["key"].rsplit("#", 1)[-1]
        if x["code"].startswith("amber:"):
            amber_by_key.setdefault(pos, x)
            continue
        cur = red_by_key.get(pos)
        # keep first (highest-priority) red
        if cur is None or x["code"] < cur["code"]:
            red_by_key[pos] = x

    with open(LEDGER, newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh)
        assert rdr.fieldnames == HEADER, rdr.fieldnames
        rows = list(rdr)

    promoted = demoted = ambered = 0
    codes = Counter()
    for r in rows:
        pos = r["source_position"]
        if r["state"] != "candidate":
            continue
        red = red_by_key.get(pos)
        amber = amber_by_key.get(pos)
        if red is None and amber is not None:
            # logging defect only: hold in candidate, never demote, repair then re-gate
            r["machine_gate"] = amber["code"]
            note = f" | r{rnd}:{amber['code']} {amber['detail'][:120]}"
            if note not in r["reason"]:
                r["reason"] += note
            ambered += 1
            continue
        if red is None:
            r["state"] = "verified_pass"
            r["machine_gate"] = "green"
            r["round_last_touched"] = rnd
            ev_file = STATE_DIR / "evidence.json"
            # merge evidence across root + chat folders, newest fetched_round wins
            best = {}
            for ef in sorted(STATE_DIR.glob("evidence*.json")) + \
                    sorted(STATE_DIR.glob("chat-*/evidence*.json")):
                try:
                    data = json.loads(ef.read_text(encoding="utf-8")).get(pos, {})
                except Exception:
                    continue
                if not data:
                    continue
                if (data.get("fetched_round") or 0) >= (best.get("fetched_round") or 0):
                    best = data
            ev = best
            # NEVER overwrite a claimed URL with an older evidence URL
            r["image_px_w"] = str(ev.get("px_w") or "") or r["image_px_w"]
            r["image_px_h"] = str(ev.get("px_h") or "") or r["image_px_h"]
            r["image_bytes"] = str(ev.get("image_bytes_len") or "") or r["image_bytes"]
            r["image_sha256"] = ev.get("image_sha256") or r["image_sha256"]
            ct = ev.get("image_content_type") or ""
            if "|tls_unverified" in ct and not r["human_action"]:
                r["human_action"] = "note: TLS cert invalid on host; fetched unverified"
            if not r["verifier_verdict"]:
                r["verifier_verdict"] = "pass-inherited-dual-pass"
            promoted += 1
        else:
            r["state"] = "open"
            r["machine_gate"] = red["code"]
            r["researcher_decision"] = ""
            r["verifier_verdict"] = ""
            r["round_last_touched"] = rnd
            note = f" | r{rnd}:gate-fail {red['code']} {red['detail'][:180]}"
            if note not in r["reason"]:
                r["reason"] += note
            codes[red["code"]] += 1
            demoted += 1

    with open(LEDGER, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=HEADER)
        w.writeheader()
        w.writerows(rows)
    print(f"round {rnd}: promoted={promoted} demoted={demoted} amber_held={ambered} red_codes={dict(codes)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
