#!/usr/bin/env python3
import csv

a = r"catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-01.csv"
s = r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/shard-0351-0450.csv"
want = {}
with open(a, newline="", encoding="utf-8") as fh:
    for r in csv.DictReader(fh):
        if 351 <= int(r["ordinal"]) <= 450:
            want[r["source_position"]] = r["item_code"]
got = []
with open(s, newline="", encoding="utf-8") as fh:
    rd = csv.DictReader(fh)
    exp = ["source_position", "item_code", "uom", "official_product_page",
           "official_image_url", "researcher_decision", "match_confidence",
           "finish_exact", "model_exact", "uom_assessment", "rights_status",
           "reason", "human_action"]
    assert rd.fieldnames == exp, rd.fieldnames
    got = list(rd)
print("rows", len(got), "unique", len(set(g["source_position"] for g in got)))
missing = set(want) - set(g["source_position"] for g in got)
extra = set(g["source_position"] for g in got) - set(want)
print("missing", missing or "-", "extra", extra or "-")
bad = [g["source_position"] for g in got if want.get(g["source_position"]) != g["item_code"]]
print("item_code mismatches", bad or "-")
for g in got[:2] + [g for g in got if g["researcher_decision"] == "candidate"][:1]:
    print("---", g["source_position"], g["researcher_decision"], "|", g["reason"][:160])
