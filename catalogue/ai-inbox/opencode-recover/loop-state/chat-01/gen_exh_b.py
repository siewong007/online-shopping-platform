import csv, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(BASE, "exhaust-batch-B.csv")
OUT = os.path.join(BASE, "exh-B.csv")

SEARCH_OK = False  # websearch 429 x6 (~12min); bing-html/rss junk x3; ddg/mojeek captcha

# source_position -> (query, kind, note)   kind: 'c'=unbranded commodity, 'b'=brand/model token present
M = {
    6141: ("E27 porcelain lamp holder wire Malaysia", "c", ""),
    4431: ("pemberat pancing no 4 Malaysia", "c", ""),
    3884: ("stainless steel bolt A2 304 M12 Malaysia", "c", ""),
    3624: ("pemegang almari PVC handle Malaysia", "c", ""),
    2643: ("Hermanns ENS spiral 25W lamp Malaysia", "b", "house-brand lamp family (Hermanns/HMS)"),
    3272: ("black PE plastic bag 30x40 packaging Malaysia", "c", ""),
    2925: ("SMR F380 paint roller frame 7 inch Malaysia", "b", "roller-frame code F380 unresolved"),
    3825: ("huizhu huangxin frog lure spinner 10898H", "b", "CN OEM fishing-lure tokens only"),
    5068: ("HDPE tee male 25mm x 1/2 Malaysia", "c", ""),
    3781: ("HMS downlight HGD604 18W 6500K", "b", "house-brand downlight (Hermanns/HMS family)"),
    3998: ("HMS downlight HGD604 18W 6500K", "b", "same downlight family as 3781 (HSP-301 variant)"),
    3849: ("pemberat pancing no 4 Malaysia", "c", ""),
    4119: ("benang pancing putih no.120 Malaysia", "c", "(sf) house-label mother line"),
    4427: ("benang pancing putih no.120 Malaysia", "c", "(bs) house-label mother line"),
    4204: ("radiator paint brush 2 inch Malaysia", "c", ""),
    4428: ("benang pancing putih no.120 Malaysia", "c", "(bs) house-label mother line"),
    1100: ("Glotool sun shade netting 50%", "b", ""),
    4187: ("stainless steel bolt A2 304 M12 Malaysia", "c", ""),
    6815: ("13A switch socket 2-gang box Malaysia", "c", ""),
    5152: ("spandek screw adaptor M10x65 Malaysia", "c", ""),
    3028: ("kunci camlock almari 30mm Malaysia", "c", ""),
    4484: ("benang pancing putih no.120 Malaysia", "c", "(bs) house-label mother line"),
    4485: ("benang pancing putih no.120 Malaysia", "c", "(bs) house-label mother line"),
    4278: ("galvanised G.I bolt nut pack 1/4 inch Malaysia", "c", "SR shop-prefix packs"),
    6449: ("paku besi galvani 3 inci Malaysia", "c", ""),
    6441: ("PVC elbow 40mm 1.5 inch fittings Malaysia", "c", ""),
    3466: ("double divider valve 6mm pneumatic Malaysia", "c", ""),
    4613: ("paku atap twist galvanised 65mm Malaysia", "c", ""),
    3538: ("garden hose PVC green 16mm Malaysia", "c", "BR-code trade hose"),
    4094: ("Atlas handpad maroon 6x9 Malaysia", "b", ""),
    4589: ("benang pancing putih no.120 Malaysia", "c", "(bs) house-label mother line"),
    5605: ("battery clip 50 amp heavy duty Malaysia", "c", ""),
    4021: ("stainless steel bolt A2 304 M12 Malaysia", "c", ""),
    3114: ("Blimax quick release F clamp 12 inch", "b", ""),
    4813: ("Tajima TTC8 magnetic nut driver M8", "b", "real JP brand; no .my OEM page resolvable this session"),
    5180: ("Blimax 2-way screwdriver 1/2 Malaysia", "b", ""),
    5165: ("brass equal elbow 3/8 YG232 Malaysia", "c", "YG-series trade fittings"),
    3167: ("Target 9007 camlock 16mm cabinet lock", "c", ""),
    3647: ("brass reduced nipple 3/8 x 1/4 YG228R Malaysia", "c", ""),
    5954: ("BSW spring washer 3/4 Malaysia", "c", ""),
    6630: ("paku besi galvani 2 inci Malaysia", "c", ""),
    3620: ("Aerico 4MC8", "b", "token unresolvable on any reachable engine"),
    4693: ("pemberat pancing hole sinker Malaysia", "c", ""),
    5906: ("brass bushing 3/8 x 1/4 YG225 Malaysia", "c", ""),
    4192: ("stainless steel hose clip 52-76mm Malaysia", "c", ""),
    6329: ("water meter rubber washer 1/2 inch Malaysia", "c", ""),
    4928: ("ceiling rose lamp 408A Malaysia", "c", ""),
    5587: ("Hunter BK drywall screw bugle head Malaysia", "b", "Hunter/BK distributor token"),
    2823: ("kasut hujan getah Malaysia", "c", "local-made rubber rain boots"),
    5460: ("rectifier SQL-100A 1200V Malaysia", "c", ""),
    3213: ("Blimax claw hammer 27mm Malaysia", "b", ""),
    4407: ("Blimax TCT saw blade 4 inch 30T", "b", ""),
    4592: ("stainless steel waste 2.1/2 A110 Malaysia", "c", ""),
    4705: ("GW5 wood drill bit set 5pcs", "c", "generic set code"),
    3752: ("CR1220 lithium battery 3V Malaysia", "c", ""),
    3848: ("mata kail galah hook 4206 Malaysia", "c", "house-code hooks (20's pkt)"),
    3877: ("double open end wrench 10x12mm Malaysia", "c", ""),
    3015: ("C222 tap cartridge spare Malaysia", "c", ""),
    4162: ("homotile KV910 12x12 floor tile Malaysia", "c", ""),
    5785: ("tufting nail round plate 16mm sofa Malaysia", "c", ""),
    5784: ("tufting nail round plate 16mm sofa Malaysia", "c", ""),
    2800: ("kasut hujan getah Malaysia", "c", ""),
    2625: ("cushion grip screwdriver 1/4 x 5 inch Malaysia", "c", ""),
    3930: ("mata kail galah hook 4206 Malaysia", "c", ""),
    4430: ("pemberat pancing hole sinker Malaysia", "c", ""),
    2876: ("kasut hujan getah Malaysia", "c", ""),
    4034: ("tbag plastic bag 15x18 white Malaysia", "c", ""),
    5389: ("cable lug 10-8 ring terminal Malaysia", "c", ""),
    4033: ("tbag plastic bag 15x18 white Malaysia", "c", ""),
    4107: ("PVC apron yellow 24x36 inch Malaysia", "c", ""),
    5582: ("cable lug 25-8 ring terminal Malaysia", "c", ""),
    3513: ("galvanised G.I bolt nut pack 1/4 inch Malaysia", "c", "SR shop-prefix packs"),
    5477: ("SS hex bushing 3/4 x 1/2 SUS304 fitting Malaysia", "c", ""),
    5802: ("grease nipple 90 degree M10x1.0 Malaysia", "c", "S.K trade prefix"),
    5696: ("brass socket MXF 1/2 x 3/8 YG239R Malaysia", "c", ""),
    5882: ("box bit socket 13x65mm Malaysia", "c", ""),
    4754: ("nickel snap swivel no 8 fishing Malaysia", "c", ""),
    6065: ("cable lug 1.5-5 ring terminal Malaysia", "c", ""),
    3893: ("T brass connector 10mm YG251A Malaysia", "c", ""),
    3892: ("Y brass connector 8mm YG251 Malaysia", "c", ""),
    4954: ("India junior hacksaw blade 14 inch Malaysia", "c", "SR shop-prefix"),
    4358: ("galvanised G.I bolt nut pack 3/16 inch Malaysia", "c", "SR shop-prefix packs"),
    6249: ("battery clip 50 amp heavy duty Malaysia", "c", ""),
    6434: ("BSW spring washer 3/4 Malaysia", "c", ""),
    6601: ("BSW spring washer 3/4 Malaysia", "c", ""),
    4818: ("galvanised G.I bolt nut pack 3/16 inch Malaysia", "c", "SR shop-prefix packs"),
    2910: ("kasut hujan getah Malaysia", "c", ""),
    3055: ("ST22 air wheel caster Malaysia", "c", ""),
    2929: ("W815 by-pass pruner 200mm Malaysia", "c", ""),
    3257: ("G785 stainless shelf bracket 8 inch Malaysia", "c", ""),
    3436: ("Korakoh rain shoes black Malaysia", "b", "local maker label Korakoh"),
    3380: ("kasut hujan getah Malaysia", "c", ""),
    3381: ("kasut hujan getah Malaysia", "c", ""),
    3456: ("kasut hujan getah Malaysia", "c", ""),
    2614: ("cho-low level system handle wardrobe metal Malaysia", "c", ""),
    4662: ("PI7 hose fitting 103 Malaysia", "c", ""),
    3798: ("double open end wrench 10x12mm Malaysia", "c", ""),
    3230: ("paku atap twist galvanised 65mm Malaysia", "c", ""),
    5226: ("T&T 2-way auger bit 8mm Malaysia", "b", "local trade brand T&T"),
    2721: ("bow shackle G209 pin type 12mm Malaysia", "c", ""),
    3643: ("galvanised G.I bolt nut pack 1/4 inch Malaysia", "c", "SR shop-prefix packs"),
    3397: ("round cable clip 18mm Malaysia", "c", ""),
    4421: ("jaring burung hitam bird netting Malaysia", "c", ""),
    4459: ("nickel snap swivel no 8 fishing Malaysia", "c", ""),
    4537: ("nickel snap swivel no 8 fishing Malaysia", "c", ""),
    4839: ("nickel snap swivel no 8 fishing Malaysia", "c", ""),
    5779: ("brass socket MXF 1/2 x 3/8 YG239R Malaysia", "c", ""),
    4549: ("Gold Elephant mop disc 4 x 120", "b", "regional abrasive label"),
    6196: ("brass bushing 3/8 x 1/4 YG225 Malaysia", "c", ""),
    2760: ("E27 to E27 lamp holder extender Malaysia", "c", ""),
    2729: ("E14 to E27 lamp adaptor Malaysia", "c", ""),
    5214: ("nickel swivel no 10 fishing Malaysia", "c", ""),
    5215: ("nickel swivel no 12 fishing Malaysia", "c", ""),
    6275: ("Blimax HSS twist drill 6mm 1/4", "b", ""),
    2772: ("round external end cap 25mm Malaysia", "c", ""),
    6889: ("CSK self tapping screw flat head 8 x 5/8 Malaysia", "c", ""),
    4053: ("brass stop cock 18mm C018 Malaysia", "c", ""),
    2692: ("Speed flat water level 3801 24 inch Malaysia", "b", "trade brand Speed"),
    3616: ("Blimax quick release F clamp 12 inch", "b", ""),
    2691: ("Speed flat water level 3801 24 inch Malaysia", "b", "trade brand Speed (18in variant)"),
    2742: ("2x2 vinyl floor tile CB6061 Malaysia", "c", ""),
    3568: ("clip-on elastic safety vest lemon green Malaysia", "c", ""),
    2715: ("cakar sawit oil palm rake 12T Malaysia", "c", "local-made plantation tool"),
    2712: ("drain cleaner powder salur tersumbat Malaysia", "c", ""),
    4889: ("cable lug 500AMP white Malaysia", "c", ""),
    4058: ("fixed caster DL5 2 inch Malaysia", "c", ""),
}

