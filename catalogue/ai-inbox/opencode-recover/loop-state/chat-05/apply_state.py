#!/usr/bin/env python3
"""Apply research + evidence + verifier verdicts to chat-05-ledger.csv.
Family-hero rule: any sha256 or image URL shared by >1 non-dup row demotes ALL
claimants back to open (tier+1) before anything is called verified_pass."""
import csv, json
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
LEDGER = HERE / "chat-05-ledger.csv"
EVID = json.loads((HERE / "evidence-chat05.json").read_text(encoding="utf-8"))
HOLDS = set(json.loads((HERE / "hold.json").read_text(encoding="utf-8")))

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

_ovp = HERE / "model_overrides.json"
try:
    OVERRIDES = json.loads(_ovp.read_text(encoding="utf-8"))
except Exception:
    OVERRIDES = {}

DUP_ACTIONS = {"7152", "3462", "7297", "5735", "6838"}   # duplicate_listing rows by pos

rows = list(csv.DictReader(open(LEDGER, newline="", encoding="utf-8")))

def ev_green(e):
    if not e:
        return False
    ct = e.get("image_content_type") or ""
    return (e.get("image_status") == 200 and ct.startswith("image/")
            and (e.get("image_bytes_len") or 0) >= 20000
            and max(e.get("px_w") or 0, e.get("px_h") or 0) >= 500)

# pass 1: tentative states
for r in rows:
    pos = r["source_position"]
    res = research.get(pos)
    if not res:
        r["_tier"] = int(r.get("_tier") or 1)
        continue
    qlog = "; ".join(f'q:{q}' for q in res.get("queries", [])[:8])
    plog = "; ".join(f'p:{p}' for p in res.get("pages_opened", [])[:10])
    notes = (res.get("notes") or "")[:600]
    act = "action=duplicate_listing" if pos in DUP_ACTIONS else "action=search"
    reason = f"{act}; {qlog}; {plog}; {notes}"
    r["reason"] = reason
    r["round_last_touched"] = "1"
    r["tiers_tried"] = "1"
    r["official_product_page"] = res.get("page_url", "")
    r["official_image_url"] = res.get("image_url", "")
    r["detected_brand"] = (res.get("brand") or "")[:60]
    mq = res.get("model_quoted") or ""
    r["detected_model"] = OVERRIDES.get(pos, mq[:80])
    r["match_confidence"] = res.get("confidence", "")
    rights = res.get("rights") or "unknown"
    r["rights_status"] = "needs_permission" if rights in ("official_oem", "authorised_distributor") else "unknown"
    r["uom_assessment"] = (res.get("finish_note") or "")[:120]
    r["human_action"] = ""
    e = EVID.get(pos)
    green = ev_green(e)
    v = verdicts.get(pos)
    if pos in HOLDS:
        r["state"] = "open"; r["_tier"] = 2
        r["reason"] += "; held_tier2:" + ("sub_500px_source" if pos in ("7245","5489","6772") else "source_or_variant_doubt")
        continue
    if green and e:
        r["image_px_w"] = str(e.get("px_w") or "")
        r["image_px_h"] = str(e.get("px_h") or "")
        r["image_bytes"] = str(e.get("image_bytes_len") or "")
        r["image_sha256"] = e.get("image_sha256") or ""
    if green and v and v.get("verifier_verdict") == "pass" and v.get("model_exact") == "yes" and v.get("finish_exact") == "yes":
        r["state"] = "verified_pass"
        r["researcher_decision"] = "candidate"
        r["verifier_verdict"] = "pass"
        r["model_exact"] = "yes"
        r["finish_exact"] = "yes"
        r["human_action"] = "request_image_rights_from_" + (res.get("brand") or "source").replace(" ", "_")[:40]
    elif green:
        # fetched ok but no pass verdict yet -> candidate awaiting verification (or failed earlier verdicts stay candidate for re-review)
        r["state"] = "candidate"
        r["researcher_decision"] = "candidate"
        if v:
            r["verifier_verdict"] = v.get("verifier_verdict", "")
            r["model_exact"] = v.get("model_exact", "")
            r["finish_exact"] = v.get("finish_exact", "")
            if v.get("verifier_verdict") == "fail" or v.get("model_exact") != "yes" or v.get("finish_exact") != "yes":
                # any disagreement -> back to open at tier+1
                r["state"] = "open"
                r["_tier"] = 2
                r["reason"] += "; verifier_disagreement:" + (v.get("justification") or "")[:200]
    else:
        r["state"] = "open"
        dec = res.get("decision")
        if dec in ("no_result", "blocked"):
            r["_tier"] = 2
            r["reason"] += f"; tier1_{dec}"
        else:
            r["_tier"] = 1 if not green else 2

# pass 2: family-hero demotion (sha or url shared across >1 row among gated states)
by_sha = defaultdict(list)
by_url = defaultdict(list)
for r in rows:
    if r["state"] in ("verified_pass", "candidate"):
        if r.get("image_sha256"):
            by_sha[r["image_sha256"]].append(r)
        u = r.get("official_image_url") or ""
        if u:
            by_url[u].append(r)
demoted = set()
for grp in list(by_sha.values()) + list(by_url.values()):
    if len(grp) < 2:
        continue
    for r in grp:
        demoted.add(r["source_position"])
for r in rows:
    if r["source_position"] in demoted and r["state"] in ("verified_pass", "candidate"):
        r["state"] = "open"
        r["_tier"] = int(r.get("_tier") or 1) + 1
        r["verifier_verdict"] = ""
        r["model_exact"] = ""
        r["finish_exact"] = ""
        r["image_sha256"] = ""
        r["reason"] += "; family_hero_shared_asset_demoted"

# write back
HEADER = list(rows[0].keys())
HEADER = [h for h in HEADER if not h.startswith("_")]
with open(LEDGER, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=HEADER, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow({k: r.get(k, "") for k in HEADER})

# queue state
queue = {}
for r in rows:
    queue[r["source_position"]] = {
        "tier": int(r.get("_tier") or 1),
        "state": r["state"],
    }
(HERE / "queue_state.json").write_text(json.dumps(queue), encoding="utf-8")

from collections import Counter
c = Counter(r["state"] for r in rows)
t2 = sum(1 for r in rows if int(r.get("_tier") or 1) >= 2)
print(json.dumps({"states": dict(c), "tier2plus_queue": t2, "demoted_family_hero": len(demoted)}))
