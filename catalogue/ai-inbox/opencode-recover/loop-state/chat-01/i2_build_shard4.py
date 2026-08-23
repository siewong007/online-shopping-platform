import csv, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shard-0551-0650.csv")
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

rows = []; A = rows.append
# ord626
r = pen("q:elegance-e20ab(bing junk)+oem-path: retouch.my official Broadlink site FULLY swept - black-series 16A-switches CODE-table verbatim lists only 'E011B - 1 GANG 1 WAY / E012B - 1 GANG 2 WAY / E021B / E022B'; E031B ABSENT; all 18 Elegance PDPs enumerated contain no E031B",
        "Elegance=Broadlink series proven real but exact model E031B(16A 3GANG 1-way black) not present on official site this session; needs supplier confirmation"); r[0], r[1], r[2] = "4238","SWI-SOC-ELE-E031B","PCS"; A(r)
# ord627
r = rej("q:stopcock-c018='brass stop cock C018 18mm'->SERP junk archived",
        "generic_unbranded: brass stop cock valve C018=18MM size code; commodity plumbing stopcock"); r[0], r[1], r[2] = "4053","COC-STO-C018","PCS"; r[12]=CAT; A(r)
# ord628
r = pen("q:colex-ta401/colex-za401 shared probes; p:colex.com.sg empty posts-index",
        "Colex ZA-501 chrome padlock: same unattributed state as other Colex padlocks this session"); r[0], r[1], r[2] = "3455","LOC-COL-ZA501","PCS"; A(r)
# ord629
r = pen("q:glocks-glbbc40 shared with pos3057; p:glocks domains DNS-fail",
        "Glocks GLBBC30 brass padlock: sibling GLBBC20 pending precedent; no OEM page this session"); r[0], r[1], r[2] = "3332","LOC-GLO-BRA-GLBBC30","PCS"; A(r)
# ord630
r = rej("q:speed-waterlevel-3801='Speed flat water level 3801'",
        "generic_house_brand/house_import: Speed heavy-duty flat water level tool 24in; Speed=house/distributor label spanning sizes only; commodity level tool"); r[0], r[1], r[2] = "2692","TOO-LEV-SPE-3801X24\"","PCS"; r[12]=CAT; A(r)
# ord631
r = pen("q:anchor-spray-c018='Anchor spray paint C018 chrome 400ml'->SERP junk(dairy/podcast) archived; p:oem-probe anchorpaint.com.my DNS-fail",
        "Anchor MY aerosol paint brand real in trade; C018 decorative chrome product page not locatable this session"); r[0], r[1], r[2] = "4449","PAI-SPR-ANC-C018**","PCS"; A(r)
# ord632
r = pen("q:gardenu-026b='Gardenu 026B nozzle adaptor brass'->SERP junk(maps) archived; p:oem-probe gardenu.com.my DNS-fail",
        "Gardenu garden-brand 026B brass nozzle adaptor unattributable online this session"); r[0], r[1], r[2] = "4403","WAT-NOZ-ADP-026B","PCS"; A(r)
# ord633
r = rej("family precedent sibling shard RAI-BOO-KRK-Y38# rejected generic_house_import; q:korakoh-rainshoes+q:rainshoes-7000ylw shared",
        "generic_house_import: rain shoes black 6000BLK size40; own-import footwear no OEM web presence; NEVER borrow sibling photos"); r[0], r[1], r[2] = "3456","RAI-BOO-KRK-B40M","PAIR"; A(r)
# ord634
r = rej("q:blimax-clamp8='Blimax quick release clamp'",
        "generic_house_brand: Blimax F-clamp quick-release 8in; sibling precedent Blimax=house/distributor brand no OEM site; commodity clamp"); r[0], r[1], r[2] = "3616","TOO-CLA-F-BLI-8\"","PCS"; r[12]=CAT; A(r)
# ord635
r = rej("q:speed-waterlevel-3801 shared with pos2692",
        "generic_house_brand/house_import: Speed flat water level 18in; same house-brand rationale as pos2692"); r[0], r[1], r[2] = "2691","TOO-LEV-SPE-3801X18\"","PCS"; r[12]=CAT; A(r)
# ord636
r = rej("q:floortile-cb6061='CB6061 floor tile 2x2'->SERP junk(badminton) archived",
        "generic_unbranded: self-stick/PVC floor tiles 2ftx2ft CB6061=supplier colour/sku code; commodity flooring"); r[0], r[1], r[2] = "2742","X-FLO-MOC-CB6061","PCS"; r[12]=CAT; A(r)
# ord637
r = rej("q:vest-e7361-green='clip on elastic vest lemon green E7361'",
        "generic_unbranded: clip-on elastic safety vest lemon green; E7361/08995=supplier skus; commodity workwear"); r[0], r[1], r[2] = "3568","SAF-COA-CLI-GREEN-08995","PCS"; r[12]=CAT; A(r)
# ord638
r = rej("q:palm-rake-12t='oil palm rake 12 teeth steel'",
        "generic_unbranded: 12-teeth oil-palm rake; commodity plantation garden tool no brand/model"); r[0], r[1], r[2] = "2715","GAR-RAK-PALM-12T","PCS"; r[12]=CAT; A(r)
