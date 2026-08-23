#!/usr/bin/env python3
"""Inspect ledger rows for D2 positions + hashes.csv format."""
import csv
from pathlib import Path

HERE = Path(__file__).resolve().parent
LEDGER = HERE.parent / "loop-ledger.csv"
WANT = {"134", "138", "153", "168", "174", "178", "185", "186", "197", "201",
        "227", "232", "3872", "5009", "4976", "6227", "3623", "4225",
        "131", "3756", "3593"}

for r in csv.DictReader(open(LEDGER, newline="", encoding="utf-8")):
    if r["source_position"] in WANT:
        print("===", r["source_position"], r["state"],
              "| pg:", (r["official_product_page"] or "")[:90],
              "| img:", (r["official_image_url"] or "")[:90],
              "| px:", r["image_px_w"], "x", r["image_px_h"], "| bytes:", r["image_bytes"])
        print("   conf:", r["match_confidence"], "| rights:", r["rights_status"],
              "| decision:", r["researcher_decision"], "| verdict:", r["verifier_verdict"])
        print("   reason:", (r["reason"] or "")[:250])
        print("   human:", (r["human_action"] or "")[:160])

h = HERE / "hashes.csv"
print("\nhashes.csv exists:", h.exists(), "size:", h.stat().st_size if h.exists() else 0)
if h.exists():
    with open(h, newline="", encoding="utf-8") as fh:
        for i, row in enumerate(fh):
            if i < 3 or i > 200000000:
                print(row.rstrip()[:220])
            if i > 3:
                break
    n = sum(1 for _ in open(h, encoding="utf-8"))
    print("total lines:", n)
