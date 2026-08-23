import csv, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "shard-0551-0650.csv")
CH = "[chan:exa-websearch-HTTP429-all-session;bing_fallback-html-poisoned-generic-serps-archived->chat-01/serp-I2/*.html;oem-direct-sitemap-probes->chat-01/serp-I2/sitemaps/+oem-*.html] "
PROTO = "tier1 fired per protocol "
CAT = "source_own_photo_or_supplier_catalog"
GEN = "shoot_in_store"
RTY = "retry_when_search_restored"

def rej(qs, why, ha=GEN):
    return ["", "", "", "", "", "reject", "", "", "", "", "",
            CH + PROTO + qs + " -> SERP junk/no-hit archived | " + why, ha]
def pen(qs, why):
    return ["", "", "", "", "", "pending", "", "", "", "", "",
            CH + "tier1 fired | " + qs + " -> no OEM/authorised asset verifiable this session (websearch 429 all session) | " + why, RTY]

rows = []
A = rows.append

# ord577 CANDIDATE M08913W
A(["4434","SWI-SOC-ULT-M08913W","PCS",
   "https://www.retouch.my/showproducts/productid/5816557/cid/585126/ultra-rimless-13a-sockets/",
   "https://cdn1.npcdn.net/userfiles/27047/file/URW73.png",
   "candidate","A","yes","yes","PCS single 13A multiple switch socket retail unit correct","unknown",
   "[chan:exa-websearch-HTTP429-all-session;bing_fallback-html-poisoned->serp-I2/;oem-direct-retouch-my-sitemap+category-crawl->serp-I2/retouch-*.html] tier1 q:ultra-m08913w(bing junk archived) then oem-path per protocol sitemap rule: retouch.my/products/sitemap.xml -> Ultra Rimless WHITE series category cid585126 -> pdp https://www.retouch.my/showproducts/productid/5816557/cid/585126/ultra-rimless-13a-sockets/ OFFICIAL own-site of manufacturer Broadlink Marketing Sdn Bhd (title 'ULTRA RIMLESS 13A Sockets ... Malaysia Supplier | Broadlink Marketing Sdn Bhd'); CODE-table verbatim quote 'Multiple Switch Socket | CODE M08913W - 13A Multiple Switch Socket' proves model_exact=yes; series page 'Ultra Rimless Series White' proves finish_exact=yes(neon-whi); section asset bound to the Multiple Switch Socket block via fancybox link immediately preceding that block = userfiles 27047/file/URW73.png (sibling-block assets URW8.png=2GANG / MBRW.png=big-rocker NOT used); PIXEL-VIEWED this session from fetched bytes 2386x2390px 5096764B image/png sha256 637f58e35970a3a732960d2ad1107aa5422270b239e2f3b076e32be73307d357: single white universal-pin multiple switch socket c/w red neon window and reTOUCH logo, NO family hero/sibling/colour-swap; rights_status=unknown: manufacturer self-published asset, usage permission not yet obtained",
   "verify_rights_then_gate"])
# ord578
r = pen("q:kancil-casing='Kancil PVC casing trunking Malaysia'->Bing returned 0 results; p:oem-probe kancil.com.my/sitemap.xml 404 + homepage redirects to CAPMERAK agri-tools site(no casing)",
        "Kancil PVC casing brand name real in MY electrical trade; no OEM/authorised page verifiable this session"); r[0], r[1], r[2] = "4473","ELE-PVC-CAS-2\"X2\"","LGTH"; A(r)
# ord579
r = rej("family precedent sibling shard RAI-BOO-KRK-Y38# rejected generic_house_import; q:korakoh-rainshoes+q:rainshoes-7000ylw both -> SERP junk archived(no-hit)",
        "generic_house_import: rain shoes black 6000BLK size38; 6000BLK=supplier colour code; own-import footwear no OEM web presence; NEVER borrow sibling photos"); r[0], r[1], r[2] = "3380","RAI-BOO-KRK-B38M","PAIR"; A(r)
