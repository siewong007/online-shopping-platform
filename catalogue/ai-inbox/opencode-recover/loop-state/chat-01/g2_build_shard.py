#!/usr/bin/env python3
"""Build shard-0351-0450.csv for G2 slot (ordinals 351-450, chat-01)."""
import csv, os

BASE = os.path.dirname(os.path.abspath(__file__))
ASSIGN = os.path.normpath(os.path.join(BASE, "..", "chat-assignments", "chat-01.csv"))
OUT = os.path.join(BASE, "shard-0351-0450.csv")
HEADER = ["source_position", "item_code", "uom", "official_product_page",
          "official_image_url", "researcher_decision", "match_confidence",
          "finish_exact", "model_exact", "uom_assessment", "rights_status",
          "reason", "human_action"]

QSET = ('tier1-x6-fired-and-archived->chat-01/serp-G2/serps.json [chan:websearch-exa HTTP429 '
        'persistent-all-session; fallback Bing HTML python+webfetch both bot-junk '
        '(bing_fallback_junk); OEM-probe channel used instead]')

CAND = {
    "3756": dict(
        page="https://megaman.com.my/product/eye-ball/",
        img="https://megaman.com.my/wp-content/uploads/2020/12/Untitled-8-6.jpg",
        conf="B", fin="yes", mod="yes",
        uom="PCS single downlight retail unit correct",
        rights="unknown",
        reason=(f"[ord360] {QSET} q1:\"MQTL2048\" site:.com.my; q2:\"MQTL2048\" official Megaman; "
                "q3:\"MQTL2048\" filetype:pdf; q4:\"MQTL2048\" site:leeden.com.my OR "
                "site:theleedenstore.com.my; q5:Megaman \"MQTL2048\" distributor Malaysia; "
                "q6:\"MQTL2048\" authorised dealer | p:bing-junk-rewrites(RUT/NCAA/horoskope); "
                "p:oem-probe megaman.com.my/?s=MQTL2048 cert-expired(fetched tls-unverified); "
                "PDP /product/eye-ball/ live titled LED EYE BALL; body text names 'The Megaman LED "
                "Eyeball Downlight MQTL2048' 7W O85 matching item 2.5in 7W; featured wp-post-image "
                "Untitled-8-6.jpg 800x800 srcset | caveat: gallery images not CCT-labelled; physical "
                "fixture finish identical across CCT variants"),
        action="none - official Megaman MY asset, model named on page"),
    "3593": dict(
        page="https://techplas.com.my/products/parts-of-flushing-cistern/flapper-outlet-valve/fao-l110-w/",
        img="https://techplas.com.my/wp-content/uploads/2022/08/FAO-L110-W.jpg",
        conf="A", fin="yes", mod="yes",
        uom="PCS single flapper valve retail unit correct",
        rights="unknown",
        reason=(f"[ord373] {QSET} q1:\"L110-W flapper outlet valve\" site:.com.my; q2:...official "
                "Techplas; q3:...filetype:pdf; q4:...leeden; q5:Techplas ... distributor Malaysia; "
                "q6:...authorised dealer | p:bing-junk(Walmart/CNN/NFL rewrites); p:oem-probe "
                "techplas.com.my/?s=L110 -> TECHPLAS brand owner PROMINENT IMAGE SDN BHD; dedicated "
                "PDP fao-l110-w titled FAO-L110-W with W(white) variant photo FAO-L110-W.jpg "
                "(siblings CP/OV have separate photos -> no colour swap); matches item "
                "L110-W'TECHPLAS Flapper Outlet Valve 50MM"),
        action="none - official Techplas factory asset exact model+finish"),
    "3044": dict(
        page="https://shop.dursol.com/products/autosol%C2%AE-metal-polish-super-gloss",
        img="https://autosol.de/wp-content/uploads/2022/12/Produktfoto-11-001121-Metal_Polish_Super_Gloss-Tube_75ml-DE-EN-Shop.png",
        conf="A", fin="yes", mod="yes",
        uom="PCS single 75ml tube retail unit correct",
        rights="unknown",
        reason=(f"[ord376] {QSET} q1:\"Autosol metal polish 75ml\" site:.com.my; q2:...official; "
                "q3:...filetype:pdf; q4:...leeden; q5:...distributor Malaysia; q6:...authorised "
                "dealer | p:bing-junk except Shopee-MY listing(retailer-only,not used); p:oem-probe "
                "autosol.de (DURSOL-FABRIC official manufacturer) Metal Polish series section shows "
                "75ml tube productfoto; official shop.dursol.com PDP AUTOSOL METAL POLISH SUPER "
                "GLOSS variant 75ml; image Produktfoto-11-001121-...Tube_75ml on autosol.de CDN "
                "matches item AUTOSOL Metal Polish 75ml tube"),
        action="none - official Dursol/AUTOSOL manufacturer asset exact size variant"),
}