# ord639
r = pen("q:pye-drain-r01='PYE drain clog free remover'; p:oem-probe pye.com.my DNS-fail",
        "PYE household chemical brand real in MY trade; CLDR01/R01 drain remover page not locatable this session"); r[0], r[1], r[2] = "2685","PYE-DRA-REM-R01-500ML","PCS"; A(r)
# ord640
r = pen("q:mrmark-sse919 x2 ('MK-SSE-919 Mr Mark safety spectacle(s)') -> first Bing SERP poisoned(Michael Kors), second junk archived; p:oem-probe mrmark.com.my+mrmark.asia DNS-fail",
        "Mr. Mark real MY tools/safety brand (Patriot series); MK-SSE-919 official page unreachable this session; retry when search/DNS restored"); r[0], r[1], r[2] = "3569","SAF-SPE-MK-SSE-919-BLK","PCS"; A(r)
# ord641
r = rej("q:draincleaner-powder350='drain cleaner powder crystal 350g'->SERP junk(vietnamese food) archived",
        "generic_unbranded: drain cleaner powder 350g bottle; commodity chemical no brand/model on listing"); r[0], r[1], r[2] = "2712","DRAI-POW-350G","BTL"; r[12]=CAT; A(r)
# ord642
r = pen("q:aerico-fa63='Aerico FA6 fitting air hose'->SERP junk(jump-rope) archived",
        "Aerico FA6-3 air/hose fitting brand unattributable online this session; websearch down"); r[0], r[1], r[2] = "4701","AER-FA6-3\"-FITTING","PCS"; A(r)
# ord643
r = pen("q:leon-l7006-nozzle='Leon L7006 brass water nozzle'->SERP junk(movie/restaurant) archived; p:oem-probe leonhardware.com.my DNS-fail",
        "Leon house-brand suspicion (nozzle+barrel bolt pos5132 span categories); L7006 unattributable this session; needs supplier confirmation"); r[0], r[1], r[2] = "4741","HOS-NOZ-LEO-L7006","PCS"; A(r)
# ord644
r = pen("q:dekko-042b='Dekko 042B cistern handle'->SERP junk(microsoft) archived; p:oem-probe dekko.com.my DNS-fail",
        "Dekko sanitary-spares brand real in MY plumbing trade; 042B low-level cistern handle page not locatable this session"); r[0], r[1], r[2] = "2757","CIS-HAN-042B#L/L","PCS"; A(r)
# ord645
r = pen("q:stanley-996060809 combined with q:stanley-9960651630 -> poisoned SERPs archived; p:stanleytools.com timeout x2; p:leeden authorised-distributor sitemaps no hit",
        "Stanley Cushion Grip PH2 1/4inx4in tip code 996060809: brand official exists but exact-model page unreachable this session"); r[0], r[1], r[2] = "2826","TOO-DRV-STA-PH-1/4\"X04\"-996060809","PCS"; A(r)
# ord646
r = pen("q:eupro-1920ss='Eupro 1920 SS fishing hook'->SERP junk(taiwan-weather) archived; p:oem-direct eupro.com OFFICIAL site live->hook catalogue lists only BN-series(3892BN/3255BN/3918BN/3988BN/3168BN/7930BN), NO 1920-SS listing and thumbnails are 270x120 (below 500px bar)",
        "Eupro brand official site verified live but exact model 1920-SS absent from current hook catalogue this session"); r[0], r[1], r[2] = "3717","SHH-HOOK-1920SS6/0","PCK"; A(r)
# ord647
r = rej("q:cable-lug-500amp='battery cable lug 500A white'",
        "generic_unbranded: white insulated battery cable lug 500AMP 2pcs pack; size/amp-code only commodity terminal"); r[0], r[1], r[2] = "4889","CAB-LUG-500AMP","PCK"; r[12]=CAT; A(r)
# ord648
r = rej("q:mcl-caster-dl5 family probe shared with pos2632",
        "generic_unbranded: DL5-series TPE fixed caster 2in; no brand stated on this listing unlike pos2632; commodity caster wheel"); r[0], r[1], r[2] = "4058","IND-CAS-FIX-2\"","PCS"; r[12]=CAT; A(r)
# ord649
r = pen("q:hardex-stickerremover='Hardex sticker remover 200ml'->SERP poisoned(gold-price) archived; p:oem-probe hardex.com.my DNS-fail both www/non-www",
        "Hardex real MY lubricant/aerosol brand; HUR-SRA-02 sticker remover page not locatable this session; retry when search restored"); r[0], r[1], r[2] = "2885","HAR-HUR-SRA-02-200ML","PCS"; A(r)
# ord650
r = pen("q:leon-l7006-nozzle family probe shared with pos4741; p:leonhardware.com.my DNS-fail",
        "Leon S/S lockable barrel bolt LRBB150 6in: Leon house-brand suspicion; LRBB150 unattributable this session; needs supplier confirmation"); r[0], r[1], r[2] = "5132","LEO-S/S-LOC-BAR-BOL-LRBB150 6\"","PCS"; A(r)

with open(OUT, "a", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    for r in rows: w.writerow(r)
print("appended chunk4:", len(rows))
