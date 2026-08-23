#!/usr/bin/env python3
"""Chat 05: run an unmodified copy of gate.py against my block.

Builds chat-05/gate-sim/ containing:
  gate.py            byte-for-byte copy (never modified)
  loop-ledger.csv    only my 839 rows, exact 27-col header
  evidence.json      merged evidence-chat05.json
  pagecache/<pos>.txt for every gated row
Runs it with --round R and prints the summary.
"""
import json, shutil, subprocess, sys, csv
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOOP = HERE.parent
GATE_SRC = LOOP / "gate.py"
LEDGER_MINE = HERE / "chat-05-ledger.csv"
EVID = HERE / "evidence-chat05.json"

HEADER = [
    "source_position", "item_code", "uom", "display_name", "category",
    "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
    "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
    "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
    "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
    "machine_gate", "reason", "human_action",
]

PY = r"C:\Users\DELL\AppData\Local\Programs\Python\Python313\python.exe"


def main():
    rnd = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    sim = HERE / "gate-sim"
    if sim.exists():
        shutil.rmtree(sim)
    sim.mkdir(parents=True)
    shutil.copy2(GATE_SRC, sim / "gate.py")          # unmodified copy
    shutil.copy2(LEDGER_MINE, sim / "loop-ledger.csv")
    if EVID.exists():
        shutil.copy2(EVID, sim / "evidence.json")
    pc = sim / "pagecache"
    pc.mkdir()
    dst_pc = HERE / "pagecache"
    dst_pc.mkdir(parents=True, exist_ok=True)
    src_pc = LOOP.parent / "pagecache"
    rows = list(csv.DictReader(open(LEDGER_MINE, newline="", encoding="utf-8")))
    n_pc = 0
    for r in rows:
        if r["state"] in ("candidate", "verified_pass"):
            f = src_pc / f"{r['source_position']}.txt"
            if f.exists():
                shutil.copy2(f, pc / f.name)
                shutil.copy2(f, dst_pc / f.name)
                n_pc += 1
    proc = subprocess.run([PY, str(sim / "gate.py"), "--round", str(rnd)],
                          capture_output=True, text=True, timeout=300)
    out = proc.stdout.strip()
    rep = sim / f"round-{rnd:02d}" / "gate-report.json"
    if rnd == 0:
        rep = sim / "gate-report.json"
    dst = HERE / f"gate-report-round-{rnd}.json"
    if rep.exists():
        shutil.copy2(rep, dst)
        data = json.loads(dst.read_text(encoding="utf-8"))
        print(json.dumps({"round": rnd, "rows_total": data["rows_total"],
                          "gated_states": data["gated_states"],
                          "reds_by_code": data["reds_by_code"],
                          "pagecache_copied": n_pc,
                          "stderr": (proc.stderr or "")[-500:]}, indent=1))
        reds = data.get("reds", [])
        with open(HERE / f"gate-reds-round-{rnd}.json", "w", encoding="utf-8") as fh:
            json.dump(reds, fh, indent=1)
    else:
        print("NO REPORT; stdout:", out[-2000:], "stderr:", (proc.stderr or "")[-2000:])


if __name__ == "__main__":
    main()