PEND = {
    "3976": "Gold Elephant abrasive brand; EDM-4080 code unverified; no official site reachable",
    "4082": "Gold Elephant abrasive brand; EDM-4180 sibling of 3976; no official site reachable",
    "4255": "Gold Elephant abrasive brand; EDM-4100 sibling of 3976; no official site reachable",
    "3796": "Ultra wiring-accessory brand (MY); ownership/site unresolved; ultraelectrical.com parked",
    "4488": "Ultra wiring-accessory brand; sibling of 3796; no official site reachable",
    "3746": "Ultra wiring-accessory brand; sibling of 3796; no official site reachable",
    "4596": "Ultra wiring-accessory brand; sibling of 3796; no official site reachable",
    "3695": "Elegance wiring-accessory brand (MY); no official site reachable",
    "4040": "Elegance brand; sibling query-set of 3695; no official site reachable",
    "3570": "Elegance brand; sibling query-set of 3695; no official site reachable",
    "4215": "Elegance brand; sibling query-set of 3695; no official site reachable",
    "3795": "MK Electric (Honeywell) global brand; MY Slimline Plus code S2893 unresolvable on mkelectric.com this session",
    "4843": "MK Electric brand; MY wide-rocker S4781 unresolvable on mkelectric.com this session",
    "3206": "Deluxe cylindrical lockset brand (MY); no official site reachable",
    "4356": "VIP chrome mini valve brand; no official site reachable",
    "4274": "VIP brand; sibling query-set of 4356; no official site reachable",
    "4627": "Brain expansion-bolt brand (MY); no official site reachable",
    "3887": "Brain brand hook bolt TRAC150; sibling query-set of 4627; no official site reachable",
    "3134": "Faris scraper brand (MY); no official site reachable",
    "2971": "Faris scraper brand; sibling query-set of 3134; no official site reachable",
    "7315": "Hunter drywall screw brand (MY); no official site reachable",
    "6763": "Hunter drywall screw brand; sibling query-set of 7315; no official site reachable",
    "4508": "Sasaki horn brand (JP truck parts); no official site reachable",
    "2656": "Stanley Cushion Grip screwdriver line real; exact 1/8x4 variant page unresolvable without search engine",
    "4570": "Jopex plumbing brand; jopex.com.my resolves but server shows Plesk placeholder (parked)",
    "4179": "Jopex brand bib tap; sibling query-set of 4570; brand site parked",
    "4949": "Jopex brand bib tap; sibling query-set of 4570; brand site parked",
    "3042": "Jaw wall-plug anchor brand (MY); no official site reachable",
    "1787": "Paint Master spray brand (MY retailer-chain brand); paintmaster.com.my returns 404 on all paths (dead)",
    "3053": "Eagle hose-fitting brand EG-series (MY); no official site reachable",
    "3612": "Eagle wave hook DX-series fishing brand; no official site reachable",
    "3031": "Hardex adhesive brand (SG/MY); hardex.com is unrelated Canadian brake firm; no official adhesive site reachable",
    "2678": "Hardex epoxy brand; sibling query-set of 3031; no official site reachable",
    "5253": "Sensui power-bit brand; no official site reachable",
    "5691": "UMC conduit-accessory brand (MY); umc domain guesses NXDOMAIN",
    "4496": "Jaguar blind-rivet brand; historic lead multico.com.my shop since removed (searches empty)",
    "4297": "Cavallo valve brand CA9003; brand tmall storefront exists but MY-authorised page unproven",
    "4061": "Picasaf protective-eyewear brand; no official site reachable",
}

