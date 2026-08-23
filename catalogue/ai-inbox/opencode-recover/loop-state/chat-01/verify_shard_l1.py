#!/usr/bin/env python3
import csv
import collections

p = r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/shard-L1.csv"
rows = list(csv.DictReader(open(p, newline="", encoding="utf-8")))
print("rows:", len(rows))
want = ["source_position", "item_code", "uom", "official_product_page", "official_image_url",
        "researcher_decision", "match_confidence", "finish_exact", "model_exact",
        "uom_assessment", "rights_status", "reason", "human_action"]
print("header ok:", list(rows[0].keys()) == want)
c = collections.Counter(x["researcher_decision"] for x in rows)
qok = sum(1 for x in rows if x["reason"].count("q1:") == 1 and x["reason"].count("q6:") == 1)
print("decisions:", dict(c))
print("rows with all six q: entries:", qok)