BLOCK_NOTE = (
    "websearch 429 x6 over ~12min; bing-html+rss fallback junk x3 "
    "(query terms ignored); ddg-html captcha; mojeek captcha"
)

def reason_for(pos, q, kind, note):
    if SEARCH_OK:
        raise SystemExit("success branch not wired - search never recovered")
    if kind == "c":
        t3 = "t3:n/a-commodity-no-brand(confirmatory-probe-blocked)"
        extra = "; %s" % note if note else ""
    else:
        t3 = "t3:bing_blocked"
        extra = "; %s; %s" % (note, BLOCK_NOTE) if note else "; %s" % BLOCK_NOTE
    return (
        'q:"%s"(engines-blocked-this-session) ; tier1:no-oem-found ; %s%s '
        '; t4:no-prior-url-to-archive '
        '; t5:shoot-in-store(house-label/generic; no matching supplier in supplier-permission-contacts.csv)'
    ) % (q, t3, extra)

def main():
    with open(IN, newline="", encoding="utf-8-sig") as f:
        src = list(csv.DictReader(f))
    missing = [r["source_position"] for r in src if int(r["source_position"]) not in M]
    if missing:
        sys.exit("unmapped rows: %s" % missing)
    hdr = ["source_position","item_code","uom","official_product_page","official_image_url",
           "researcher_decision","match_confidence","finish_exact","model_exact",
           "uom_assessment","rights_status","reason","human_action"]
    n = 0
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(hdr)
        f.flush()
        for r in src:
            pos = int(r["source_position"])
            q, kind, note = M[pos]
            w.writerow([
                r["source_position"], r["item_code"], r["uom"],
                "", "",                       # official_product_page, official_image_url
                "exhausted",                  # researcher_decision
                "R",                          # match_confidence
                "n/a", "n/a",                 # finish_exact, model_exact
                "n/a-no-listing-found",       # uom_assessment
                "no_asset",                   # rights_status
                reason_for(pos, q, kind, note),
                "shoot in-store",
            ])
            n += 1
            if n % 25 == 0:
                f.flush()
                print("partial write at row %d" % n)
        f.flush()
    print("done: %d rows -> %s" % (n, OUT))

if __name__ == "__main__":
    main()
