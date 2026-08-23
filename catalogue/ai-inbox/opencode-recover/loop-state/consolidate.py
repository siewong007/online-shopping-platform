#!/usr/bin/env python3
"""Merge every chat's state into loop-ledger.csv so one file is the resume point.

Conservative by design: a row is only ever moved FORWARD
(open -> candidate -> exhausted -> verified_pass). Nothing is downgraded, so
re-running this is safe and the per-chat files stay the source of truth.

    python catalogue/ai-inbox/opencode-recover/loop-state/consolidate.py

Writes loop-ledger.csv in place (after a timestamped backup) and
HANDOFF-STATE.md next to it.
"""
from __future__ import annotations

import collections
import csv
import datetime
import json
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
LEDGER = HERE / "loop-ledger.csv"
RANK = {"": 0, "open": 1, "candidate": 2, "exhausted": 3, "exhausted_no_progress": 3, "verified_pass": 4}
EVIDENCE = (
    "official_product_page",
    "official_image_url",
    "image_px_w",
    "image_px_h",
    "image_bytes",
    "image_sha256",
    "match_confidence",
    "finish_exact",
    "model_exact",
    "uom_assessment",
    "rights_status",
    "researcher_decision",
    "verifier_verdict",
    "machine_gate",
    "reason",
    "human_action",
    "tiers_tried",
    "round_last_touched",
)


def read_csv(path: pathlib.Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def key_of(row: dict) -> tuple[str, str]:
    return (row.get("item_code", ""), row.get("uom", ""))


def main() -> int:
    if not LEDGER.exists():
        print(f"missing {LEDGER}")
        return 1

    master = read_csv(LEDGER)
    cols = list(master[0].keys())
    index = {key_of(r): r for r in master}
    before = collections.Counter(r["state"] for r in master)

    promoted = collections.Counter()
    evidence_filled = collections.Counter()
    conflicts: list[str] = []

    # --- chats that produced a full 27-column ledger -------------------------
    for n in range(1, 10):
        path = HERE / f"chat-{n:02d}" / f"chat-{n:02d}-ledger.csv"
        if not path.exists():
            continue
        for row in read_csv(path):
            cur = index.get(key_of(row))
            if cur is None:
                conflicts.append(f"chat-{n:02d}: {key_of(row)} not in master ledger")
                continue
            new_state = row.get("state", "")
            if RANK.get(new_state, 0) > RANK.get(cur["state"], 0):
                cur["state"] = new_state
                for c in EVIDENCE:
                    if c in cur and row.get(c, "").strip():
                        cur[c] = row[c]
                promoted[f"chat-{n:02d} -> {new_state}"] += 1
            elif RANK.get(new_state, 0) == RANK.get(cur["state"], 0):
                for c in EVIDENCE:
                    if c in cur and not cur[c].strip() and row.get(c, "").strip():
                        cur[c] = row[c]
                        evidence_filled[f"chat-{n:02d}"] += 1

    # --- chat 01: research shards, no state column ---------------------------
    for path in sorted((HERE / "chat-01").glob("shard-*.csv")):
        for row in read_csv(path):
            cur = index.get(key_of(row))
            if cur is None or cur["state"] != "open":
                continue
            wrote = False
            for c in EVIDENCE:
                if c in cur and c in row and not cur[c].strip() and row.get(c, "").strip():
                    cur[c] = row[c]
                    wrote = True
            if wrote:
                evidence_filled["chat-01 shards"] += 1

    # --- chat 03: JSON research/verify results ------------------------------
    for path in sorted((HERE / "chat-03" / "results").rglob("*.json")):
        try:
            blob = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            conflicts.append(f"chat-03: unreadable {path.name} ({exc})")
            continue
        rows = blob if isinstance(blob, list) else blob.get("rows") or blob.get("results") or []
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            cur = index.get(key_of(row))
            if cur is None or cur["state"] != "open":
                continue
            wrote = False
            for c in EVIDENCE:
                if c in cur and not cur[c].strip() and str(row.get(c, "") or "").strip():
                    cur[c] = str(row[c])
                    wrote = True
            if wrote:
                evidence_filled["chat-03 results"] += 1

    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(LEDGER, HERE / f"loop-ledger.backup-{stamp}.csv")
    with LEDGER.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=cols)
        writer.writeheader()
        writer.writerows(master)

    after = collections.Counter(r["state"] for r in master)
    total_done = after["verified_pass"] + after["exhausted"] + after["exhausted_no_progress"]

    lines = [
        "# Handoff state — Ekoway product image loop",
        "",
        f"Consolidated {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} local from all nine chat folders.",
        "`loop-ledger.csv` is the single resume point. Per-chat folders are kept as raw evidence.",
        "",
        "## Ledger",
        "",
        "| state | before | after |",
        "|---|---:|---:|",
    ]
    for state in ("verified_pass", "exhausted", "exhausted_no_progress", "candidate", "open"):
        if before.get(state) or after.get(state):
            lines.append(f"| `{state}` | {before.get(state, 0)} | {after.get(state, 0)} |")
    lines += [
        f"| **total** | {sum(before.values())} | {sum(after.values())} |",
        "",
        f"Terminal: **{total_done} / {sum(after.values())}**  ·  still open: **{after['open'] + after.get('candidate', 0)}**",
        "",
        "## Promotions applied by this merge",
        "",
    ]
    lines += [f"- {k}: {v}" for k, v in sorted(promoted.items())] or ["- none"]
    lines += ["", "## Evidence backfilled (state unchanged)", ""]
    lines += [f"- {k}: {v}" for k, v in sorted(evidence_filled.items())] or ["- none"]
    if conflicts:
        lines += ["", "## Conflicts", ""] + [f"- {c}" for c in conflicts[:40]]
        if len(conflicts) > 40:
            lines.append(f"- …and {len(conflicts) - 40} more")
    (HERE / "HANDOFF-STATE.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"before: {dict(before)}")
    print(f"after : {dict(after)}")
    print(f"promoted {sum(promoted.values())}, evidence backfilled {sum(evidence_filled.values())}, conflicts {len(conflicts)}")
    print(f"backup: loop-ledger.backup-{stamp}.csv")
    return 0


if __name__ == "__main__":
    sys.exit(main())
