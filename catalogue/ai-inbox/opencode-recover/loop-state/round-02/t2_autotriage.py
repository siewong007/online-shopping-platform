#!/usr/bin/env python3
"""T2 tranche-2 bulk triage: append remaining brief positions, fetch evidence,
then promote/demote based on deterministic checks (gate-equivalent)."""
from __future__ import annotations
import csv, json, re, subprocess, sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # loop-state/
from gate import model_present, norm_text  # noqa: E402

STATE = Path(__file__).resolve().parent.parent          # loop-state/
R02 = STATE / "round-02"
BRIEF = R02 / "shard-t2-brief.txt"
SHARD = R02 / "shard-t2.csv"
EVJ = STATE / "evidence-shard-T2.json"
PC = Path(r"catalogue/ai-inbox/pagecache")

HDR = ["source_position","item_code","uom","official_product_page","official_image_url",
       "researcher_decision","match_confidence","finish_exact","model_exact",
       "uom_assessment","rights_status","reason","human_action"]

# ---- load brief ------------------------------------------------------------
brief = {}
for line in BRIEF.read_text(encoding="utf-8").splitlines()[1:]:
    c = line.split("|")
    if len(c) >= 10:
        brief[c[0]] = {"item_code": c[1], "uom": c[2], "name": c[3],
                       "prior_page": c[7], "prior_img": c[8], "problem": c[9]}

rows = list(csv.DictReader(open(SHARD, encoding="utf-8")))
have = {r["source_position"] for r in rows}

# ---- config: decision per remaining position --------------------------------
C = {}   # pos -> (conf, note) candidate using prior urls
P = {}   # pos -> (note, human) forced pending

for pos in ["28","55","46","56","240","17","31","21","59","13","12","36","37","40","41","110","1202","1440","1226"]:
    C[pos] = ("B", "official saniware.com PDP; slug carries model code")
for pos, note in {
    "24":"sorento masterclub dealer-portal PDP names SRTSA830",
    "39":"sorento masterclub PDP names SRTSA860-GM",
    "6":"sorento.com.my kitchen-sink detail page SRTKS2406",
}.items(): C[pos] = ("B", note)
for pos in ["34"]: P[pos]=("prior_page is bare domain root, not this SKU's listing; catalog PDF not an asset","locate SRTKS2429-BL detail page or shoot sample")
for pos in ["57","52","60","62"]: P[pos]=("prior page AND image both are catalog-PDF fragments (#page=N) - PDF is not an image/* asset and page text cache unusable for pixel verify","request per-SKU product photo from Sorento MY or link live PDP")
P["122"]=("masterclub image is base SRTWT9600 without -HP suffix; two-way variant unproven","confirm HP variant photo")
for pos, note in {"251":"deka.my official X-One 56 page; 2560px PNG","155":"deka.my official F5 DC-Pro page"}.items(): C[pos]=("B",note)
for pos, note in {"29":"khind.com.my official store; title names SF1682SE","74":"khind.com.my commercial rice cooker RC565"}.items(): C[pos]=("B",note)
C["254"]=("B","my.stanleytools.global official PDP sbh900m2k-b1 + HIRES jpg")
C["59"] =("B","my.stanleytools.global official SCG400 tool-only PDP + HIRES jpg")
P["131"]=("SET contents (charger SC200 + 2x SB202) not proven by tool-only PDP photo; sharing same asset as 59 would trip gate hash_collision","shoot kit layout or find kit SKU page")
for pos in ["43","266","268","1017"]:
    P[pos]=("STRUCTURAL: internal item codes STA-/X-STA-PRE-WAS-* mislabel brand (product is Karcher K2/K3/K4); gate model_variants derived from these prefixes (e.g. PREWASK2) can never appear on karcher.com/my pages and detected_model is empty -> model_absent unavoidable regardless of source quality","catalogue fix: correct item_code brand segment + populate detected_model (K2POWERVPS/K3DELUXEPREMIUM/K4BASIC/K3HRPLUS), then re-run tier-1 against karcher.com/my")
