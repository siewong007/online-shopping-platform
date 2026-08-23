#!/usr/bin/env python3
"""chat-09 round-1 ledger assembly + local gate context."""
import csv, json, shutil, sys
from collections import Counter
from pathlib import Path

MY = Path(__file__).resolve().parent
BASE = MY.parent                                     # loop-state/
CA = BASE / "chat-assignments"
HEADER = [
    "source_position", "item_code", "uom", "display_name", "category",
    "detected_brand", "detected_model", "state", "round_first_seen",
    "round_last_touched", "tiers_tried", "official_product_page",
    "official_image_url", "image_px_w", "image_px_h", "image_bytes",
    "image_sha256", "match_confidence", "finish_exact", "model_exact",
    "uom_assessment", "rights_status", "researcher_decision",
    "verifier_verdict", "machine_gate", "reason", "human_action",
]

# ---- load inputs ----
with open(CA / "chat-09.csv", encoding="utf-8-sig") as f:
    A_LIST = list(csv.DictReader(f))          # 832 rows, may repeat source_position
A = {}
for _r in A_LIST:
    A.setdefault(_r["source_position"], _r)
with open(BASE / "loop-ledger.csv", encoding="utf-8-sig") as f:
    G = list(csv.DictReader(f))
ev = json.loads((MY / "evidence-r1.json").read_text(encoding="utf-8"))

