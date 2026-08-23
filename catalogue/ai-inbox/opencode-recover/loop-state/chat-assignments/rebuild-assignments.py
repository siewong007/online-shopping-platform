#!/usr/bin/env python3
"""Rebuild the nine chat assignment files and the slice manifest from the CURRENT ledger.

Run this immediately before launching the worker chats. Chat 01 keeps writing
loop-ledger.csv while it works, so assignments generated earlier go stale and would
send workers at rows that are already done.

    python catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/rebuild-assignments.py

Only rows with state=open are assigned. slice_ids are regenerated, so do NOT run this
once the fleet is working -- claims/ refers to slice_ids by name.
"""
from __future__ import annotations

import collections
import csv
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
RECOVER = HERE.parents[1]
LEDGER = HERE.parent / "loop-ledger.csv"
WORKLIST = RECOVER / "remaining-all-worklist.csv"
ORDINALS = RECOVER / "research-ordinal-index.csv"
SLICE = 50
CHATS = 9


def read(path: pathlib.Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def main() -> int:
    if (HERE / "claims").exists() and any((HERE / "claims").iterdir()):
        print("REFUSING: claims/ is not empty -- the fleet is already running.")
        print("Regenerating slice_ids now would break every claim. Delete claims/ only")
        print("if you are restarting the whole fleet from scratch.")
        return 1

    ledger = {(r["item_code"], r["uom"]): r for r in read(LEDGER)}
    worklist = read(WORKLIST)
    by_key = {(r["item_code"], r["uom"]): r for r in worklist}
    ordinals = read(ORDINALS)

    state = collections.Counter(r["state"] for r in ledger.values())
    print("ledger:", dict(state))

    # Only open rows are work. Renumber ordinals over the open set so the nine
    # blocks stay equal as rows drain.
    open_rows = []
    for r in ordinals:
        key = (r["item_code"], r["uom"])
        led = ledger.get(key, {})
        if led.get("state", "open") != "open":
            continue
        w = by_key[key]
        open_rows.append(
            {
                "ordinal": 0,
                **w,
                "ledger_state": led.get("state", ""),
                "ledger_tiers_tried": led.get("tiers_tried", ""),
                "ledger_researcher_decision": led.get("researcher_decision", ""),
                "ledger_gate": led.get("machine_gate", ""),
            }
        )
    for i, r in enumerate(open_rows, 1):
        r["ordinal"] = i

    cols = ["ordinal"] + list(worklist[0].keys()) + [
        "ledger_state",
        "ledger_tiers_tried",
        "ledger_researcher_decision",
        "ledger_gate",
    ]

    total = len(open_rows)
    per = -(-total // CHATS)  # ceil
    slices: list[dict] = []
    for n in range(1, CHATS + 1):
        block = open_rows[(n - 1) * per : n * per]
        out = HERE / f"chat-{n:02d}.csv"
        with out.open("w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=cols)
            w.writeheader()
            w.writerows(block)
        actions = collections.Counter(r["action"] for r in block)
        resume = sum(1 for r in block if r["ledger_tiers_tried"])
        print(
            f"chat-{n:02d} rows {len(block):4d} "
            f"ordinals {block[0]['ordinal']}-{block[-1]['ordinal']} "
            f"resume-at-higher-tier {resume:3d} {dict(actions)}"
        )
        for i in range(0, len(block), SLICE):
            chunk = block[i : i + SLICE]
            slices.append(
                {
                    "slice_id": "",
                    "home_chat": f"{n:02d}",
                    "source_file": out.name,
                    "ord_lo": chunk[0]["ordinal"],
                    "ord_hi": chunk[-1]["ordinal"],
                    "rows": len(chunk),
                    "actions": "|".join(sorted({c["action"] for c in chunk})),
                    "prior_tiers": sum(1 for c in chunk if c["ledger_tiers_tried"]),
                }
            )

    for i, s in enumerate(slices, 1):
        s["slice_id"] = f"S{i:04d}"
    with (HERE / "slices.csv").open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(slices[0].keys()))
        w.writeheader()
        w.writerows(slices)

    # skip_pass rows the live-check demoted -- not in the ordinal index, chat 01 owns them
    demoted = [
        {**r, "ledger_gate": ledger[(r["item_code"], r["uom"])].get("machine_gate", "")}
        for r in worklist
        if r["action"] == "skip_pass"
        and ledger.get((r["item_code"], r["uom"]), {}).get("state") == "open"
    ]
    with (HERE / "chat-01-livecheck-open.csv").open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(worklist[0].keys()) + ["ledger_gate"])
        w.writeheader()
        w.writerows(demoted)

    done = state.get("verified_pass", 0) + state.get("exhausted", 0)
    print(f"\nslices {len(slices)} of <= {SLICE}")
    grand = total + len(demoted) + done
    print(f"assigned {total} open + {len(demoted)} demoted skip_pass + {done} terminal")
    print(f"= {grand} of 7771" + ("  OK" if grand == 7771 else "  *** COVERAGE MISMATCH ***"))
    print("\nclaims/ is empty and slice_ids are fresh. Launch the fleet now.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