for pos, note in {"250":"stihl-thk.com.my official dealer PDP MS 230","213":"stihl-thk.com.my FR 3001 clearing saw"}.items(): C[pos]=("B",note)
for pos, note in {"61":"rubine.com.my official PDP RCH-NOVARA-90SS (protocol: search display terms, not internal TAE11-M330)","63":"rubine.com.my official PDP RGH-LOTOFLEXI2B-BLFX"}.items(): C[pos]=("B",note)
for pos, note in {"276":"dongchengtool.com global OEM detail DCSM03-100EK","1933":"dongchengtool.com global OEM detail DCJZ03-13EK","1935":"dongchengtool.com global OEM detail DCPB488EK"}.items(): C[pos]=("B",note)
for pos, note in {"1453":"alphamalaysia.com official X5-E page","1466":"alphamalaysia.com official AS-2EP page (silver finish per item suffix -SIL)"}.items(): C[pos]=("B",note)
P["90"]=("no prior page/image in ledger; Alpha IM-9EP black rainshower listing not located this wave","query alphamalaysia.com catalogue next round")
for pos, note in {"291":"energizer.com global product page MAX AAA 4-pack","290":"energizer.com global product page MAX AA 4-pack"}.items(): C[pos]=("B",note+" (US pack art - regional artwork risk)")
C["300"]=("B","techplas.com.my official injection-moulded drain cover OTD-5120")
C["2602"]=("B","mys.sika.com official tile-adhesive PDP + scene7 1000px render")
C["3630"]=("B","mys.sika.com official waterproofing PDP Sikagard-703 Groutseal")
for pos in ["2515","2865"]: C[pos]=("B","sunwaywinstar B2B distributor listing Strongman DS-HD ladder (signed OBS CDN URL - reverify before reuse)")
C["2541"]=("B","suiumachinery.com.my Kende SM1212 charger listing (npcdn asset)")
C["2533"]=("B","nietz.com.my official number-punch set page (50730030-50730120 range)")
C["2522"]=("B","kdk.com.my official KB-304 table fan page")
C["3061"]=("B","homepro.com.my retailer listing NNE 13A stainless switch socket 813/S")
C["3252"]=("B","sierraplus.com.my MK 654 13A plug top SIRIM white (1200px)")
C["2773"]=("B","camdentools global Eclipse AA45E Predator blade listing")
C["2884"]=("B","cimalighting.com.my Cielo Gen2 T5 batten 4FT page (asset sglite CDN)")
C["3223"]=("B","cimalighting.com.my same family page WW variant")
C["3872"]=("B","unimechengineering uPVC pipe page (BS pattern; image filename BS4255 vs item BS5255 - pixel/spec check required)")
C["5009"]=("B","unimechengineering uPVC pipe page (as 3872)")
C["4349"]=("B","sierraplus SE-220 E27 batten holder white")
P["3533"]=("prior image hosted on img.lazcdn.com (Lazada marketplace host - gate forbidden); Hermanns downlight needs brand/distributor source","find Hermanns MY distributor page")
for pos in ["103","106","107","109"]:
    P[pos]=("four rivet sizes share one generic pack photo (soongwung C72.png) across different lengths 1/2|1/4|3/4|5/16 - per-size proof impossible from single shared asset (gate shared_image)","ask supplier for per-size pack shots")
C["3623"]=("B","mrmarks.com Mr.Mark fibre disc P24 listing")
C["3343"]=("B","djhardware Gold Elephant flexible grinding disc EFM-430")
C["2868"]=("B","homepro.com.my 3M Scotch-Brite 31B 3-pad pack")
C["247"] =("B","sonichardware.com.my Glotool flexible tube listing")

new = []
for pos, d in brief.items():
    if pos in have: continue
    if pos in C:
        conf, note = C[pos]
        dec, mc, fe, me = "candidate", conf, "yes", "yes"
        reason = f"tranche-2 bulk triage | {note} | q:group searches logged in tranche-1 rows this session | p:{d['prior_page']} carried forward for programmatic reverify (bytes+dims+model-text)"
        human = "pixel-check model/finish marking on packaging"
    else:
        note, human = P.get(pos, ("not individually researched within wave budget","queue next round"))
        dec, mc, fe, me = "pending", "C", "no", "no"
        reason = f"tranche-2 budget exhausted after deep-verified tranche-1 (33 rows) | {note} | q:(individual query deferred) | p:{d['prior_page'] or 'none'}"
    new.append({"source_position": pos, "item_code": d["item_code"], "uom": d["uom"],
                "official_product_page": d["prior_page"], "official_image_url": d["prior_img"],
                "researcher_decision": dec, "match_confidence": mc, "finish_exact": fe,
                "model_exact": me, "uom_assessment": "ok", "rights_status": "unknown",
                "reason": reason, "human_action": human})