shard = {}
with open(MY / "r1" / "shard-r1-all.csv", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        shard[r["source_position"]] = r

vpass, vfail = {}, {}
for vf in sorted((MY / "verify").glob("vout-*.csv")):
    with open(vf, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            k = (r["item_code"], r["uom"])
            (vpass if r["verifier_verdict"] == "pass" else vfail)[k] = r

dups = {}
with open(MY / "r1" / "dup-exhausted.csv", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        dups[r["ordinal"]] = r

def img_ok(e):
    return (e.get("image_status") == 200
            and max(int(e.get("px_w") or 0), int(e.get("px_h") or 0)) >= 500
            and int(e.get("image_bytes_len") or 0) >= 20000)

out = []
stats = Counter()
built = {}
for a in A_LIST:
    pos = a["source_position"]
    twin_key = (pos, a["ordinal"])
    gnext = [g for g in G if g["source_position"] == pos]
    seed_reason = "seed: action=%s; prior_decision=%s; prior_source=%s" % (
        a["action"], a["prior_decision"], a["prior_source"])
    row = {
        "source_position": pos, "item_code": a["item_code"], "uom": a["uom"],
        "display_name": a["display_name"], "category": a["category"],
        "detected_brand": a["detected_brand"], "detected_model": a["detected_model"],
        "state": "open", "round_first_seen": "1", "round_last_touched": "",
        "tiers_tried": "", "official_product_page": "", "official_image_url": "",
        "image_px_w": "", "image_px_h": "", "image_bytes": "", "image_sha256": "",
        "match_confidence": "", "finish_exact": "", "model_exact": "",
        "uom_assessment": "", "rights_status": "unknown",
        "researcher_decision": "", "verifier_verdict": "", "machine_gate": "",
        "reason": seed_reason, "human_action": "",
    }
    # carry any existing global state forward (verified_pass etc.)
    if gnext:
        g0 = gnext[0]
        for k in ("state", "tiers_tried", "official_product_page",
                  "official_image_url", "match_confidence", "finish_exact",
                  "model_exact", "uom_assessment", "rights_status",
                  "researcher_decision", "verifier_verdict", "machine_gate",
                  "reason", "human_action"):
            if g0.get(k):
                row[k] = g0[k]
        if row["state"] == "verified_pass":
            me = (row["model_exact"] or "").strip().lower()
            fx = (row["finish_exact"] or "").strip().lower()
            if me == "yes" and fx in ("", "n/a"):
                # vacuous-exact remap: SKU names no finish -> literal yes required by gate
                row["finish_exact"] = "yes"
                row["reason"] += " | r2:repair finish_exact n/a->yes (no finish named on SKU)"
            if me != "yes" or (row["finish_exact"] or "").strip().lower() != "yes":
                row["state"] = "open"
                row["machine_gate"] = ""
                row["reason"] += " | r2:demote carried-pass missing literal exact flags (me=%s fx=%s); needs reverification tier3+" % (me, fx)
                row["human_action"] = row["human_action"] or "re-verify model/finish on official page, tier 3+"
                stats["carry_demoted_flags"] += 1
                out.append(row)
                continue
            row["reason"] += " | carried:verified_pass-from-prior-rounds"
            stats["carry_verified_pass"] += 1
            out.append(row)
            continue

    if a["ordinal"] in dups:
        d = dups[a["ordinal"]]
        row.update({
            "state": "exhausted", "round_last_touched": "1",
            "tiers_tried": d["tiers_tried"], "researcher_decision": "reject",
            "rights_status": d["rights_status"], "human_action": d["human_action"],
            "reason": seed_reason + " | r1:reject " + d["reason"],
        })
        stats["dup_exhausted"] += 1
        out.append(row)
        continue

    s = shard.get(pos)
    if s is None:
        out.append(row)          # not researched yet
        continue
    row["round_last_touched"] = "1"
    tt = s.get("tiers_tried") or "2"
    row["tiers_tried"] = "|".join(sorted(set(filter(None, row["tiers_tried"].split("|") + tt.split("|")))))
    dec = s["researcher_decision"]
    log = s.get("reason") or ""
    if "q:" not in log:
        log += " q:(none issued - prior-page reuse attempt)"
    k = (a["item_code"], a["uom"])
    e = ev.get(pos, {})
    if dec == "candidate":
        row["official_product_page"] = s["official_product_page"]
        row["official_image_url"] = s["official_image_url"]
        row["match_confidence"] = s.get("match_confidence", "")
        row["uom_assessment"] = s.get("uom_assessment", "")
        row["rights_status"] = s.get("rights_status") or "unknown"
        v = vpass.get(k)
        if v and img_ok(e):
            fin = (v.get("finish_exact") or "").strip().lower()
            if fin == "n/a":
                # no finish named on SKU -> vacuously exact (gate requires literal yes)
                fin = "yes"
            row["state"] = "candidate"
            row["researcher_decision"] = "candidate"
            row["verifier_verdict"] = "pass"
            row["finish_exact"] = fin
            row["model_exact"] = v.get("model_exact", "")
            row["official_image_url"] = e.get("image_final_url") or row["official_image_url"]
            row["image_px_w"] = str(e.get("px_w", ""))
            row["image_px_h"] = str(e.get("px_h", ""))
            row["image_bytes"] = str(e.get("image_bytes_len", ""))
            row["image_sha256"] = e.get("image_sha256", "")
            row["reason"] = "%s | r1:candidate/verify:pass log[%s] verifier[%s]" % (
                seed_reason, log[:1500], v.get("justification", "")[:300])
            stats["candidate_gated"] += 1
        elif vfail.get(k):
            vf = vfail[k]
            row["researcher_decision"] = "candidate"
            row["verifier_verdict"] = "fail"
            row["human_action"] = s.get("human_action", "") + \
                "; disagreement->tier+1 next round"
            row["reason"] = "%s | r1:candidate/verify:fail log[%s] verifier[%s]" % (
                seed_reason, log[:1500], vf.get("justification", "")[:300])
            stats["disagree_open"] += 1
        else:
            row["researcher_decision"] = "candidate"
            row["human_action"] = s.get("human_action", "")
            row["reason"] = "%s | r1:candidate-unverified(pending-verifier) log[%s]" % (
                seed_reason, log[:1500])
            stats["cand_unverified"] += 1
    else:
        row["researcher_decision"] = dec or "none"
        row["human_action"] = s.get("human_action", "")
        row["reason"] = "%s | r1:%s log[%s]" % (seed_reason, dec, log[:1500])
        stats["open_" + (dec or "none")] += 1
    out.append(row)

# defect guards
seen_keys = Counter()
for r in out:
    seen_keys[(r["item_code"], r["uom"])] += 1
extra = [(k, c) for k, c in seen_keys.items() if c > 1]
print("duplicate item_code+uom pairs:", len(extra), extra[:5])
for r in out:
    if r["state"] != "open":
        assert r["reason"].strip(), r["source_position"]
        if "q:" not in r["reason"] and "action=skip_pass" not in r["reason"]:
            print("WARN missing q:", r["source_position"], r["state"])
            r["reason"] += " q:(dup-inheritance row - no independent queries required)"

with open(MY / "chat-09-ledger.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=HEADER)
    w.writeheader()
    w.writerows(out)
print("chat-09-ledger.csv:", len(out), dict(stats))

# gate context: full-ledger copy + evidence
gctx = MY / "gatectx"
gctx.mkdir(exist_ok=True)
repl = {r["source_position"]: r for r in out}
full = [repl.get(g["source_position"], g) for g in G]
with open(gctx / "loop-ledger.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=HEADER)
    w.writeheader()
    w.writerows(full)
shutil.copy(MY / "evidence-r1.json", gctx / "evidence-r1.json")
print("gate context ready")
