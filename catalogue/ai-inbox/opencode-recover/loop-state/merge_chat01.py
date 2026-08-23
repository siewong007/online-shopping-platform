#!/usr/bin/env python3
"""Generic chat-01 merge: python merge_chat01.py <round> <shard.csv:verify.csv> [...]
Rows merged into loop-ledger.csv; then gate + apply_gate + snapshot run."""
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


def main() -> int:
    rnd = sys.argv[1]
    pairs = []
    for a in sys.argv[2:]:
        sf, vf = a.split(":")
        pairs.append((STATE / "chat-01" / sf, STATE / "chat-01" / vf if vf else None))

    rows = list(csv.DictReader(open(LEDGER, newline="", encoding="utf-8")))
    assert list(rows[0].keys()) == HEADER
    by_pos = {r["source_position"]: r for r in rows}

    from collections import Counter
    cnt = Counter()
    for sp, vp in pairs:
        sh = {}
        for r in csv.DictReader(open(sp, encoding="utf-8-sig")):
            p = r["source_position"]
            if p not in sh:  # first occurrence wins
                sh[p] = r
        vv = {}
        if vp and vp.exists():
            vv = {r["source_position"]: r for r in csv.DictReader(open(vp, encoding="utf-8-sig"))}
        tag_r = f"r{rnd}"
        for pos, s in sh.items():
            lr = by_pos.get(pos)
            if lr is None or lr["state"] == "verified_pass":
                continue
            dec = (s.get("researcher_decision") or "").strip().lower()
            v = vv.get(pos)
            vverd = ((v or {}).get("verifier_verdict") or "").strip().lower()
            tag = f"| {tag_r}:{dec}" + (f"/verify:{vverd}" if v else "")
            if tag not in lr["reason"]:
                extra = " log[" + (s.get("reason") or "")[:1200] + "]"
                if v and v.get("justification"):
                    extra += " verifier[" + v["justification"][:300] + "]"
                lr["reason"] += tag + extra
            lr["round_last_touched"] = rnd
            tt = [t for t in (lr["tiers_tried"] or "").split("|") if t]
            if dec in ("candidate", "pending", "reject"):
                if tt and rnd not in ("3", "4") and False:
                    pass
                # tier bookkeeping: candidate/pending/reject rows consumed their start tier
                start = "4" if "harvest" in (s.get("reason") or "") else "1"
                if "q:" in (s.get("reason") or "") and start not in tt:
                    tt.append(start)
            lr["tiers_tried"] = "|".join(tt)
            lr["human_action"] = s.get("human_action") or lr["human_action"]
            if s.get("rights_status"):
                lr["rights_status"] = s["rights_status"]
            if dec == "pending":
                lr["state"] = "open"; cnt["pending"] += 1
            elif dec == "exhausted":
                # documented dead end: requires t1..t5 markers logged in reason
                need = [m for m in ("t1:", "t3:", "t4:", "t5:") if m not in (s.get("reason") or "")
                        and ("q:" not in (s.get("reason") or "") or m != "t1:")]
                if need:
                    lr["state"] = "open"
                    cnt["exhaust_incomplete"] += 1
                else:
                    lr["state"] = "exhausted"
                    lr["researcher_decision"] = "exhausted"
                    cnt["exhausted"] += 1
            elif dec == "reject":
                lr["state"] = "open"; lr["researcher_decision"] = "reject"; cnt["reject"] += 1
            elif dec == "candidate":
                lr["official_product_page"] = s.get("official_product_page") or lr["official_product_page"]
                lr["official_image_url"] = s.get("official_image_url") or lr["official_image_url"]
                lr["match_confidence"] = s.get("match_confidence") or ""
                lr["researcher_decision"] = "candidate"
                if vverd == "pass":
                    lr["state"] = "candidate"; lr["verifier_verdict"] = "pass"
                    lr["model_exact"] = ((v or {}).get("model_exact") or s.get("model_exact") or "")
                    lr["finish_exact"] = ((v or {}).get("finish_exact") or s.get("finish_exact") or "")
                    lr["rights_status"] = s.get("rights_status") or lr["rights_status"] or "needs_permission"
                    cnt["to_gate"] += 1
                elif vverd == "fail":
                    lr["state"] = "open"; lr["verifier_verdict"] = "fail"; cnt["disagree"] += 1
                else:
                    lr["state"] = "open"; cnt["no_verdict"] += 1

    with open(LEDGER, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=HEADER)
        w.writeheader()
        w.writerows(rows)
    print(dict(cnt))
    subprocess.run([sys.executable, str(STATE / "gate.py"), f"--round", rnd], check=False)
    subprocess.run([sys.executable, str(STATE / "apply_gate.py"), rnd], check=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
