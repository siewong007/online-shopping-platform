#!/usr/bin/env python3
"""Repair the three data defects the nine-chat run left in loop-ledger.csv.

1. `tiers_tried` was written in four different notations by different chats
   (`1|2`, `2;3`, `T1,T5`, `T1(blocked),T5`). Tier escalation misreads anything
   but one canonical form, so normalise every row to sorted `1|2|4`.
2. Fourteen rows could not be matched back to the master ledger. Nine are
   recoverable: eight `TOO-COM-IRO-BUL-*` rows where chat 04 shifted a column and
   wrote the size into `uom`, and one `TIE-CAB-BLA-100MM-4"` row where a
   backslash escape leaked into the item code. Re-key and re-apply those.
3. Chat 01 never wrote a `chat-01-ledger.csv`; its research lives in raw
   `shard-*.csv` files. Promote its `candidate` rows that are still `open`.

Forward-only, like consolidate.py: no row is ever downgraded.

    python catalogue/ai-inbox/opencode-recover/loop-state/repair-ledger.py
"""
from __future__ import annotations

import collections
import csv
import datetime
import glob
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
LEDGER = HERE / "loop-ledger.csv"
WORKLIST = HERE.parent / "remaining-all-worklist.csv"
RANK = {"": 0, "open": 1, "candidate": 2, "exhausted": 3, "exhausted_no_progress": 3, "verified_pass": 4}


def read_csv(path: pathlib.Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def normalise_tiers(raw: str) -> str:
    """Any of 1|2 / 2;3 / T1,T5 / T1(blocked),T5 -> canonical sorted 1|2|5."""
    if not raw or not raw.strip():
        return ""
    digits = {int(d) for d in re.findall(r"[Tt]?(\d)", raw) if 1 <= int(d) <= 5}
    return "|".join(str(d) for d in sorted(digits))


def main() -> int:
    ledger = read_csv(LEDGER)
    cols = list(ledger[0].keys())
    index = {(r["item_code"], r["uom"]): r for r in ledger}

    worklist = read_csv(WORKLIST)
    uoms_for = collections.defaultdict(set)
    for row in worklist:
        uoms_for[row["item_code"]].add(row["uom"])

    report: list[str] = []

    # --- 1. tier notation ----------------------------------------------------
    changed = collections.Counter()
    for row in ledger:
        old = row.get("tiers_tried", "")
        new = normalise_tiers(old)
        if new != old:
            row["tiers_tried"] = new
            changed[f"{old} -> {new}"] += 1
    report.append(f"tiers_tried normalised on {sum(changed.values())} rows, "
                  f"{len(changed)} distinct rewrites")
    for k, v in changed.most_common(12):
        report.append(f"  {k}  ({v})")

    # --- 2. recover the mis-keyed rows --------------------------------------
    def resolve(item_code: str, uom: str) -> tuple[str, str] | None:
        if (item_code, uom) in index:
            return (item_code, uom)
        # backslash escape leaked into the code, e.g.  TIE-CAB-BLA-100MM-4\"
        clean = item_code.replace("\\", "")
        if (clean, uom) in index:
            return (clean, uom)
        # uom column shifted: fall back to the catalogue's uom when unambiguous
        for code in (item_code, clean):
            options = uoms_for.get(code, set())
            if len(options) == 1:
                candidate = (code, next(iter(options)))
                if candidate in index:
                    return candidate
        return None

    recovered = collections.Counter()
    unresolved: list[str] = []
    for n in range(1, 10):
        path = HERE / f"chat-{n:02d}" / f"chat-{n:02d}-ledger.csv"
        if not path.exists():
            continue
        for row in read_csv(path):
            key = (row.get("item_code", ""), row.get("uom", ""))
            if key in index:
                continue
            target = resolve(*key)
            if target is None:
                unresolved.append(f"chat-{n:02d}: {key}")
                continue
            cur = index[target]
            if RANK.get(row.get("state", ""), 0) > RANK.get(cur["state"], 0):
                cur["state"] = row["state"]
                for c in cols:
                    if c not in ("item_code", "uom") and row.get(c, "").strip():
                        cur[c] = row[c]
                cur["tiers_tried"] = normalise_tiers(cur.get("tiers_tried", ""))
                recovered[f"chat-{n:02d} -> {row['state']}"] += 1
            else:
                recovered[f"chat-{n:02d} (no promotion)"] += 1

    report.append("")
    report.append(f"mis-keyed rows recovered: {sum(recovered.values())}")
    for k, v in sorted(recovered.items()):
        report.append(f"  {k}: {v}")
    report.append(f"still unresolvable: {len(unresolved)}")
    for u in unresolved:
        report.append(f"  {u}  (item_code absent from the worklist entirely)")

    # --- 3. chat 01 raw shard harvest ---------------------------------------
    promoted = 0
    for path in sorted(HERE.glob("chat-01/shard-*.csv")):
        for row in read_csv(path):
            cur = index.get((row.get("item_code", ""), row.get("uom", "")))
            if cur is None or cur["state"] != "open":
                continue
            if row.get("researcher_decision", "") != "candidate":
                continue
            cur["state"] = "candidate"
            for c in cols:
                if c not in ("item_code", "uom", "state") and row.get(c, "").strip():
                    cur[c] = row[c]
            if not cur.get("tiers_tried", "").strip():
                cur["tiers_tried"] = "1"
            promoted += 1
    report.append("")
    report.append(f"chat-01 shard candidates promoted open -> candidate: {promoted}")

    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(LEDGER, HERE / f"loop-ledger.backup-{stamp}.csv")
    with LEDGER.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=cols)
        writer.writeheader()
        writer.writerows(ledger)

    after = collections.Counter(r["state"] for r in ledger)
    report.append("")
    report.append(f"final ledger: {dict(after)}")

    text = "\n".join(report)
    (HERE / "REPAIR-REPORT.md").write_text(
        "# Ledger repair — " + datetime.datetime.now().strftime("%Y-%m-%d %H:%M") + "\n\n```\n" + text + "\n```\n",
        encoding="utf-8",
    )
    print(text)
    print(f"\nbackup: loop-ledger.backup-{stamp}.csv")
    return 0


if __name__ == "__main__":
    sys.exit(main())
