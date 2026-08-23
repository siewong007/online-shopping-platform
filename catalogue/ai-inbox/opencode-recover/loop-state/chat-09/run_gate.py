#!/usr/bin/env python3
"""chat-09 local gate driver: runs FROZEN gate.py unmodified against my context."""
import csv, json, shutil, sys
from pathlib import Path

MY = Path(__file__).resolve().parent
LOOP = MY.parent
sys.path.insert(0, str(LOOP))
import importlib.util

ROUND = sys.argv[1] if len(sys.argv) > 1 else "1"

spec = importlib.util.spec_from_file_location("frozen_gate", LOOP / "gate.py")
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
# PAGECACHE resolved at import from real location (global shared cache) - untouched.
g.STATE_DIR = MY / "gatectx"

rc = g.main(["--round", ROUND])

rdir = MY / "gatectx" / ("round-%02d" % int(ROUND))
report = json.loads((rdir / "gate-report.json").read_text(encoding="utf-8"))
print("gate rc:", rc)
print("states:", report["gated_states"])
print("reds:", report["reds_by_code"])
for x in report["reds"][:40]:
    print("  ", x["key"], "|", x["code"], "|", x["detail"][:120])

# ---- apply transitions to my slice ledger ----
red_by_pos = {}
amber_by_pos = {}
for x in report["reds"]:
    pos = x["key"].rsplit("#", 1)[-1]
    if x["code"].startswith("amber"):
        amber_by_pos.setdefault(pos, x)
    else:
        cur = red_by_pos.get(pos)
        if cur is None or x["code"] < cur["code"]:
            red_by_pos[pos] = x

led_path = MY / "chat-09-ledger.csv"
with open(led_path, encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
promoted = demoted = ambered = 0
for r in rows:
    if r["state"] not in ("candidate", "verified_pass"):
        continue
    pos = r["source_position"]
    red = red_by_pos.get(pos)
    amb = amber_by_pos.get(pos)
    if red is None:
        if r["state"] == "candidate":
            r["state"] = "verified_pass"
            r["machine_gate"] = "green"
            r["round_last_touched"] = ROUND
            promoted += 1
    else:
        prev = r["state"]
        r["state"] = "open"
        r["machine_gate"] = red["code"]
        if prev == "candidate":
            r["researcher_decision"] = ""
            r["verifier_verdict"] = ""
        note = " | r%s:gate-fail %s %s" % (ROUND, red["code"], red["detail"][:180])
        if note not in r["reason"]:
            r["reason"] += note
        demoted += 1

with open(led_path, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys())
    w.writeheader()
    w.writerows(rows)

# sync gatectx copy
repl = {}
for r in rows:
    repl[r["source_position"]] = r
with open(MY / "gatectx" / "loop-ledger.csv", encoding="utf-8-sig") as f:
    full = list(csv.DictReader(f))
full = [repl.get(x["source_position"], x) for x in full]
with open(MY / "gatectx" / "loop-ledger.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=HEADER if False else list(full[0].keys()))
    w.writeheader()
    w.writerows(full)

print("transitions: promoted=%d demoted=%d" % (promoted, demoted))
