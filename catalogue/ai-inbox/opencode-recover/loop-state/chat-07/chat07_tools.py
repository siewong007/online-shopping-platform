#!/usr/bin/env python3
"""Chat-07 local tooling: parse assignment with real csv reader, build open set."""
import csv, json, sys
from pathlib import Path
from collections import Counter

BASE = Path(__file__).resolve().parents[2]  # catalogue/ai-inbox/opencode-recover
ASSIGN = BASE / "loop-state" / "chat-assignments" / "chat-07.csv"
OUT = Path(__file__).resolve().parent

LEDGER_HEADER = [
    "source_position", "item_code", "uom", "display_name", "category",
    "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
    "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
    "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
    "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
    "machine_gate", "reason", "human_action",
]

def load_assign():
    with open(ASSIGN, newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))

def start_tier(row):
    """action search -> tier1, reopen -> tier2; never re-run consumed tiers."""
    action = (row.get("action") or "").strip().lower()
    tried = set()
    t = (row.get("ledger_tiers_tried") or "").strip()
    if t:
        for part in t.replace(";", ",").split(","):
            part = part.strip().strip("|")
            if part.isdigit():
                tried.add(int(part))
    base = 2 if "reopen" in action else 1
    nxt = max(tried) + 1 if tried else base
    return max(base, min(nxt, 5)), sorted(tried), action

if __name__ == "__main__":
    rows = load_assign()
    print(f"rows={len(rows)}")
    print("action:", dict(Counter((r.get("action") or "?").strip() for r in rows)))
    print("ledger_state:", dict(Counter(r.get("ledger_state") or "?" for r in rows)))
    print("ledger_researcher_decision:", dict(Counter(r.get("ledger_researcher_decision") or "?" for r in rows)))
    print("ledger_gate:", dict(Counter(r.get("ledger_gate") or "?" for r in rows)))
    st = Counter()
    for r in rows:
        s, tried, action = start_tier(r)
        st[(action.split("|")[0], s)] += 1
    print("start-tier by action:", dict(st))
    # duplicates by item_code+uom inside file
    keys = Counter((r["item_code"], r["uom"]) for r in rows)
    dups = {k: v for k, v in keys.items() if v > 1}
    print(f"dup item_code+uom keys: {len(dups)}")
    # terminal states per ledger
    term = [r for r in rows if (r.get("ledger_state") or "") in ("verified_pass", "exhausted", "exhausted_no_progress")]
    print(f"already-terminal in ledger: {len(term)}")
    openrows = [r for r in rows if (r.get("ledger_state") or "open") not in ("verified_pass", "exhausted", "exhausted_no_progress")]
    print(f"open set: {len(openrows)}")
    # write round-1 queue
    q = []
    for r in openrows:
        s, tried, action = start_tier(r)
        q.append({
            "source_position": r["source_position"], "item_code": r["item_code"],
            "uom": r["uom"], "display_name": r["display_name"], "category": r["category"],
            "detected_brand": r.get("detected_brand") or "", "detected_model": r.get("detected_model") or "",
            "action": r.get("action") or "", "start_tier": str(s),
            "tried": "|".join(map(str, tried)),
            "prior_decision": r.get("prior_decision") or "",
            "prior_page": r.get("prior_page") or "",
            "prior_image": r.get("prior_image") or "",
            "prior_reason": (r.get("prior_reason") or "").replace("\n", " ")[:400],
            "ledger_state": r.get("ledger_state") or "",
        })
    with open(OUT / "round1-open.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(q[0].keys()))
        w.writeheader(); w.writerows(q)
    print(f"wrote round1-open.csv ({len(q)})")
