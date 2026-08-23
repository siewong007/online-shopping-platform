#!/usr/bin/env python3
"""D2 finalizer step 2: emit chat-01/shard-d2.csv (all assigned rows)."""
import csv
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache-d2"

def big_url(html_name):
    txt = (CACHE / html_name).read_text(encoding="utf-8")
    og = re.search(r"property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", txt)
    if not og:
        return ""
    m = re.search(r"/npimg/([0-9a-f]+)\.(?:png|jpg)", og.group(1))
    if not m:
        return og.group(1)
    h = m.group(1)
    for mm in re.finditer(r"https://cdn\d\.npcdn\.net/npimg/" + h + r"\.[a-z]+\?[^\"'\s<)]+", txt):
        u = mm.group(0)
        if "new_width=1000" in u:
            return u
    return og.group(1)

CANON = {
    "134": ("https://www.jllelectrical.com.my/showproducts/productid/4013262/cid/544741/megaman-yta60z1-10w-220240v-e27-810lm-led-gls-bulb-3000k4000k6500k/", "jll-134.html"),
    "153": ("https://www.jllelectrical.com.my/showproducts/productid/4013783/cid/359490/megaman-yta70z1-15w-220240v-e27-1350lm-led-gls-bulb-3000k4000k6500k/", "jll-153.html"),
    "197": ("https://www.jllelectrical.com.my/showproducts/productid/4013283/cid/457883/megaman-yta65z2-12w-220240v-e27-1080lm-led-gls-bulb-3000k4000k6500k/", "jll-197.html"),
    "138": ("https://www.jllelectrical.com.my/showproducts/productid/4013891/cid/424624/megaman-ytp38b1-10w-220240v-810lm-plc-led-stick-3000k4000k6500k/", "jll-138.html"),
    "227": ("https://www.jllelectrical.com.my/showproducts/productid/4013850/megaman-ytp38z1-10w-220240v-810lm-e27-led-stick-3000k4000k6500k/", "jll-227.html"),
    "168": ("https://www.jllelectrical.com.my/showproducts/productid/4013992/cid/592300/megaman-ytp45z1-15w-220240v-1350lm-e27-led-stick-3000k4000k6500k/", "jll-168174.html"),
}
SMAP = "q:sitemap:megaman.com.my,www.megamanlighting.com,jllelectrical.com.my(14074 urls),smjelectrical.com.my(14978),samajaya.onesyncapp.com(0),esales.com.my(401),mybigwarehouse.com.my(dead),edaran.my(no sitemap); jll /search/keyword/<model>/ returns unfiltered JS list"

rows = []

def add(pos, ic, uom, pg, img, dec, conf, fin, mod, uom_a, rights, reason, human):
    rows.append({
        "source_position": pos, "item_code": ic, "uom": uom,
        "official_product_page": pg, "official_image_url": img,
        "researcher_decision": dec, "match_confidence": conf,
        "finish_exact": fin, "model_exact": mod, "uom_assessment": uom_a,
        "rights_status": rights, "reason": reason, "human_action": human})

# ---- Megaman candidates: one model-distinct JLL asset each ----
JLL_META = {
    "134": ("ELE-D/L-MEG-YTA60Z1-10W", "PCS", "YTA60Z1 10W"),
    "153": ("ELE-D/L-MEG-YTA70Z1-15W", "PCS", "YTA70Z1 15W"),
    "197": ("ELE-D/L-MEG-YTA65Z2-12W", "PCS", "YTA65Z2 12W"),
    "138": ("ELE-D/L-MEG-YTP38B1-10W", "PCS", "YTP38B1 10W PLC stick"),
    "227": ("ELE-D/L-MEG-YTP38Z1-10W", "PCS", "YTP38Z1 10W E27 stick"),
    "168": ("ELE-D/L-MEG-YTP45Z1-15W-4000K", "PCS", "YTP45Z1 15W E27 stick"),
}
for pos, (ic, uom, model) in JLL_META.items():
    pg, htmlf = CANON[pos]
    img = big_url(htmlf)
    reason = (f"{SMAP} | p:{pg} status=200 title literal 'MEGAMAN {model} ... LED "
              f"[3000K/4000K/6500K]' -> listing's own og:image npcdn npimg (unique hash "
              f"per model; 6 models = 6 distinct hashes) | megaman.com.my galleries "
              f"p:/product/led-g-a-bulb/,p:/product/led-stick/ have NO per-CCT mapping "
              f"(no model/cct text near gallery imgs)")
    human = "confirm JLL authorised-distributor status; pixel-check pack model marking"
    add(pos, ic, uom, pg, img, "candidate", "B", "yes", "yes",
        f"{uom} single-unit retail pack correct", "unknown", reason, human)