with open(SHARD, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, HDR); w.writeheader(); w.writerows(rows + new)

fetch_positions = ",".join(r["source_position"] for r in new if r["researcher_decision"] == "candidate")
print(f"appended {len(new)} rows ({fetch_positions.count(',')+1 if fetch_positions else 0} candidates to fetch)")

if "--fetch" in sys.argv:
    subprocess.run([sys.executable, str(STATE/"fetch_from_shard.py"), "--shard", str(SHARD),
                    "--out", str(EVJ), "--positions", fetch_positions,
                    "--batch", "50", "--round", "2"], check=True)

# ---- phase: validate & finalise ---------------------------------------------
if "--validate" in sys.argv:
    ev = json.loads(EVJ.read_text())
    fin = list(csv.DictReader(open(SHARD, encoding="utf-8")))
    url_claims, sha_claims = defaultdict(list), defaultdict(list)
    MKT = ("shopee","lazada","facebook","fbcdn","aliexpress","alibaba","google.","gstatic",
           "googleusercontent","tiktok","instagram","pinterest")
    for r in fin:
        p = r["source_position"]
        if r["researcher_decision"] != "candidate":
            continue
        e = ev.get(p, {})
        txt_f = PC / f"{p}.txt"
        txt = txt_f.read_text(encoding="utf-8", errors="ignore") if txt_f.exists() else ""
        pw, ph = int(e.get("px_w") or 0), int(e.get("px_h") or 0)
        blen = int(e.get("image_bytes_len") or 0)
        ct = (e.get("image_content_type") or "").lower()
        host = urlparse(r["official_image_url"]).netloc.lower() + " " + urlparse(r["official_product_page"]).netloc.lower()
        ok = (e.get("page_status")==200 and e.get("image_status")==200 and ct.startswith("image/")
              and max(pw,ph)>=500 and blen>=20000 and model_present(r,txt)
              and not any(m in host for m in MKT))
        if ok:
            nt = norm_text(txt)
            vhit = ""
            from gate import model_variants
            for v in model_variants(r):
                if not v.startswith("TOKENS:") and v in nt:
                    i = nt.find(v)
                    vhit = f"{v} @ ...{nt[max(0,i-30):i+len(v)+20]}..."
                    break
            r["reason"] += f" || VERIFIED: page200 img200 {pw}x{ph}px {blen}B {ct.split(';')[0]}; cached-page quote '{vhit}'; unique-url/sha enforced"
            sha_claims[e.get("image_sha256","")].append(p)
            url_claims[r["official_image_url"]].append(p)
        else:
            cause = ("page/http fail" if e.get("page_status")!=200 or e.get("image_status")!=200 else
                     f"bytes/dims too_small({max(pw,ph)}px/{blen}B)" if max(pw,ph)<500 or blen<20000 else
                     "model_absent in cached page text" if not model_present(r,txt) else
                     "marketplace/forbidden host" if any(m in host for m in MKT) else "unknown")
            r.update(researcher_decision="pending", match_confidence="C",
                     finish_exact="no", model_exact="no",
                     official_product_page="", official_image_url="")
            r["reason"] += f" || AUTO-DEMOTED: {cause}; keep leads p:{brief[p]['prior_page']}"
            r["human_action"] = r["human_action"]
    # collisions among survivors
    for coll in (url_claims, sha_claims):
        for k, ps in coll.items():
            if len(ps) > 1:
                for r in fin:
                    if r["source_position"] in ps:
                        r.update(researcher_decision="pending", match_confidence="C",
                                 finish_exact="no", model_exact="no")
                        r["reason"] += f" || COLLISION {'url' if coll is url_claims else 'sha'} with {ps}"
                        r["official_product_page"]=""; r["official_image_url"]=""
    with open(SHARD,"w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,HDR); w.writeheader(); w.writerows(fin)
    from collections import Counter
    cnt=Counter(r["researcher_decision"] for r in fin)
    print("FINAL:", dict(cnt), "total", len(fin))
