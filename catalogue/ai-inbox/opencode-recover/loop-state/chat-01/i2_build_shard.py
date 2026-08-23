import csv, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "shard-0551-0650.csv")
HDR = ["source_position","item_code","uom","official_product_page","official_image_url",
       "researcher_decision","match_confidence","finish_exact","model_exact","uom_assessment",
       "rights_status","reason","human_action"]

CH = "[chan:exa-websearch-HTTP429-all-session;bing_fallback-html-poisoned-generic-serps-archived->chat-01/serp-I2/*.html;oem-direct-sitemap-probes->chat-01/serp-I2/sitemaps/+oem-*.html] "
PROTO = "tier1 fired per protocol "

CAT = "source_own_photo_or_supplier_catalog"
GEN = "shoot_in_store"
RTY = "retry_when_search_restored"

def rej(qs, why):
    return [ "", "", "", "", "",
             "reject", "", "", "", "", "",
             CH + PROTO + qs + " -> SERP junk/no-hit archived | " + why, GEN ]
def pen(qs, why):
    return [ "", "", "", "", "",
             "pending", "", "", "", "", "",
             CH + "tier1 fired | " + qs + " -> no OEM/authorised asset verifiable this session (websearch 429 all session) | " + why, RTY ]
def rej_cat(qs, why):
    r = rej(qs, why); r[12] = CAT; return r
def pen(qs, why):
    return [ "", "", "", "", "",
             "pending", "", "", "", "", "",
             CH + "tier1 fired | " + qs + " -> no OEM/authorised asset verifiable this session (websearch 429 all session) | " + why, RTY ]


rows = []
A = rows.append

# ord551
r = rej("q:yg239r-brass='YG239R brass reduced socket'",
        "YG-prefix brass fitting codes unattributable online this session; commodity reduced mxf socket; rights none found")
r[0], r[1], r[2] = "5882","FIT-YG239R-SOC-MXF-1/2\"X3/8\"-BRA","PCS"; A(r)
# ord552
r = rej("q:boxbitsocket-mag='magnetic bit socket holder 13x65 BSP037F'",
        "generic_unbranded: 13x65mm box bit socket holder; BSP037F=supplier sku not attributable OEM model; no brand string")
r[0], r[1], r[2] = "5882","TOO-DRI-MAG-BSP037-F","PCS"; r[12]=CAT; A(r)
# ord553
r = rej("q:nickel-snap-swivel='nickel snap swivel fishing tackle'",
        "generic_unbranded: nickel snap swivel No.8 commodity fishing tackle; same family as pos4459(NO.2)/4537(NO.4)/4839(NO.10)/5214(swivel NO.10)/5215(NO.12); no brand/model string")
r[0], r[1], r[2] = "4754","SHH-SWIVEL-SNAP-NO.8","PKT"; A(r)
# ord554
r = rej("q:cable-lug-500amp family probe='battery cable lug 500A white' (covers ring-lug packs)",
        "generic_unbranded: insulated cable lug 1.5-5mm 10pcs pack; size-code only commodity terminal")
r[0], r[1], r[2] = "6065","CAB-LUG-01.5-5","PCK"; r[12]=CAT; A(r)
# ord555
r = pen("q:yg251-brass='YG251 brass connector fitting'",
        "T brass connector series YG251/YG251A real supplier code but unattributable to any OEM/authorised page this session")
r[0], r[1], r[2] = "3893","FIT-YG251A-SOC-10MM-BRA","PCS"; A(r)
# ord556
r = pen("q:exori-4310n='Exori super strong hook 4310N'; p:oem-probe exori.com.my+exori.com DNS-fail",
        "Exori brand real in MY fishing trade; no OEM/authorised hook page found this session")
r[0], r[1], r[2] = "4832","SHH-HOOK-4310N-NO.8","PKT"; A(r)
# ord557
r = pen("q:yg251-brass shared with pos3893",
        "Y brass connector 8mm same unattributed YG251 series; retry when search restored")
r[0], r[1], r[2] = "3892","FIT-YG251-SOC-08MM-BRA","PCS"; A(r)
# ord558
r = rej("q:india-junior-saw-14j='India junior hacksaw frame blade'",
        "generic_house_import: 'Sr' house-prefix junior saw code14J; import commodity hand saw; no attributable brand/model")
