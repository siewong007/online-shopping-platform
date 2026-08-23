#!/usr/bin/env python3
"""Classify chat-01 block's open rows for exhaustion vs escalation slots."""
import csv
from pathlib import Path

LOOP = Path(__file__).resolve().parent
assign = {r["source_position"]: r["ordinal"] for r in csv.DictReader(
    open(LOOP / "chat-assignments" / "chat-01.csv", encoding="utf-8-sig"))}
lc = {r["source_position"] for r in csv.DictReader(
    open(LOOP / "chat-assignments" / "chat-01-livecheck-open.csv", encoding="utf-8-sig"))}

rows = list(csv.DictReader(open(LOOP / "loop-ledger.csv", encoding="utf-8")))
block_open = [r for r in rows if r["state"] == "open" and
              (r["source_position"] in assign or r["source_position"] in lc)]

generic = []   # rejects with q-logs -> exhaustion pass
branded = []   # pendings/candidates-without-verdict -> escalation
for r in block_open:
    if r["researcher_decision"] == "reject" and "q:" in r["reason"]:
        generic.append(r)
    else:
        branded.append(r)

def dump(fn, rs, extra_cols=()):
    cols = ["source_position", "item_code", "uom", "display_name", "category",
            "detected_brand", "detected_model"]
    with open(LOOP / "chat-01" / fn, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(cols) + list(extra_cols))
        w.writeheader()
        for r in rs:
            d = {k: r.get(k, "") for k in cols}
            for e in extra_cols:
                d[e] = r.get(e, "")
            w.writerow(d)
    return len(rs)

n1 = dump("exhaust-batch-A.csv", generic[:len(generic) // 2])
n2 = dump("exhaust-batch-B.csv", generic[len(generic) // 2:])
n3 = dump("escalate-pendings.csv", branded)
print(f"block open={len(block_open)} generic(exhaust)={len(generic)} (A={n1},B={n2}) branded(escalate)={n3}")
