#!/usr/bin/env python3
"""Chat-03 round consolidation: merge research results + verdicts + evidence into
chat-03-ledger.csv (27 cols) + shard CSVs. Gate decides final states afterwards."""
import csv, json, glob, sys
from pathlib import Path

BASE = Path(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform")
RECOVER = BASE / "catalogue" / "ai-inbox" / "opencode-recover"
LS = RECOVER / "loop-state"
ME = LS / "chat-03"

HEADER = [
    "source_position", "item_code", "uom", "display_name", "category",
    "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
    "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
    "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
    "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
    "machine_gate", "reason", "human_action",
]

def q(s):
    return (s or "").strip()

def main():
    assign = {r["source_position"]: r for r in csv.DictReader(
        open(LS / "chat-assignments" / "chat-03.csv", encoding="utf-8-sig"))}
    # research results by position
    res = {}
    for f in sorted(glob.glob(str(ME / "results" / "research-r*.json"))):
        try:
            data = json.loads(Path(f).read_text(encoding="utf-8"))
        except Exception as e:
            print("BAD research json", f, repr(e)[:80])
            continue
        for r in data:
            p = str(r.get("source_position", ""))
            if p:
                old = res.get(p)
                if old is None or int(r.get("tier_used") or 0) >= int(old.get("tier_used") or 0):
                    res[p] = r
    # verdicts by position
    verd = {}
    for f in glob.glob(str(ME / "results" / "verify-*.json")) + glob.glob(str(ME / "results" / "merged" / "*.json")):
        try:
            data = json.loads(Path(f).read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, list):
            continue
        for r in data:
            p = str(r.get("source_position", ""))
            v = r.get("verifier_verdict") or r.get("verdict") or ""
            me_ = r.get("model_exact") or r.get("model_match") or ""
            fe = r.get("finish_exact") or r.get("finish_match") or ""
            if p and v:
                verd[p] = {"v": v, "me": me_, "fe": fe,
                           "just": r.get("justification") or r.get("notes") or ""}
    ev = json.loads((ME / "sandbox" / "evidence-chat03.json").read_text(encoding="utf-8"))
    hashes = {r["source_position"]: r for r in csv.DictReader(open(ME / "hashes.csv", encoding="utf-8-sig"))} if (ME/"hashes.csv").exists() else {}
    # collision positions
    bysha = {}
    for p, e in ev.items():
        if e.get("image_status") == 200 and e.get("image_sha256"):
            bysha.setdefault(e["image_sha256"], []).append(p)
    coll = {p for ps in bysha.values() if len(ps) > 1 for p in ps}

    out = []
    n_states = {}
    for pos, a in assign.items():
        r = res.get(pos, {})
        e = ev.get(pos, {})
        h = hashes.get(pos, {})
        vd = verd.get(pos)
        decision = q(r.get("decision"))
        cand_urls = bool(q(r.get("official_product_page")) and q(r.get("official_image_url")))
        queries = r.get("queries") or []
        pages = r.get("pages_opened") or []
        qlog = " ".join("q:%s" % x for x in queries)
        plog = " ".join("p:%s" % (pg.get("url") if isinstance(pg, dict) else pg) for pg in pages)
        base_reason = "%s | %s | %s" % (qlog, plog, q(r.get("reason"))) if (qlog or plog) else q(r.get("reason"))
        tier_used = int(r.get("tier_used") or 0)
        state = "open"
        researcher_decision = decision if decision else ""
        verifier_verdict = ""
        machine_gate = ""
        finish_exact = q(r.get("finish_match"))
        model_exact = "yes" if q(r.get("model_string_on_page")) else ""
        conf = q(r.get("confidence"))
        rights = q(r.get("rights_status")) or "unknown"
        human_action = q(r.get("human_action"))
        img_url = q(r.get("official_image_url"))
        page_url = q(r.get("official_product_page"))
        px_w = str(e.get("px_w") or "")
        px_h = str(e.get("px_h") or "")
        nbytes = str(e.get("image_bytes_len") or "")
        sha = e.get("image_sha256") or ""

        if a["action"] == "duplicate_listing":
            reason = ("action=duplicate_listing | row declared duplicate of sibling listing "
                      "(same item_code+uom); parent researched separately. %s" % base_reason)
            researcher_decision = "duplicate_listing_follow_parent"
            state = "open"
            reason = reason + " | " + "twin positions held by other blocks; global merge pairs them"
            n_states["open"] = n_states.get("open", 0) + 1
            out.append(dict(zip(HEADER, [pos, a["item_code"], a["uom"], a["display_name"], a["category"],
                a["detected_brand"], a["detected_model"], state, "1", "1", str(max(tier_used,0)), "", "", "", "", "",
                "", "", "", "", "", rights, researcher_decision, "", machine_gate, reason[:3900], human_action])))
            continue

        if pos in coll and decision == "candidate":
            state = "open"
            researcher_decision = "reject_family_hero"
            reason = ("family hero: image sha shared across positions %s in block; failed all claimants, escalate tier. %s"
                      % (",".join(sorted(bysha[sha])), base_reason))
            human_action = human_action or "escalate to tier %d: find size/variant-specific official image" % (max(tier_used, 0) + 1)
            n_states["open"] = n_states.get("open", 0) + 1
        elif decision == "candidate" and cand_urls and pos in ev and e.get("page_status") == 200 and e.get("image_status") == 200 \
                and int(e.get("image_bytes_len") or 0) >= 20000 and max(int(e.get("px_w") or 0), int(e.get("px_h") or 0)) >= 500:
            if vd:
                verifier_verdict = q(vd["v"])
                model_exact = "yes" if str(vd["me"]).lower() == "yes" else ("no" if str(vd["me"]).lower() == "no" else model_exact)
                finish_exact = "yes" if str(vd["fe"]).lower() == "yes" else ("no" if str(vd["fe"]).lower() == "no" else finish_exact)
                if verifier_verdict.lower() == "pass":
                    state = "candidate"   # gate decides promotion
                    reason = "researcher candidate + blind verifier PASS + evidence fetched this round. %s | verifier: %s" % (base_reason, q(vd["just"]))
                else:
                    state = "open"
                    researcher_decision = "rejected_by_verifier"
                    reason = "blind verifier FAIL: %s | %s" % (q(vd["just"]), base_reason)
                    human_action = human_action or "escalate to tier %d" % (max(tier_used, 0) + 1)
            else:
                state = "open"
                researcher_decision = "candidate_pending_verifier"
                reason = "candidate awaiting blind verification. %s" % base_reason
            n_states[state] = n_states.get(state, 0) + 1
        else:
            state = "open"
            lowres = r.get("low_res")
            extra = []
            if decision == "candidate":
                extra.append("candidate dropped: evidence fetch failed or below bar (page/image status, <500px or <20KB)")
                if lowres: extra.append("low_res")
                researcher_decision = "candidate_evidence_failed"
            elif decision == "no_candidate":
                researcher_decision = "no_candidate_t%d" % max(tier_used, 1)
            reason = base_reason if base_reason else "no research record found this round"
            if extra:
                reason = "%s | %s" % ("; ".join(extra), reason)
            human_action = human_action or (("escalate to tier %d" % (max(tier_used, 0) + 1)) if tier_used else "")
            n_states["open"] = n_states.get("open", 0) + 1

        if state == "candidate":
            img_url = e.get("image_final_url") or img_url
            page_url = e.get("page_final_url") or page_url
            sha = e.get("image_sha256") or ""
            px_w, px_h, nbytes = str(e.get("px_w")), str(e.get("px_h")), str(e.get("image_bytes_len"))

        out.append(dict(zip(HEADER, [pos, a["item_code"], a["uom"], a["display_name"], a["category"],
            a["detected_brand"], a["detected_model"], state, "1", "1", str(max(tier_used, 1)),
            page_url, img_url, px_w, px_h, nbytes, sha, conf, finish_exact, model_exact,
            "", rights, researcher_decision, verifier_verdict, machine_gate, reason[:3900], human_action])))

    with open(ME / "chat-03-ledger.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=HEADER)
        w.writeheader()
        w.writerows(out)

    # shard files mirroring batch ranges
    lo = min(int(p) for p in assign); hi = max(int(p) for p in assign)
    with open(ME / ("shard-%d-%d.csv" % (lo, hi)), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=HEADER)
        w.writeheader()
        w.writerows(out)
    vp = [o for o in out if o["state"] == "candidate"]
    with open(ME / ("verify-%d-%d.csv" % (lo, hi)), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["source_position", "item_code", "uom", "display_name", "category",
                                           "official_product_page", "official_image_url", "verifier_verdict",
                                           "model_exact", "finish_exact"])
        w.writeheader()
        for o in vp:
            w.writerow({k: o[k] for k in ["source_position", "item_code", "uom", "display_name", "category",
                                          "official_product_page", "official_image_url", "verifier_verdict",
                                          "model_exact", "finish_exact"]})
    print("ledger rows:", len(out))
    print("states:", n_states)
    print("candidates going to gate:", len(vp))
    print("collision-blocked:", len(coll))
    print("rows without any research record:", sum(1 for o in out if not o["reason"]))

if __name__ == "__main__":
    main()
