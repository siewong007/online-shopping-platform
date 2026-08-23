#!/usr/bin/env python3
"""chat-09 round-1 prep: claims, dup-exhaust records, research batches."""
import csv, json, os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]          # loop-state/
CA = BASE / "chat-assignments"
MY = Path(__file__).resolve().parent                # chat-09/
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
for d in [MY, MY / "r1", MY / "r1" / "in", MY / "verify"]:
    d.mkdir(parents=True, exist_ok=True)

# ---------- 1. claim home slices ----------
with open(CA / "slices.csv", encoding="utf-8-sig") as f:
    slices = list(csv.DictReader(f))
mine = [s for s in slices if s["home_chat"] == "09"]
claimed, contested = [], []
for s in mine:
    cf = CA / "claims" / (s["slice_id"] + ".claim")
    try:
        fd = os.open(str(cf), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, ("chat=09 utc=%s status=working rows=%s" % (NOW, s["rows"])).encode())
        os.close(fd)
        claimed.append(s["slice_id"])
    except FileExistsError:
        contested.append(s["slice_id"])
print("claimed:", claimed)
print("contested:", contested)

# ---------- 2. load my assignment ----------
with open(CA / "chat-09.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
assert len(rows) == 832, len(rows)

# ---------- 3. parent map over full ledger (read-only) ----------
with open(BASE / "loop-ledger.csv", encoding="utf-8-sig") as f:
    ledger = list(csv.DictReader(f))
first_owner = {}
for r in ledger:
    k = (r["item_code"], r["uom"])
    first_owner.setdefault(k, r["source_position"])
my_pos = {r["source_position"] for r in rows}

dup_children = [r for r in rows if r["action"] == "duplicate_listing"]
reopen = [r for r in rows if r["action"] != "duplicate_listing"]
print("reopen:", len(reopen), "dup:", len(dup_children))

# ---------- 4. dup children -> exhausted-with-parent-ref record ----------
with open(MY / "r1" / "dup-exhausted.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["ordinal", "source_position", "item_code", "uom",
                "researcher_decision", "official_product_page", "official_image_url",
                "match_confidence", "finish_exact", "model_exact", "uom_assessment",
                "rights_status", "human_action", "tiers_tried", "reason"])
    for r in sorted(dup_children, key=lambda x: int(x["ordinal"])):
        par = first_owner.get((r["item_code"], r["uom"]), "?")
        reason = ("action=duplicate_listing; declared duplicate child of item_code+uom "
                  "(%s|%s), parent position %s outside chat-09 block; no independent "
                  "sourcing permitted (would create divergent asset for identical SKU); "
                  "q:dup-resolution: parent lookup via global first-owner scan of "
                  "loop-ledger.csv; p:n/a (no page opened - inheritance row); "
                  "tier2 short-circuit per duplicate_listing protocol") % (
            r["item_code"], r["uom"], par)
        w.writerow([r["ordinal"], r["source_position"], r["item_code"], r["uom"],
                    "reject", "", "", "", "", "", "",
                    "unknown",
                    "merge-time: inherit official image from parent position %s once "
                    "parent reaches verified_pass; if parent exhausts, reopen this "
                    "child for independent tier2-4 sourcing" % par,
                    "2", reason])
print("dup-exhausted.csv written:", len(dup_children))

# ---------- 5. research batches (30 rows each) ----------
BATCH = 30
batches = [reopen[i:i + BATCH] for i in range(0, len(reopen), BATCH)]
index = []
for bi, b in enumerate(batches, 1):
    fn = MY / "r1" / "in" / ("batch-%02d.csv" % bi)
    with open(fn, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ordinal", "source_position", "item_code", "uom", "display_name",
                    "category", "detected_brand", "detected_model", "prior_page"])
        for r in sorted(b, key=lambda x: int(x["ordinal"])):
            w.writerow([r["ordinal"], r["source_position"], r["item_code"], r["uom"],
                        r["display_name"], r["category"], r["detected_brand"],
                        r["detected_model"], r["prior_page"]])
    index.append({"batch": bi, "file": str(fn.relative_to(MY)), "rows": len(b),
                  "ordinals": "%s-%s" % (min(int(x['ordinal']) for x in b),
                                         max(int(x['ordinal']) for x in b))})
with open(MY / "r1" / "batch-index.json", "w", encoding="utf-8") as f:
    json.dump(index, f, indent=1)
print("batches:", len(batches), "sizes ok:", all(len(b) <= BATCH for b in batches))
for it in index[:5]:
    print(" ", it)
