import csv, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "shard-0551-0650.csv")
CH = "[chan:exa-websearch-HTTP429-all-session;bing_fallback-html-poisoned-generic-serps-archived->chat-01/serp-I2/*.html;oem-direct-sitemap-probes->chat-01/serp-I2/sitemaps/+oem-*.html] "
rows = list(csv.DictReader(open(OUT, encoding="utf-8")))
# 1) drop bogus first row: pos5882 carrying ordinal-550 item FIT-YG239R (belongs to previous researcher slot)
assert rows[0]["source_position"] == "5882" and rows[0]["item_code"].startswith("FIT-YG239R"), "unexpected first row"
dropped = rows.pop(0)
# 2) build missing Korakoh B42M9000 row (ordinal 576)
newrow = {k: "" for k in rows[0]}
newrow.update({
    "source_position": "3436",
    "item_code": "RAI-BOO-KRK-B42M9000",
    "uom": "PAIR",
    "researcher_decision": "reject",
    "reason": CH + "tier1 fired per protocol | family precedent sibling shard RAI-BOO-KRK-Y38# rejected generic_house_import; q:korakoh-rainshoes='Korakoh rain shoes Malaysia'+q:rainshoes-7000ylw both -> SERP junk archived(no-hit) | generic_house_import: Korakoh rain shoes black M9000 size42; M9000=supplier model code; own-import footwear no OEM web presence; NEVER borrow sibling photos",
    "human_action": "shoot_in_store",
})
# insert before the M08913W candidate row (pos4434, ordinal 577)
idx = next(i for i, r in enumerate(rows) if r["source_position"] == "4434")
rows.insert(idx, newrow)
HDR = list(rows[0].keys())
with open(OUT, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=HDR)
    w.writeheader()
    for r in rows:
        w.writerow(r)
print("rewrote:", len(rows), "data rows; dropped:", dropped["source_position"], dropped["item_code"])
