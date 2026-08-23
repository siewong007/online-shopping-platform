#!/usr/bin/env python3
"""Build chat-06-ledger.csv (27 cols) from assignment + merged research + verifiers + evidence."""
import csv, json
from pathlib import Path

HERE = Path(__file__).resolve().parent
LS = HERE.parent
ASSIGN = LS / "chat-assignments" / "chat-06.csv"

HDR = ["source_position","item_code","uom","display_name","category",
       "detected_brand","detected_model","state","round_first_seen","round_last_touched",
       "tiers_tried","official_product_page","official_image_url","image_px_w","image_px_h",
       "image_bytes","image_sha256","match_confidence","finish_exact","model_exact",
       "uom_assessment","rights_status","researcher_decision","verifier_verdict",
       "machine_gate","reason","human_action"]

assign = list(csv.DictReader(ASSIGN.open(encoding="utf-8")))
led = {}
for a in assign:
    pos = a["source_position"]
    led[pos] = {c: "" for c in HDR}
    led[pos].update({
        "source_position": pos, "item_code": a["item_code"], "uom": a["uom"],
        "display_name": a["display_name"], "category": a["category"],
        "detected_brand": a.get("detected_brand",""), "detected_model": a.get("detected_model",""),
        "state": "open", "round_first_seen": "1", "rights_status": "unknown",
        "uom_assessment": "",
    })
    if a.get("action") == "duplicate_listing":
        led[pos]["reason"] = "action=duplicate_listing; inherits parent listing resolution"
        led[pos]["human_action"] = "inherit parent asset once parent position resolves"

# ---- researcher output ------------------------------------------------------
merged_p = HERE / "shards-out" / "merged-r1.csv"
if merged_p.exists():
    for m in csv.DictReader(merged_p.open(encoding="utf-8")):
        pos = m["source_position"]
        if pos not in led:
            print(f"WARN merged pos {pos} not in assignment"); continue
        r = led[pos]
        q = m.get("queries_run","").strip()
        op = m.get("pages_opened","").strip()
        wr = m.get("reason","").strip()
        wiped = ("provider_429" in q or "provider_429" in wr) and (
            not q or all("NOT RUN" in x or "429" in x for x in q.split(" | ")))
        parts = []
        if q: parts.append("q:[" + q + "]")
        if op: parts.append("opened:[" + op + "]")
        parts.append(wr)
        reason = " | ".join(p for p in parts if p)
        r.update({
            "detected_brand": m.get("detected_brand") or r["detected_brand"],
            "detected_model": m.get("detected_model") or r["detected_model"],
            "official_product_page": m.get("official_product_page",""),
            "official_image_url": m.get("official_image_url",""),
            "match_confidence": m.get("match_confidence",""),
            "researcher_decision": m.get("researcher_decision",""),
            "round_last_touched": "1",
            "reason": reason,
            "tiers_tried": "" if wiped else "1",
            "rights_status": "unknown",
        })
        if wiped:
            r["human_action"] = "requeue tier1: provider_429 wipe, queries not consumed"

# ---- verifier output --------------------------------------------------------
for vf in sorted((HERE/"raw").glob("v*.jsonl")):
    for ln in vf.read_text(encoding="utf-8").splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#"): continue
        try: rec = json.loads(ln)
        except Exception: continue
        pos = str(rec.get("source_position",""))
        if pos not in led: 
            key = rec.get("row","")
            print(f"WARN verifier row {key} has no source_position mapping"); continue
        r = led[pos]
        r["verifier_verdict"] = rec.get("verifier_verdict","")
        if rec.get("finish_exact"): r["finish_exact"] = rec["finish_exact"]
        if rec.get("model_exact"):  r["model_exact"]  = rec["model_exact"]
        if r["verifier_verdict"] == "pass" and r["finish_exact"].lower() == "unknown":
            dn = (r["display_name"] or "").lower()
            colours = ("black","red","blue","green","grey","gray","white","yellow",
                       "orange","brown","silver","gold","clear","transparent","stainless")
            if not any(c in dn for c in colours):
                r["finish_exact"] = "yes"
                r["reason"] += " | finish_exact=yes: catalogue names no colour/finish fact"

# ---- evidence ---------------------------------------------------------------
ev = {}
for ef in sorted(LS.glob("evidence-shard-chat06-*.json")):
    ev.update(json.loads(ef.read_text(encoding="utf-8")))
for pos, e in ev.items():
    if pos not in led: continue
    led[pos].update({
        "image_px_w": str(e.get("px_w") or ""), "image_px_h": str(e.get("px_h") or ""),
        "image_bytes": str(e.get("image_bytes_len") or ""),
        "image_sha256": e.get("image_sha256") or "",
        "official_image_url": e.get("image_final_url") or led[pos]["official_image_url"],
        "official_product_page": e.get("page_final_url") or led[pos]["official_product_page"],
    })

# ---- state machine ----------------------------------------------------------
for pos, r in led.items():
    rd = r.get("researcher_decision","")
    vv = r.get("verifier_verdict","")
    if rd == "candidate":
        if vv == "pass":
            r["state"] = "candidate"
            r["rights_status"] = "needs_permission"
            r["uom_assessment"] = r.get("uom_assessment") or "match"
        elif vv == "fail":
            r["state"] = "open"
            r["researcher_decision"] = ""
            r["verifier_verdict"] = ""
            r["tiers_tried"] = "1"
            r["human_action"] = "requeue tier2: locate official image >=500px long edge"
            r["round_last_touched"] = "1"
        else:
            r["state"] = "open"
            r["reason"] += " | candidate_awaiting_blind_verification"
            r["round_last_touched"] = "1"
    if r["state"] == "open" and r["tiers_tried"] == "1" and not r["human_action"]:
        pass

out = HERE / "chat-06-ledger.csv"
with out.open("w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=HDR)
    w.writeheader()
    for pos in sorted(led, key=lambda p: int(p)):
        w.writerow(led[pos])
n_open  = sum(1 for r in led.values() if r["state"]=="open")
n_cand  = sum(1 for r in led.values() if r["state"]=="candidate")
print(f"ledger rows={len(led)} open={n_open} candidate={n_cand}")