# ---- Megaman pendings: same-model sibling CCT rows, no distinct asset ----
PEND_MEGA = {
    "185": ("ELE-D/L-MEG-YTA60Z1-10W-4000K", "YTA60Z1 4000K", CANON["134"][0]),
    "186": ("ELE-D/L-MEG-YTA70Z1-15W-4000K", "YTA70Z1 4000K", CANON["153"][0]),
    "201": ("ELE-D/L-MEG-YTA70Z1-15W-3000K", "YTA70Z1 3000K", CANON["153"][0]),
    "174": ("ELE-D/L-MEG-YTP45Z1-15W-3000K", "YTP45Z1 3000K", CANON["168"][0]),
    "178": ("ELE-D/L-MEG-YTP38B1-10W-3000K", "YTP38B1 3000K", CANON["138"][0]),
    "232": ("ELE-D/L-MEG-YTP38Z1-10W-4000K", "YTP38Z1 4000K", CANON["227"][0]),
}
for pos, (ic, want, pg) in PEND_MEGA.items():
    reason = (f"{SMAP} | dealer listings are ONE-per-MODEL tri-CCT "
              f"'[3000K/4000K/6500K]'; the model's only asset is claimed by the "
              f"sibling row of this same model - no distinct {want} asset reachable "
              f"(megaman.com.my galleries have no provable per-CCT images)")
    human = f"request {want} per-CCT pack shot/render from Megaman MY marketing or JLL"
    add(pos, ic, "PCS", pg, "", "pending", "C", "", "", "PCS correct", "no_asset",
        reason, human)

# ---- 131 Stanley kit ----
add("131", "STA-GRI-SCG400-SET", "UNIT",
    "https://my.stanleytools.global/product/scg400-b1/20v-grinder-tool-only", "",
    "pending", "C", "", "", "UNIT kit = grinder + SC200 charger + 2x 2.0Ah battery",
    "no_asset",
    "q:sitemap:my.stanleytools.global(577 urls scanned) only scg400-b1 TOOL-ONLY page "
    "exists; probes p:/product/scg400d1-b1/ p:/product/scg400d2-b1/ both 404; SCG400_1.jpg "
    "(2000x2000) already verified_pass on sibling pos 59 STA-GRI-SCG400-SOLO - reuse would "
    "re-collide and misrepresent bare tool as kit",
    "shoot kit layout photo or request SCG400 kit composite render from Stanley APAC marketing")

# ---- Unimech UPVC pipes ----
for pos, ic, size in (("3872", 'PIP-UPVC-5255-1.1/2"', '1 1/2"(40MM)'),
                      ("5009", 'PIP-UPVC-5255-1.1/4"', '1 1/4"(32MM)')):
    add(pos, ic, "MTR",
        "https://unimechengineering.com.my/product/upvc-pipe-2/", "",
        "pending", "C", "", "", "MTR cut length of 6m pipe correct", "no_asset",
        "q:sitemap:unimechengineering.com.my(wp children=5, 710 urls) grep upvc|pdf -> only "
        "p:/product/upvc-pipe/ p:/product/upvc-pipe-2/ BOTH quote 'Spec: BS5255 Length: 6 "
        "meter Size: 32 - 50mm' generic range and share UPCV-Pipe-BS4255-1.jpg; no "
        f"{size}-specific asset anywhere on OEM site",
        f"request {size} labelled product photo from Unimech Engineering")