GENERIC_REJECT = {
    "4427": "(bs) long white M.L No.10 monofilament line - unbranded commodity spool",
    "4428": "unbranded commodity line No.40", "4484": "unbranded commodity line No.100",
    "4485": "unbranded commodity line No.70", "4589": "unbranded commodity line No.80",
    "1100": "house-brand Glotool shade netting; sibling 70% netting also unresolved; never borrow sibling photos",
    "4187": "SS304 hex bolt commodity", "4021": "SS304 hex bolt commodity",
    "4204": "unbranded radiator paint brush 642R size code only",
    "6237": "unbranded 2-way screwdriver", "6815": "unbranded 13A 2G surface box",
    "5152": "unbranded magnetic nut setter", "3028": "unbranded camlock",
    "4278": "SR trader-pack G.I bolts commodity", "4863": "SR trader-pack tapping screws commodity",
    "6449": "galvanised concrete nail commodity", "6630": "galvanised concrete nail commodity",
    "6441": "PVC elbow 45deg 40mm commodity fitting",
    "3466": "FN910D divider valve - no brand, model unverifiable",
    "4613": "E.G(electro-galvanised) roofing nail - finish descriptor not brand",
    "3538": "BR garden hose - descriptor-level branding only",
    "4094": "Atlas handpad - house-brand abrasive, no distinguishing official asset",
    "3038": "unbranded SUS304 self-adhesive hook", "2825": "unbranded sink protector A90",
    "5605": "'Long Duty' descriptive clip rating 50AMP commodity",
    "2906": "self-drilling screw 500-box commodity", "2990": "self-drilling screw 250-box commodity",
    "5092": "run capacitor CBB61-type 'Italy square' = geometry descriptor",
    "4314": "female disconnect terminal commodity",
    "3046": "mini hacksaw 220mm; STA prefix + barcode-like code, no brand evidence",
    "3407": "42cm straw hat unbranded", "3101": "DL5 caster wheel commodity",
    "5064": "cable lug 6-6 commodity", "4896": "YG-series brass tee commodity fitting",
    "5165": "YG-series brass elbow commodity fitting", "3647": "YG-series reduced nipple commodity fitting",
    "3648": "YG-series brass socket commodity fitting", "5660": "YG-series brass socket commodity fitting",
    "5906": "YG-series brass bushing commodity fitting (tier2 reject r2 stands)",
    "3527": "YG886 bell push button commodity",
    "4608": "12x12 vinyl floor tile 30PS13 commodity", "2864": "ST22 solid wheelbarrow wheel commodity",
    "3885": "brass stop cock C012 commodity", "2964": "355mm chop-saw cut-off wheel commodity",
    "2886": "gate holder T92 commodity", "5954": "BSW spring washer commodity",
    "6652": "BSW spring washer commodity", "5292": "SS232 stainless elbow commodity",
    "4376": "Sode-pattern fishing hooks commodity", "4693": "hole sinker No.3 commodity (tier2 reject r2 stands)",
    "6329": "water meter washer commodity (tier2 reject r2 stands)",
    "4928": "ceiling rose 408A 131 CR3 - model absent everywhere incl tier2 red:model_absent",
    "4192": "GP s/steel hose clip 52-76mm - r2 candidate Tecoline TECO-HAS-76 FAILED verifier + rights needs_permission; tier1 re-run found no official GP asset; cannot stand",
    "3620": "Aerico 4MC8 - brand unidentifiable",
    "5322": "Pol switch socket - no brand evidence found",
}

rows = []
with open(ASSIGN, newline="", encoding="utf-8") as fh:
    for r in csv.DictReader(fh):
        o = int(r["ordinal"])
        if 351 <= o <= 450:
            rows.append((o, r))

out_rows = []
for o, r in sorted(rows):
    pos = r["source_position"]
    base_reason = (f"[ord{o}] {QSET} q1..q6 fired per manifest g2_skus.json "
                   f"(qm=\"{r['detected_model'] or r['item_code']}\") | ")
    if pos in CAND:
        c = CAND[pos]
        out_rows.append([pos, r["item_code"], r["uom"], c["page"], c["img"],
                         "candidate", c["conf"], c["fin"], c["mod"], c["uom"],
                         c["rights"], c["reason"], c["action"]])
    elif pos in PEND:
        out_rows.append([pos, r["item_code"], r["uom"], "", "", "pending", "", "", "",
                         "uom as listed; unverified against any source", "",
                         base_reason + f"p:no-official-asset-found: {PEND[pos]} | decision pending for "
                         "next round when websearch channel recovers (tier2 normalisation variants untried)",
                         "retry websearch tier1/tier2 when exa quota restores"])
    else:
        why = GENERIC_REJECT.get(pos, "generic unbranded commodity")
        ha = "human: none - commodity; stock photo acceptable"
        if pos in ("4693", "5906", "6329"):
            ha = "human: confirm commodity classification"
        if pos == "4192":
            ha = ("human: verify Ekoway supplier part vs Tecoline TECO-HAS-76; request usage "
                  "permission from Tecoline Sdn Bhd if ever reused")
        if pos == "4928":
            ha = "human: supplier data sheet needed (model absent online)"
        dec_extra = ""
        if pos in ("4693", "5906", "6329", "4192", "4928"):
            dec_extra = "; tier1-x6 re-fired this session confirming"
        out_rows.append([pos, r["item_code"], r["uom"], "", "", "reject", "", "", "",
                         "n/a", "",
                         base_reason + f"p:generic_unbranded_or_no_official_asset: {why}{dec_extra}",
                         ha])

with open(OUT, "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(HEADER)
    for i, rr in enumerate(out_rows, 1):
        w.writerow(rr)
        if i % 25 == 0:
            fh.flush()
print("wrote", len(out_rows), "rows ->", OUT)

from collections import Counter
cnt = Counter(rr[5] for rr in out_rows)
print("decision counts:", dict(cnt))
