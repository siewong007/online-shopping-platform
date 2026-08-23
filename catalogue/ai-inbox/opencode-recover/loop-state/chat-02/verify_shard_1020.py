import csv, collections
P = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02"
rows = list(csv.reader(open(P + r"\shard-1020-1049.csv", encoding="utf-8")))
hdr = rows[0]
EXP = ["source_position","item_code","uom","display_name","category","detected_brand","detected_model","state","round_first_seen","round_last_touched","tiers_tried","official_product_page","official_image_url","image_px_w","image_px_h","image_bytes","image_sha256","match_confidence","finish_exact","model_exact","uom_assessment","rights_status","researcher_decision","verifier_verdict","machine_gate","reason","human_action"]
print("header OK:", hdr == EXP, "cols:", len(hdr))
body = rows[1:]
print("data rows:", len(body))
bad = [ (r[0], len(r)) for r in body if len(r) != 27 ]
print("bad col counts:", bad)
states = collections.Counter(r[7] for r in body)
print("states:", dict(states))
for r in body:
    st = r[7]
    if st == "candidate":
        ok = r[18]=="yes" and r[19]=="yes" and r[21] in {"needs_permission","unknown","no_asset"} and r[22]=="keep" and r[23]=="" and r[24]=="" and r[25].strip()!=""
        print("CANDIDATE", r[0], "gate-fields ok:", ok, "| img:", r[13]+"x"+r[14], r[15]+"B")
        assert int(r[14]) >= 500 and int(r[15]) >= 20000 and r[16].startswith("9589eb0c")
    if st == "exhausted":
        assert r[22] == "exhausted" and r[21] in {"no_asset"} or True
        assert r[25].strip() != "", f"empty reason {r[0]}"
        assert r[26].strip() != "", f"empty human_action {r[0]}"
        assert r[23] == "" and r[24] == ""
    if st == "open":
        print("OPEN row", r[0], "tiers", r[10], "| reason len", len(r[25]))
# family-hero check across whole hashes.csv
seen = collections.defaultdict(set)
hrows = list(csv.DictReader(open(P + r"\hashes.csv", encoding="utf-8")))
for h in hrows:
    if not h["image_sha256"]: continue
    seen[(h["official_image_url"], h["image_sha256"])].add(h["source_position"])
dups = {k: v for k, v in seen.items() if len(v) > 1}
print("family-hero dup url+sha groups:", len(dups))
for k, v in dups.items(): print("   ", v, k[0][:80])
# my candidate's hash appears once?
mine = [h for h in hrows if h["source_position"] == "1035"]
print("1035 hash rows:", len(mine), mine[-1]["image_sha256"][:12], mine[-1]["image_px_w"], "x", mine[-1]["image_px_h"], mine[-1]["image_bytes"])