# ord580
r = rej("family precedent sibling shard RAI-BOO-KRK-Y38# rejected generic_house_import; q:korakoh-rainshoes+q:rainshoes-7000ylw shared",
        "generic_house_import: rain shoes black 6000BLK size43; own-import footwear no OEM web presence; NEVER borrow sibling photos"); r[0], r[1], r[2] = "3381","RAI-BOO-KRK-B43M","PAIR"; A(r)
# ord581
r = pen("q:colex-ta401='Colex padlock TA-401 titanium'->SERP junk(museum) archived; p:oem-probe colex.com.sg sitemap.xml live but posts-index empty(15 urls, no padlock content); colex.com.my DNS-fail",
        "Colex padlock brand real SG/MY security trade; TA-401 no OEM/authorised product page verifiable this session"); r[0], r[1], r[2] = "3377","LOC-COL-TA401","PCS"; A(r)
# ord582
r = pen("q:colex-za401 shared with pos3377; p:same empty colex.com.sg index",
        "Colex ZA-401 chrome padlock: same unattributed state this session"); r[0], r[1], r[2] = "3378","LOC-COL-ZA401","PCS"; A(r)
# ord583
r = rej("q:cholow-3gl-handle='3GL metal system handle low level cabinet'->SERP junk(japanese portals) archived",
        "generic_unbranded: low-level metal system handle code00531G; 3GL=supplier sku; commodity furniture handle"); r[0], r[1], r[2] = "2614","CIS-HAN-METAL-L/L-00531G","PCS"; r[12]=CAT; A(r)
# ord584
r = pen("q:fr3001-lever='FR3001 control lever complete mower'->Bing returned 0 b_algo results",
        "model-specific spare part FR3001 unattributable this session (brand not stated on listing); websearch down prevented tier1 completion"); r[0], r[1], r[2] = "3751","CON-LVR-FR3001","PCS"; A(r)
# ord585
r = rej("q:pi7-hosefitting103='PI7 hose fitting 103'",
        "generic_unbranded: hose fitting code103 PI7 series; supplier sku only; commodity hose barb/adaptor"); r[0], r[1], r[2] = "4662","HOS-FIT-PI7-103#","PCS"; r[12]=CAT; A(r)
# ord586
r = rej("q:open-wrench-13x15='double open end wrench 13x15 W0305K'",
        "generic_unbranded: double open-end spanner 13x15mm; W0305K=supplier sku; commodity hand tool"); r[0], r[1], r[2] = "3798","TOO-COM-W0305K-13*15MM","PCS"; r[12]=CAT; A(r)
# ord587
r = pen("q:stanley-9960651630='Stanley 9960651630 Phillips screwdriver'+q:stanley-996060809 combined -> Bing SERPs poisoned generic-drinkware results archived; p:oem-probe stanleytools.com timeout x2; p:authorised-distributor leeden.com.my product sitemaps(2523 urls)->no hit",
        "Stanley Cushion Grip PH1 3/16x4in tip code 9960651630: brand official exists but exact-model page unreachable this session"); r[0], r[1], r[2] = "2899","TOO-DRV-STA-PH1-3/16\"X4\"-9960651630","PCS"; A(r)
# ord588
r = pen("q:eagle-eg368='Eagle EG-368 tap adapter hose'->SERP junk(eagle-bird) archived",
        "Eagle garden-brand tap adapter EG-368 unattributable online this session; websearch down"); r[0], r[1], r[2] = "3033","HOS-CON-EG-368-CLIPS","PCS"; A(r)
# ord589
r = rej("q:roofing-nail-eg50='electro galvanised roofing nail 50mm plain'",
        "generic_unbranded: E.G roofing nail plain shank 50mm per-kg; commodity fastener sold loose by weight"); r[0], r[1], r[2] = "3230","NAI-ROO-SUP-P50MM-1KGS","KG"; r[12]=CAT; A(r)
# ord590
r = pen("q:techscrew-metal='Techscrew self drill screw Malaysia'; p:oem-probe techscrew.com.my DNS-fail",
        "Techscrew MY screw brand real in fastener trade; metal self-drill 50mm pack page not locatable this session"); r[0], r[1], r[2] = "3536","FAS-SCR-TECH-METAL-50MM-PCK","PCK"; A(r)
