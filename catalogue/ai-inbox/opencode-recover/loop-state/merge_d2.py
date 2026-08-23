#!/usr/bin/env python3
"""Merge chat-01 D2 researcher+verifier outputs into loop-ledger.csv, then gate."""
import csv
import subprocess
import sys
from pathlib import Path

STATE = Path(__file__).resolve().parent
LEDGER = STATE / "loop-ledger.csv"
HEADER = [
    "source_position", "item_code", "uom", "display_name", "category",
    "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
    "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
    "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
    "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
    "machine_gate", "reason", "human_action",
]

sh = {r["source_position"]: r for r in csv.DictReader(
    open(STATE / "chat-01" / "shard-d2.csv", encoding="utf-8-sig"))}
vf = {r["source_position"]: r for r in csv.DictReader(
    open(STATE / "chat-01" / "verify-d2.csv", encoding="utf-8-sig"))}

rows = list(csv.DictReader(open(LEDGER, newline="", encoding="utf-8")))
assert list(rows[0].keys()) == HEADER
by_pos = {r["source_position"]: r for r in rows}

to_gate = disagree = pending = 0
for pos, s in sh.items():
    lr = by_pos.get(pos)
    if lr is None or lr["state"] == "verified_pass":
        continue
    v = vf.get(pos)
    vverd = ((v or {}).get("verifier_verdict") or "").lower()
    dec = (s.get("researcher_decision") or "").lower()
    tag = f"| r3:d2:{dec}" + (f"/verify:{vverd}" if v else "/no-verifier")
    if tag not in lr["reason"]:
        extra = " log[" + (s.get("reason") or "")[:800] + "]"
        if v and v.get("justification"):
            extra += " verifier[" + v["justification"][:300] + "]"
        lr["reason"] += tag + extra
    lr["round_last_touched"] = "3"
    tt = [t for t in (lr["tiers_tried"] or "").split("|") if t]
    if dec == "pending":
        lr["state"] = "open"
        lr["human_action"] = s.get("human_action") or lr["human_action"]
        pending += 1
        continue
    if dec != "candidate":
        continue
    lr["official_product_page"] = s["official_product_page"]
    lr["official_image_url"] = s["official_image_url"]
    lr["researcher_decision"] = "candidate"
    if vverd == "pass":
        lr["verifier_verdict"] = "pass"
        lr["finish_exact"] = (v or {}).get("finish_exact") or s.get("finish_exact") or ""
        lr["model_exact"] = (v or {}).get("model_exact") or s.get("model_exact") or ""
        lr["match_confidence"] = s.get("match_confidence") or "B"
        lr["rights_status"] = s.get("rights_status") or "needs_permission"
        lr["state"] = "candidate"
        to_gate += 1
    elif vverd == "fail":
        lr["state"] = "open"
        lr["verifier_verdict"] = "fail"
        disagree += 1
    else:
        lr["state"] = "open"

with open(LEDGER, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=HEADER)
    w.writeheader()
    w.writerows(rows)
print(f"to_gate={to_gate} disagree={disagree} pending={pending}")

subprocess.run([sys.executable, str(STATE / "gate.py"), "--round", "3"], check=False)
subprocess.run([sys.executable, str(STATE / "apply_gate.py"), "3"], check=False)
subprocess.run([sys.executable, str(STATE / "publish_prior_work.py")], check=False)
