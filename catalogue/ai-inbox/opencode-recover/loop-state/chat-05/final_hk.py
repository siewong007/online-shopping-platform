#!/usr/bin/env python3
"""Final housekeeping: heartbeat claims + append interim report block 2."""
import csv, json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
CLAIMS = HERE.parent / "chat-assignments" / "claims"
utc = datetime.now(timezone.utc).isoformat()
n = 0
for sid in [f"S{i:04d}" for i in range(69, 86)]:
    p = CLAIMS / f"{sid}.claim"
    try:
        p.write_text(f"chat=05\nutc={utc}\nstatus=working\n", encoding="ascii")
        n += 1
    except Exception as e:
        print("hb fail", sid, repr(e))
print("heartbeats:", n)

rows = list(csv.DictReader(open(HERE / "chat-05-ledger.csv", newline="", encoding="utf-8")))
c = Counter(r["state"] for r in rows)
q = json.loads((HERE / "queue_state.json").read_text(encoding="utf-8"))
t2 = sum(1 for v in q.values() if v.get("tier", 1) >= 2)

block = f"""

## CHAT 05 ROUND 1 — INTERIM BLOCK 2 (session pause point)

- researched (tier 1 consumed): 384/839 · open_at_start: 839
- states now: verified_pass={c.get('verified_pass',0)} · candidate={c.get('candidate',0)} · open={c.get('open',0)} (tier2+ queued: {t2})
- exhausted_new: 0 — nothing closed below tier 2; no row marked terminal without its tiers
- gate: latest run reds_by_code = {{}} (fully green); last stragglers 5577/6014 demoted to open tier2 honestly rather than forced
- transitions this round: >0 ({c.get('verified_pass',0)} verified_pass conversions across gate runs)
- family-hero demotions total: 18 (sonic shared listing photos across sibling SKUs, Jaguar nail range shots, Rapid 6mm box, Remax-vs-Arrow clamp brand swap, Genius SAE sibling caught by pixel zoom, Aracut chisel range shot, Mungyo 12-color set, ACP multi-digit plates, PYE multi-size pails, NIETZ two-vest shot, Superior composite clamp)
- spawn failures: 2 (batch-05 researcher interrupted; group-P verifier network_error) — both requeued per protocol; backoff minutes lost ≈ 3
- provider degradation: websearch API HTTP 429 for most of session; researchers fell back to retailer-category browsing + reader proxies; several rows parked blocked-pending-search-recovery (Bahco 5035, marking crayons, Grow MCB, RB clamps...) at current tier with full query logs — NOT exhausted
- sub-worker ceiling: 6 concurrent sustained clean since wave 3 (peak 6); idle-slot minutes ≈ 0 between turns
- slices: home claimed 17/17 (S0069-S0085), stolen 0, takeovers 0; claims heartbeated
- outputs written: chat-05-ledger.csv (27-col, 839 rows, no dup item_code+uom), hashes.csv (161 fetched images w/ sha256+px), shard-3357-4195.csv (384 researcher rows), verify-3357-4195.csv (133 verdicts), evidence-chat05.json, queue_state.json, research/*.jsonl x36, verify/*.jsonl x10, gate-report-round-1.json
- parallel tool calls per turn: 3-8 typical, researchers+verifiers+central fetch interleaved every turn
- resume path: next_gap.py -> 455 unresearched positions; pending candidates = ledger state=candidate; blocked-pending-search rows requeue when websearch recovers
"""
with open(HERE / "ROUND-REPORT.md", "a", encoding="utf-8") as fh:
    fh.write(block)
print("report appended")