# ord591
r = pen("q:techscrew-metal shared with pos3536; p:same DNS-fail probe",
        "Techscrew wood screw 50mm pack: same unattributed state this session"); r[0], r[1], r[2] = "3537","FAS-SCR-TECH-WOOD-50MM-PCK","PCK"; A(r)
# ord592
r = rej("q:tt-auger-2way='T&T auger bit 2 way 5/16'",
        "generic_unbranded/house_import: T&T-labelled 2-way auger bit 5/16in(8mm); spans single category, no attributable OEM site; commodity power-tool accessory"); r[0], r[1], r[2] = "5226","DRI-AUG-2WAY-08MM","PCS"; r[12]=CAT; A(r)
# ord593
r = pen("q:ecco-minivalve-ecc12mf='Ecco mini ball valve ECC12MF'->SERP junk(ECCO shoes) archived",
        "Ecco PVC mini ball valve ECC12MF 1/2in mxf: plumbing brand unattributable online this session; websearch down"); r[0], r[1], r[2] = "4993","VAL-BAL-MIN-ECC12MF","PCS"; A(r)
# ord594
r = pen("q:panasonic-cr1632='Panasonic CR1632 lithium coin battery'; p:oem-probe panasonic.com/my sitemap+product pages HTTP403 to scripted fetch",
        "BAT-PSN prefix implies Panasonic; CR-1632/5B matches Panasonic 5-blister part-number format; official page blocked to scripted access this session; needs authorised-retailer proof"); r[0], r[1], r[2] = "5063","BAT-PSN-LIT3V-CR-1632/5BE","PCS"; A(r)
# ord595
r = rej("q:none direct (family covered by rigging probes); bing poisoned for all queries",
        "generic_unbranded: G209 is Crosby-pattern commercial bow-shackle SPEC designation; RM6.80 retail shackle carries no Crosby branding and genuineness cannot be proven; commodity lifting gear sold by size(12mm)"); r[0], r[1], r[2] = "2721","RIG-SHA-BOW-G209-12MM","PCS"; r[12]=CAT; A(r)
# ord596
r = pen("q:paintmaster-spray30='Paint Master spray paint No.30 peach red'->SERP junk archived; p:oem-probe paintmaster.com.my host resolves but homepage/sitemap 404 scripted",
        "Paint Master known MY aerosol paint brand; No.30 peach red product page not locatable this session"); r[0], r[1], r[2] = "3352","PAI-SPR-PMT-030","CAN"; A(r)
# ord597
r = pen("q:paintmaster shared with pos3352; p:same 404 probe",
        "Paint Master No.142 anti-rust brown aerosol: same unattributed state this session"); r[0], r[1], r[2] = "3354","PAI-SPR-PMT-142","CAN"; A(r)
# ord598
r = pen("q:nightlight-mx667='MX-667 sensor night light 3 pin'->SERP junk archived",
        "ML-brand 3-pin sensor night light model MX-667(262): ML house-brand suspicion (spans cable+lighting), MX-667 unattributable this session"); r[0], r[1], r[2] = "5254","ELE-NIG-LIG-262","PCS"; A(r)
# ord599
r = pen("q:ecogreen-nozzle-eg2012='Ecogreen EG2012 twist nozzle'; p:oem-probe ecogreen.com.my live-but-parked stub page(no products)",
        "Ecogreen snap-in twist nozzle EG2012/5: brand name real in MY garden trade; no product page verifiable this session"); r[0], r[1], r[2] = "5520","HOS-NOZ-TWN-ECO-EG2012","PCS"; A(r)
# ord600
r = rej("q:gi-boitnut-pack shared with pos4358",
        "generic_unbranded: Sr G.I bolt&nut pack 1/4x2-1/2(10PCS/PCK); sibling RBN-110 precedent; commodity fastener pack"); r[0], r[1], r[2] = "3643","BNW-B&N-RBN-225","PCK"; r[12]=CAT; A(r)

with open(OUT, "a", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    for r in rows: w.writerow(r)
print("appended chunk2:", len(rows), "-> total data rows now 26+", len(rows))
