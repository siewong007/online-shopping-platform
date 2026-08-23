#!/usr/bin/env python3
"""Emit deliverable shard/verify CSVs from research + verify JSONL stores."""
import csv, json
from pathlib import Path

HERE = Path(__file__).resolve().parent
rows = {r["source_position"]: r for r in csv.DictReader(open(HERE / "chat-05-ledger.csv", newline="", encoding="utf-8"))}

research = {}
for f in sorted((HERE / "research").glob("r-batch-*.jsonl")):
    for line in open(f, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
            research[str(d["pos"])] = d
        except Exception:
            pass

verdicts = {}
for f in sorted((HERE / "verify").glob("verify-*.jsonl")):
    for line in open(f, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        try:
            v = json.loads(line)
            verdicts[str(v["pos"])] = v
        except Exception:
            pass

SHARD_H = ["source_position", "item_code", "uom", "official_product_page", "official_image_url",
           "researcher_decision", "match_confidence", "finish_exact", "model_exact",
           "uom_assessment", "rights_status", "reason", "human_action"]
VERIFY_H = ["source_position", "item_code", "uom", "verifier_verdict", "model_exact",
            "finish_exact", "model_string_on_page", "justification"]

shards, veris = [], []
for pos, r in sorted(rows.items(), key=lambda kv: int(kv[0])):
    res = research.get(pos)
    if not res:
        continue
    shards.append({
        "source_position": pos, "item_code": r["item_code"], "uom": r["uom"],
        "official_product_page": r.get("official_product_page", ""),
        "official_image_url": r.get("official_image_url", ""),
        "researcher_decision": res.get("decision", ""),
        "match_confidence": r.get("match_confidence", ""),
        "finish_exact": r.get("finish_exact", ""), "model_exact": r.get("model_exact", ""),
        "uom_assessment": r.get("uom_assessment", ""), "rights_status": r.get("rights_status", ""),
        "reason": r.get("reason", "")[:1500], "human_action": r.get("human_action", ""),
    })
    v = verdicts.get(pos)
    if v:
        veris.append({
            "source_position": pos, "item_code": r["item_code"], "uom": r["uom"],
            "verifier_verdict": v.get("verifier_verdict", ""),
            "model_exact": v.get("model_exact", ""), "finish_exact": v.get("finish_exact", ""),
            "model_string_on_page": "", "justification": (v.get("justification") or "")[:400],
        })

with open(HERE / "shard-3357-4195.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=SHARD_H)
    w.writeheader(); w.writerows(shards)
with open(HERE / "verify-3357-4195.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=VERIFY_H)
    w.writeheader(); w.writerows(veris)
print(json.dumps({"shard_rows": len(shards), "verify_rows": len(veris)}))