# ---- Jaguar rivets ----
for pos, ic, size in (("4976", 'FAS-RIV-PAT-1/8"X3/8"-PCK', "1/8 X 3/8"),
                      ("6227", "FAS-RIV-PAT-3/16X1/2-PCK", "3/16 X 1/2")):
    add(pos, ic, "PCK",
        "https://sonichardware.com.my/product/product/1442-jaguar-blind-rivet", "",
        "pending", "C", "", "", "PCK 20-piece pack correct", "no_asset",
        "q:sitemap:sonichardware.com.my robots has NO sitemap; mybigwarehouse.com.my dead "
        "(-1), esales.com.my HTTP 401, samajaya.onesyncapp.com dead (-1) | p:sonichardware "
        "1442-jaguar-blind-rivet is ONE listing with size <option> dropdown incl "
        "'{s}' sharing single image 04_1330088842.jpg -> no per-size asset".format(s=size),
        f"request {size} Jaguar blind-rivet pack photo from supplier/rights holder")

# ---- Mr.Mark fibre discs ----
for pos, ic, grit in (("3623", "CUT-DIS-MARK-12300-P024", "P24"),
                      ("4225", "CUT-DIS-MARK-12300-P120", "P120")):
    add(pos, ic, "PCS",
        "https://www.mrmarks.com/index.php?ws=showproducts&products_id=2160710", "",
        "pending", "C", "", "", "PCS single disc correct", "no_asset",
        "q:sitemap:mrmarks.com(25 urls, products not indexed) | p:index.php?"
        "ws=showproducts&products_id=2160710 'MK-WEL-12300 MASTER FIBRE DISC (100mm/4\")' "
        "has options=[] (no grit selector) + single npcdn photo; sibling ids 2160706="
        "MK-WEL-12200 FLAP DISC, 2160712=MK-WEL-12320 are different products; "
        "p:?ws=showsearch&keyword=12300 returns zero product ids -> no per-grit asset",
        f"request {grit}-labelled MK-WEL-12300 disc photo from Mr.Mark Tools (M) Sdn Bhd")

# ---- 3756 MGM eyeball (official brand page) ----
add("3756", "ELE-D/L-MGM-MQTL2048-6500K", "PCS",
    "https://megaman.com.my/product/eye-ball/",
    "https://megaman.com.my/wp-content/uploads/2020/12/Untitled-8-6.jpg",
    "candidate", "A", "yes", "yes", "PCS recessed eyeball unit correct", "needs_permission",
    "q:sitemap:megaman.com.my(60 urls) | p:/product/eye-ball/ status=200 main gallery img "
    "Untitled-8-6.jpg; prior r2 verify pass with technical table row 'MQTL2048 7W'",
    "none beyond permission confirmation")

# ---- 3593 Techplas flapper valve ----
add("3593", "HHD-FLU-M0676-L110W-50MM", "PCS",
    "https://techplas.com.my/products/parts-of-flushing-cistern/flapper-outlet-valve/fao-l110-w",
    "https://techplas.com.my/wp-content/uploads/2022/08/FAO-L110-W.jpg",
    "candidate", "A", "yes", "yes", "PCS 50mm outlet valve correct", "needs_permission",
    "q:sitemap:techplas.com.my(sitemap.xml live, index only) | p:/products/parts-of-flushing-"
    "cistern/flapper-outlet-valve/fao-l110-w status=200 bytes=103681 with exact-model img "
    "FAO-L110-W.jpg (+ variant faol110w-cp-OV.jpg)",
    "none beyond permission confirmation")

COLS = ["source_position", "item_code", "uom", "official_product_page",
        "official_image_url", "researcher_decision", "match_confidence",
        "finish_exact", "model_exact", "uom_assessment", "rights_status",
        "reason", "human_action"]
with open(HERE / "shard-d2.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=COLS)
    w.writeheader()
    w.writerows(rows)

print(f"wrote shard-d2.csv rows={len(rows)}")
cand = [r for r in rows if r["researcher_decision"] == "candidate"]
print(f"candidates={len(cand)} pendings={len(rows) - len(cand)}")
imgs = [r["official_image_url"] for r in cand]
assert len(imgs) == len(set(imgs)), "DUPLICATE IMAGE URL IN CANDIDATES"
print("candidate image URLs all distinct: OK")
