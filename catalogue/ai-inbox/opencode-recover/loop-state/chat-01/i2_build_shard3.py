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
# ord601
r = rej("q:cable-clip-18mm='round cable clip 18mm nails'",
        "generic_unbranded: round PVC cable clip w/masonry nail 18mm 40pcs box; commodity clip"); r[0], r[1], r[2] = "3397","CLI-ELE-CAB-18MM40S","BOX"; r[12]=CAT; A(r)
# ord602
r = pen("q:surecatch-biru406='Surecatch Biru hook 406'->SERP junk archived; p:oem-probe surecatch.net sitemap+pages HTTP403 to scripted fetch",
        "SureCatch global fishing brand real (surecatch.net blocked to scripted access); Biru 406 No.4 hook pack page not verifiable this session"); r[0], r[1], r[2] = "4327","SHH-HOOK-SC4064","PKT"; A(r)
# ord603
r = pen("q:surecatch-biru406 shared with pos4327; p:same HTTP403",
        "SureCatch Biru 406 No.5 hook pack: same unattributed state this session"); r[0], r[1], r[2] = "4328","SHH-HOOK-SC4065","PKT"; A(r)
# ord604
r = rej("q:birdnetting-black='bird netting black 6mm mesh Malaysia'",
        "generic_unbranded: black polyethylene bird netting 1x6x6mm per-metre cut; commodity netting no brand/model"); r[0], r[1], r[2] = "4421","IND-WIR-PVC-BIRD-NET-BLK","MTR"; r[12]=CAT; A(r)
# ord605
r = rej("q:nickel-snap-swivel family probe shared with pos4754",
        "generic_unbranded: nickel snap swivel No.2 commodity fishing tackle; same family as pos4754/4537/4839/5214/5215"); A(r); rows[-1][0], rows[-1][1], rows[-1][2] = "4459","SHH-SWIVEL-SNAP-NO.2","PKT"
# ord606
r = pen("q:techscrew-metal shared with pos3536; p:oem-probe techscrew.com.my DNS-fail",
        "Techscrew metal self-drill 19mm pack: brand real in trade, page not locatable this session"); r[0], r[1], r[2] = "4135","FAS-SCR-TECH-METAL-19MM-PCK","PCK"; A(r)
# ord607
r = pen("q:surecatch-biru406 shared (display 'Saki Sepit Biru 406 No.5' same RM6.20/20's as pos4328)",
        "'Saki Sepit' label vs 'Surecatch' label on identical Biru-406 No.5 pack suggests duplicate listing of pos4328 or local repack; brand attribution unresolved this session; needs supplier confirmation"); r[0], r[1], r[2] = "4534","SHH-HOOK-406-NO.5","PKT"; A(r)
# ord608
r = rej("q:nickel-snap-swivel family probe shared with pos4754",
        "generic_unbranded: nickel snap swivel No.4 commodity fishing tackle; same family"); r[0], r[1], r[2] = "4537","SHH-SWIVEL-SNAP-NO.4","PKT"; A(r)
# ord609
r = rej("q:yg239r-brass shared with pos5882(ordinal551)",
        "generic_unbranded: YG239R reduced mxf brass socket 1/2x1/4; YG-prefix code unattributable; commodity fitting"); r[0], r[1], r[2] = "5779","FIT-YG239R-SOC-MXF-1/2\"X1/4\"-BRA","PCS"; r[12]=CAT; A(r)
# ord610
r = rej("q:goldenelephant-mopdisc='Gold Elephant mop disc 4x120'->SERP junk(gold price) archived; p:oem-probe goldelephant.com.my DNS-fail",
        "generic_house_import: Gold Elephant scouring mop disc 4inx120g; household abrasive commodity, brand unattributable online"); r[0], r[1], r[2] = "4549","CUT-ELE-EDM-41200","PCS"; r[12]=CAT; A(r)
# ord611
r = rej("q:nickel-snap-swivel family probe shared with pos4754",
        "generic_unbranded: nickel snap swivel No.10 commodity fishing tackle; same family"); r[0], r[1], r[2] = "4839","SHH-SWIVEL-SNAP-NO.10","PKT"; A(r)
# ord612
r = pen("q:hytac-12146bn='Hytac hook 12146BN'->SERP junk(walmart) archived; p:oem-probe hytac.com.my DNS-fail",
        "Hytac MY fishing-hook brand real in trade; 12146BN No.10 20s pack no OEM page verifiable this session"); r[0], r[1], r[2] = "5080","SHH-HOOK-12146BN-10","PKT"; A(r)
# ord613
r = rej("q:yg225-bush='YG225 brass bushing reducer'",
        "generic_unbranded: YG225 brass reducing bushing 1/2x3/8; YG-prefix code unattributable; commodity fitting"); r[0], r[1], r[2] = "6196","FIT-YG225-BUSH-1/2\"X3/8\"-BRA","PCS"; r[12]=CAT; A(r)
