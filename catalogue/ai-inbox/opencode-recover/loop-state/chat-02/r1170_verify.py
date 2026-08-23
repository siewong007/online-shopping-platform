import csv

P = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02"
rows = list(csv.reader(open(P + r"\shard-1170-1199.csv", encoding="utf-8")))
hdr = rows[0]
print("header cols:", len(hdr))
exp = ["source_position","item_code","uom","display_name","category","detected_brand","detected_model","state","round_first_seen","round_last_touched","tiers_tried","official_product_page","official_image_url","image_px_w","image_px_h","image_bytes","image_sha256","match_confidence","finish_exact","model_exact","uom_assessment","rights_status","researcher_decision","verifier_verdict","machine_gate","reason","human_action"]
print("header exact:", hdr == exp)
bad = [(r[0], len(r)) for r in rows[1:] if len(r) != 27]
print("bad col counts:", bad)
from collections import Counter
st = Counter(r[7] for r in rows[1:])
dec = Counter(r[22] for r in rows[1:])
print("states:", dict(st), "| decisions:", dict(dec))
empt = [r[0] for r in rows[1:] if r[7] != "open" and not r[25].strip()]
print("empty reason on non-open:", empt)
pos = [r[0] for r in rows[1:]]
want = [str(i) for i in range(1170, 1200)]
print("positions complete:", pos == want)
cands = [r for r in rows[1:] if r[7] == "candidate"]
for r in cands:
    print("CAND", r[0], r[11][:60], "|", r[12][:60], "|", r[13], "x", r[14], r[15], "B | rights:", r[21], "| gate fields:", repr(r[23]), repr(r[24]))
# candidate rule check
ok = all(r[18] == "yes" and r[19] == "yes" and r[21] in ("needs_permission", "unknown", "no_asset") for r in cands)
print("candidate rule compliance:", ok)

# FAMILY-HERO CHECK against shared hashes.csv
seen = {}
fam = []
for ln in csv.DictReader(open(P + r"\hashes.csv", encoding="utf-8")):
    sha = ln["image_sha256"].strip()
    url = ln["official_image_url"].strip()
    if not sha or int(ln["image_bytes"] or 0) == 0:
        continue
    key = None
    for k in (sha, url):
        if k in seen:
            key = k
            break
    else:
        seen[sha] = ln["source_position"]
        if url:
            seen[url] = ln["source_position"]
        continue
    fam.append((ln["source_position"], seen[key], key[:60]))
print("family-hero duplicates across ALL chats' hashes:", fam if fam else "NONE")
mine = {r[16] for r in cands}
print("my shas unique:", len(mine) == 2)