r[0], r[1], r[2] = "4954","CUT-SAW-IND-14J","PCS"; r[12]=CAT; A(r)
# ord559
r = rej("q:gi-boitnut-pack='G.I bolt and nut 3/16 pack hardware'",
        "generic_unbranded: Sr G.I bolt&nut retail pack 3/16x1-1/4(12PCS/PCK); sibling precedent RBN-110 rejected identical family pos4818/3643; commodity fastener pack")
r[0], r[1], r[2] = "4358","BNW-B&N-RBN-112","PCK"; r[12]=CAT; A(r)
# ord560
r = rej("q:batteryclip-25amp='heavy duty battery clip 25 amp'",
        "generic_unbranded: heavy-duty insulated battery clip 25AMP; commodity electrical")
r[0], r[1], r[2] = "6249","CLI-BAT-CLI-0025AMP","SET"; r[12]=CAT; A(r)
# ord561
r = rej("q:bsw-spring-washer='BSW spring washer 5/8 imperial'",
        "generic_unbranded: BSW 5/8 spring washer 8pcs pack; imperial commodity washer no brand/model")
r[0], r[1], r[2] = "6434","BNW-WAS-SPR-16MM","PCK"; r[12]=CAT; A(r)
# ord562
r = rej("q:bsw-spring-washer shared with pos6434",
        "generic_unbranded: BSW 9/16 spring washer 8pcs pack; imperial commodity washer")
r[0], r[1], r[2] = "6601","BNW-WAS-SPR-14MM","PCK"; r[12]=CAT; A(r)
# ord563
r = rej("q:gi-boitnut-pack shared with pos4358",
        "generic_unbranded: Sr G.I bolt&nut pack 3/16x1-1/2(7PCS/PCK); sibling RBN-110 precedent; commodity fastener pack")
r[0], r[1], r[2] = "4818","BNW-B&N-RBN-115","PCK"; r[12]=CAT; A(r)
# ord564
r = pen("q:otosani-9661='OTOSANI pillar tap 966-1 stainless'->Bing returned 0 b_algo results; p:oem-probe otosani.com/.com.my DNS-fail",
        "OTOSANI 304SS pillar swan tap 966-1: brand plausible MY trade name; no OEM/authorised page verifiable this session")
r[0], r[1], r[2] = "3484","TAP-PIL-OTO-966-1","PCS"; A(r)
# ord565 CANDIDATE E20AB
A(["3874","SWI-SOC-ELE-E20AB","PCS",
   "https://www.retouch.my/showproducts/productid/5703833/cid/577199/doublepole-switches/",
   "https://cdn1.npcdn.net/userfiles/27047/file/20A(1).png",
   "candidate","A","yes","yes","PCS single 20A DP switch retail unit correct","unknown",
   "[chan:exa-websearch-HTTP429-all-session;bing_fallback-html-poisoned->serp-I2/;oem-direct-retouch-my-sitemap+category-crawl->serp-I2/retouch-*.html] tier1 q:elegance-e20ab(bing junk archived) then oem-path per protocol sitemap rule: retouch.my/products/sitemap.xml->category cid577199 'Switch & Sockets Elegance Sense's Black'->pdp https://www.retouch.my/showproducts/productid/5703833/cid/577199/doublepole-switches/ OFFICIAL own-site of manufacturer Broadlink Marketing Sdn Bhd (title 'Double-Pole Switches ... Malaysia Supplier | Broadlink Marketing Sdn Bhd'); CODE-table verbatim quote 'CODE E20AB - 20A Double-Pole Switch C/W Neon / E20A2B - 20A 2W Double-Pole Switch C/W Neon' proves model_exact=yes; series-page finish BLACK proves finish_exact=yes(neon-blk); section asset bound to 'Double-Pole Switch' block via fancybox link immediately preceding that CODE table = userfiles 27047/file/20A(1).png; PIXEL-VIEWED this session from fetched bytes 1200x1240px 1352549B image/png sha256 1e858461a825c2937f2a46c3e0a8b2650b0cf0888b151b7fefb3b45c6f32fbfd: single matte-black DP rocker plate with red neon window, NO family hero/sibling/colour-swap (sibling block image 20A(2).png=45A NOT used); rights_status=unknown: manufacturer self-published asset, usage permission not yet obtained",
   "verify_rights_then_gate"])
# ord566
r = pen("q:vip343-valve='VIP ball valve PN25 brass Malaysia 343'",
        "VIP-brand PN25 full-bore ball valve series 343 25mm(1in): brand real in MY plumbing trade; no OEM/distributor page found this session")