# ord614
r = rej("q:lamp-holder-2727hd='2727HD E27 lamp holder'",
        "generic_unbranded: E27-to-E27 lamp holder extender; 2727HD=supplier sku; commodity lighting accessory"); r[0], r[1], r[2] = "2760","ELE-HOL-2727HD-E27","PCS"; r[12]=CAT; A(r)
# ord615
r = rej("q:adaptor-ee1427='EE1427 E14 to E27 adaptor'->SERP junk(yahoo-jp) archived",
        "generic_unbranded: E14-to-E27 screw adaptor; EE1427=supplier sku; commodity lighting accessory"); r[0], r[1], r[2] = "2729","ELE-ADA-EE1427","PCS"; r[12]=CAT; A(r)
# ord616
r = rej("q:nickel-snap-swivel family probe shared with pos4754",
        "generic_unbranded: nickel barrel swivel No.10 commodity fishing tackle; same family"); r[0], r[1], r[2] = "5214","SHH-SWIVEL-NO.10","PKT"; A(r)
# ord617
r = rej("q:nickel-snap-swivel family probe shared with pos4754",
        "generic_unbranded: nickel barrel swivel No.12 commodity fishing tackle; same family"); r[0], r[1], r[2] = "5215","SHH-SWIVEL-NO.12","PKT"; A(r)
# ord618
r = rej("q:blimax-clamp8 family probe='Blimax quick release clamp' covers Blimax house-brand tools",
        "generic_house_brand: Blimax HSS twist drill bit 1/4in(6.5mm); sibling precedent: Blimax=house/distributor brand spanning unrelated categories(clamp+hammer+drill), no OEM site; commodity bit"); r[0], r[1], r[2] = "6275","DRI-HSS-TWI-06MM","PCS"; r[12]=CAT; A(r)
# ord619
r = rej("q:external-cap-25mm='round external chair leg cap 25mm'",
        "generic_unbranded: round external plastic ferrule cap 25mm 4pcs pack; commodity furniture cap"); r[0], r[1], r[2] = "2772","CHA-CAP-ROU-EXT-25MM","PCK"; r[12]=CAT; A(r)
# ord620
r = rej("q:csk-selftap-screw='countersunk self tapping screw 8 x 5/8 flat head'",
        "generic_unbranded: CSK flat-head self-tapping screws 8x5/8in 20pcs pack; commodity fastener pack"); r[0], r[1], r[2] = "6889","FAS-SCR-TAP-CSK-8#5/8\"-PCK","PACK"; r[12]=CAT; A(r)
# ord621
r = pen("q:mlcable-red15='ML cable 1.5mm PVC red Malaysia'->SERP junk archived; p:oem-probe mlcable.com.my DNS-fail",
        "ML-brand PVC insulated cable red 1.5mm2 100m roll: ML house-brand suspicion (spans cable+night-light pos5254), no OEM/authorised page verifiable this session"); r[0], r[1], r[2] = "3009","ELE-CAB-WIR-ML-1.5MM2-RED","ROLL"; A(r)
# ord622
r = pen("q:mcl-caster-dl5='MCL caster DL5 heavy duty Malaysia'; p:oem-probe mclcasters.com DNS-fail",
        "MCL caster DL5 series 6in heavy-duty swivel: MCL caster trade brand unattributable online this session"); r[0], r[1], r[2] = "2632","IND-CAS-H/DUTY-MCLSC-6\"","PCS"; A(r)
# ord623
r = pen("q:lionking-screw-ds516how='DS516HOW Lion King self drilling screw'; p:oem-probe lionking.com.my DNS-fail",
        "Lion King MY self-drilling screw brand real in trade; DS516HOW box page not locatable this session"); r[0], r[1], r[2] = "3448","FAS-SCR-DS516HOW-BOX","BOX"; A(r)
# ord624
r = pen("q:elegance-e20ab(bing junk)+oem-path: retouch.my official Broadlink site FULLY swept - all 18 Elegance PDPs enumerated(productids 5703695..5703965) + black-series sockets CODE-table lists only E0815B / E0813A+CUSBB; E08213B ABSENT from every code table",
        "Elegance=Broadlink 'Sense's' series proven real via retouch.my but exact model E08213B not present on official site this session; needs supplier confirmation whether older/newer series"); r[0], r[1], r[2] = "3958","SWI-SOC-ELE-E08213B","PCS"; A(r)
# ord625
r = pen("q:colex-ta401/colex-za401 shared probes; p:colex.com.sg empty posts-index",
        "Colex ZK-502 chrome padlock set: same unattributed state as other Colex padlocks this session"); r[0], r[1], r[2] = "2873","LOC-COL-ZK502","SET"; A(r)

with open(OUT, "a", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    for r in rows: w.writerow(r)
print("appended chunk3:", len(rows))
