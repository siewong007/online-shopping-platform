#!/usr/bin/env python3
"""chat-09 round-1 collector: merge researcher batches, pre-verify demotions."""
import csv, glob
from collections import Counter, defaultdict
from pathlib import Path

MY = Path(__file__).resolve().parent
OUT = MY / "r1" / "out"
COLS = ["ordinal", "source_position", "item_code", "uom", "researcher_decision",
        "official_product_page", "official_image_url", "match_confidence",
        "finish_exact", "model_exact", "uom_assessment", "rights_status",
        "human_action", "tiers_tried", "reason"]

allrows = []
for f in sorted(list(OUT.glob("batch-*.csv")) + list(OUT.glob("esc-*.csv"))):
    with open(f, encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == 30, (f, len(rows))
    for r in rows:
        norm = {c: (r.get(c) or "").strip() for c in COLS}
        allrows.append(norm)
# dedupe by source_position: later files (esc-*) override earlier batch verdicts
_dedup = {}
for r in allrows:
    _dedup[r["source_position"]] = r
allrows = list(_dedup.values())
print("merged:", len(allrows), "from", len(list(OUT.glob('batch-*.csv'))), "files")

# ---- pre-verifier quality gate ----
demoted = []
def is_range_image(u: str) -> bool:
    lu = u.lower()
    return ("-until-" in lu or "_until_" in lu or "%20until%20" in lu
            or "until-50" in lu)

for r in allrows:
    if r["researcher_decision"] == "candidate" and \
            is_range_image(r["official_image_url"]):
        r["researcher_decision"] = "reject"
        u = r["official_image_url"]
        r["human_action"] = ("escalate tier3+: image %s covers a model RANGE "
                             "(family hero); needs model-specific shot or "
                             "in-store photo" % u[:120])
        r["reason"] += " | collect:PRE-FAIL range-image-filename %s" % u[:120]
        demoted.append(r["ordinal"])

url_groups = defaultdict(list)
for r in allrows:
    if r["researcher_decision"] == "candidate" and r["official_image_url"].strip().startswith("http"):
        url_groups[r["official_image_url"].strip()].append(r)

demoted = []
for u, grp in url_groups.items():
    codes = {(r["item_code"], r["uom"]) for r in grp}
    if len(grp) > 1 and len(codes) > 1:
        # distinct SKUs sharing one URL = family hero / range image
        for r in grp:
            r["researcher_decision"] = "reject"
            r["official_product_page"] = ""
            r["official_image_url"] = ""
            r["human_action"] = ("escalate tier3+: image %s covers a model RANGE "
                                 "(family hero); needs model-specific shot or "
                                 "in-store photo" % u[:120])
            r["reason"] += (" | collect:PRE-FAIL family-hero url-shared-by-%d-distinct-SKUs %s"
                            % (len(grp), u[:120]))
            demoted.append(r["ordinal"])
for r in allrows:
    if r["researcher_decision"] == "candidate":
        if not r["official_image_url"].strip().startswith("http"):
            r["researcher_decision"] = "pending"
            r["human_action"] = (r.get("human_action") or "") + \
                "; escalate tier4: official doc found but no extractable image URL"
            r["reason"] += " | collect:DEMOTE candidate-without-image-url"
            demoted.append(r["ordinal"])

print("pre-verify demotions:", len(demoted))
dec = Counter(r["researcher_decision"] for r in allrows)
print("decisions:", dict(dec))

cands = [r for r in allrows if r["researcher_decision"] == "candidate"]
with open(MY / "r1" / "shard-r1-candidates.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=COLS)
    w.writeheader()
    w.writerows(cands)
with open(MY / "r1" / "shard-r1-all.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=COLS)
    w.writeheader()
    w.writerows(sorted(allrows, key=lambda x: int(x["ordinal"])))
print("candidates to fetch+verify:", len(cands))
for c in cands[-25:]:
    print(" ", c["ordinal"], c["item_code"], "|", c["uom"], "|",
          c["official_product_page"][:60], "|", c["official_image_url"][:70])