r[0], r[1], r[2] = "3463","VAL-BAL-VIP-343-25MM","PCS"; A(r)
# ord567
r = rej("family precedent sibling shard ordinal~556 RAI-BOO-KRK-Y38# rejected generic_house_import; q:korakoh-rainshoes='Korakoh rain shoes Malaysia'+q:rainshoes-7000ylw both -> SERP junk archived(no-hit)",
        "generic_house_import: rain shoes yellow 7000YLW size41; 7000YLW=supplier colour code; own-import footwear no OEM web presence; NEVER borrow sibling photos")
r[0], r[1], r[2] = "2910","RAI-BOO-KRK-Y41#","PAIR"; r[11]="reject "+CH+"tier1 fired per protocol | "+r[11]; r[12]=GEN; A(r)
# ord568
r = pen("q:sumo-routerbit-shark='Sumo router bit shark 1/4'",
        "detected_brand Bosch=misdetection (display 'Sumo Router Bit 1/4 Shark'); Sumo router-bit trade brand unattributable online this session; websearch down prevented full tier1 completion")
r[0], r[1], r[2] = "2881","BOS-1/4-12","PCS"; A(r)
# ord569
r = rej("q:st22-airwheel='ST22 air wheel tyre'",
        "generic_unbranded: pneumatic replacement wheel ST22; ST22=supplier sku; commodity wheelbarrow/trolley wheel")
r[0], r[1], r[2] = "3055","IND-WHE-TYR-AIR-ST22","PCS"; r[12]=CAT; A(r)
# ord570
r = pen("q:vip343-valve shared with pos3463",
        "VIP PN25 343 valve 18mm(3/4) same unattributed series as pos3463; retry when search restored")
r[0], r[1], r[2] = "3938","VAL-BAL-VIP-343-18MM","PCS"; A(r)
# ord571
r = pen("q:glocks-glbbc40='Glocks GLBBC40 brass padlock'->SERP junk(Taiwan wiki) archived; p:oem-probe glocks.com.my/.com DNS-fail",
        "Glocks MY padlock brand real (sibling GLBBC20 also pending); GLBBC40 no OEM/authorised page verifiable this session")
r[0], r[1], r[2] = "3057","LOC-GLO-BRA-GLBBC40","PCS"; A(r)
# ord572
r = rej("q:w815-pruner='W815 by-pass pruner 200mm'",
        "generic_unbranded: 200mm by-pass pruner; W815=supplier sku not attributable OEM model; commodity garden tool")
r[0], r[1], r[2] = "2929","CUT-PRU-PAS-W815","PCS"; r[12]=CAT; A(r)
# ord573
r = pen("q:toyo-grease-eaj8000='Toyo EAJ8000 bentonite grease'; p:oem-probe toyogrease.com live-but-parked(no EAJ/MP2 content)",
        "Toyo grease brand real in MY lubricant trade; EAJ8000 hi-temp bentonite product page not locatable this session")
r[0], r[1], r[2] = "3014","GRE-TOYO-450GM","TIN"; A(r)
# ord574
r = pen("q:toyo-grease-mp2='Toyo MP2 lithium EP grease' shared with pos3014; p:same parked domain probe",
        "Toyo MP2 lithium EP grease: no OEM/authorised page verifiable this session")
r[0], r[1], r[2] = "3030","GRE-TOYO-350GM","TIN"; A(r)
# ord575
r = pen("q:dewalt-dw4785 x2 ('\"DW4785\" DeWalt diamond blade') both poisoned-junk archived; p:oem-probe dewalt.com/en-us/product/sitemap.xml downloaded(4727 urls)->grep DW4785/4785 NO hit(model likely discontinued from current catalogue); p:oem-probe authorised-distributor leeden.com.my product sitemaps(2523 urls)->no hit",
        "DeWalt official site exists but exact DW4785 dry diamond blade 4in asset not locatable this session")
r[0], r[1], r[2] = "3200","CUT-DEW-DW4785","PCS"; A(r)
# ord576
r = rej("q:g785-bracket->SERP poisoned-junk archived(no-hit)",
        "generic_unbranded: G785 304 stainless heavy-duty shelf bracket 8in; G785=supplier sku; commodity bracket")
r[0], r[1], r[2] = "3257","BRA-SHE-S/S-G785-08\"","SET"; r[12]=CAT; A(r)

print("chunk1 rows:", len(rows))
with open(OUT, "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh); w.writerow(HDR)
    for r in rows: w.writerow(r)
