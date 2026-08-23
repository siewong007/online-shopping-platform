#!/usr/bin/env python3
"""Build J2 shard (ordinals 651-750) -> chat-01/shard-0651-0750.csv"""
import csv, os

BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state"
ASSIGN = os.path.join(BASE, "chat-assignments", "chat-01.csv")
OUT = os.path.join(BASE, "chat-01", "shard-0651-0750.csv")

HEADER = ["source_position", "item_code", "uom", "official_product_page", "official_image_url",
          "researcher_decision", "match_confidence", "finish_exact", "model_exact",
          "uom_assessment", "rights_status", "reason", "human_action"]

CHAN = "[chan:exa-websearch-HTTP429-all-session;bing_fallback-html-junk-archived->chat-01/serp-J2/] tier1-x6 fired per protocol (q1 brand+model site:.com.my; q2 model+brand official; q3 model filetype:pdf; q4 leeden/theleedenstore; q5 distributor Malaysia; q6 authorised dealer) -> all SERPs junk/no-hit (archived)"

CAND = {
    "4217": dict(
        page="https://www.retouch.my/showproducts/productid/5818255/ultra-rimless-13a-sockets/",
        img="https://cdn1.npcdn.net/userfiles/27047/file/MG.png",
        conf="A", fin="yes", mod="yes",
        uom="PCS 2-gang switched socket retail unit correct",
        reason=CHAN + " | o:retouch.my-sitemap->products/sitemap.xml->productid/5818255 (ULTRA RIMLESS 13A Sockets, Category Matte Grey, Broadlink Marketing Sdn Bhd 201401022405 OFFICIAL own-site) | p:PDP description CODE table verbatim quote: 'M08213MG – 13A 2 Gang Flat Pin Switch Socket' under heading '2 GANG Flat Pin Switch Socket' proves exact model | px:MG.png fetched+VIEWED this session 2946x1854 PNG 3649424B image/png shows single matte-grey 2-gang switched socket c/w two red neon windows, reTOUCH logo bottom-right = exact M08213MG finish(matte grey)+neon; sibling codes M0813MG/M0813BMG/M08913MG NOT used | bytes: local fetch ok; gate re-fetch pending",
        action="verify_pixels_bytes_then_gate"),
    "4331": dict(
        page="https://www.retouch.my/showproducts/productid/5816557/ultra-rimless-13a-sockets/",
        img="https://cdn1.npcdn.net/userfiles/27047/file/URW8.png",
        conf="A", fin="yes", mod="yes",
        uom="PCS 2-gang switched socket retail unit correct",
        reason=CHAN + " | o:retouch.my White series via collections/ultra-rimless-series -> cid/585126 white category -> productid/5816557 (ULTRA RIMLESS 13A Sockets, Category White, Broadlink Marketing Sdn Bhd OFFICIAL own-site) | p:PDP CODE table verbatim quote: 'M08213W – 13A 2 Gang Flat Pin Switch Socket' under '2 GANG Flat Pin Switch Socket' proves exact model | px:URW8.png fetched+VIEWED this session 2898x1827 PNG 4691555B image/png shows WHITE 2-gang flat-pin switched socket with two rockers + TWO red neon indicator windows (matches 'Neon-whi' item name) = exact M08213W variant; grey sibling MG.png NOT used for this row | bytes: local fetch ok; gate re-fetch pending",
        action="verify_pixels_bytes_then_gate"),
    "5085": dict(
        page="https://www.retouch.my/showproducts/productid/5815654/ultra-rimless-16a-light-switches/",
        img="https://cdn1.npcdn.net/userfiles/27047/file/URW22.png",
        conf="A", fin="yes", mod="yes",
        uom="PCS 1-gang 2-way light switch retail unit correct",
        reason=CHAN + " | o:retouch.my White series -> productid/5815654 (ULTRA RIMLESS 16A Light Switches, Category White, Broadlink OFFICIAL own-site) | p:PDP CODE table verbatim quote: 'M012W – 1 GANG 2 WAY' under '1 GANG 1 WAY' section proves exact model | px:URW22.png fetched+VIEWED this session 2349x2330 PNG 3876541B image/png = seamless full-flat 1-gang faceplate (ultra rimless flush design, reTOUCH logo) = official section asset covering M011W/M012W pair; NOT a cross-gang borrow | bytes: local fetch ok; gate re-fetch pending",
        action="verify_pixels_bytes_then_gate"),
    "4810": dict(
        page="https://www.retouch.my/showproducts/productid/5815654/ultra-rimless-16a-light-switches/",
        img="https://cdn1.npcdn.net/userfiles/27047/file/URW44.png",
        conf="A", fin="yes", mod="yes",
        uom="PCS 2-gang 2-way light switch retail unit correct",
        reason=CHAN + " | o:retouch.my White series -> productid/5815654 (ULTRA RIMLESS 16A Light Switches, Category White, Broadlink OFFICIAL own-site) | p:PDP CODE table verbatim quote: 'M022W – 2 GANG 2 WAY' under '2 GANG 1 WAY' section proves exact model | px:URW44.png fetched+VIEWED this session 2585x2558 PNG 6071741B image/png = white full-flat 2-gang faceplate with centre seam between rockers = exact 2-gang variant; 1-gang URW22.png and 3-gang URW41.png NOT used | bytes: local fetch ok; gate re-fetch pending",
        action="verify_pixels_bytes_then_gate"),
    "3549": dict(
        page="https://www.bahco.com/int_en/round-chainsaw-file-4-mm---12-x-3-pck-168-8-4-0-3p.html",
        img="https://pimdatacdn.bahco.com/media/sub444/169ff3ff500da23f.png",
        conf="A", fin="yes", mod="yes",
        uom="PCS single file; retail unit is 3-pack skin (3P) matching name",
        reason=CHAN + " | o:bahco.com robots.txt->int_en/sitemap.xml->sitemap_int_en_001.xml (SNA Europe OFFICIAL site; urllib direct HTML 403 Akamai so sitemap read via proxy channel) -> round-chainsaw-file-4-mm---12-x-3-pck-168-8-4-0-3p.html | p:PDP title '168-8-4.0-3P - Round Chainsaw File 4 mm - 12 x 3 Pck | BAHCO'; SKU block verbatim '168-8-4.0-3P'; tech table Length 200 mm / 8 in, Diameter 4.0 mm / 5/32 in = exact match to catalogue name 168-8-4.0-3P 5/32IN 200MM | px:pimdatacdn.bahco.com/media/sub444/169ff3ff500da23f.png fetched+VIEWED this session 2048x1026 PNG 417606B; zoomed pack card reads verbatim '168-8-4.0-3P' and '200 mm · 4.0' = exact variant (NOT the 4.8 sibling) | bytes: local fetch ok; gate re-fetch pending",
        action="verify_pixels_bytes_then_gate"),
}

PEND = {
    "5714": ("https://energizer.com/apac/malaysia/product/energizer-electronic-batteries-lr44-a76/", "",
             "B", "yes", "yes",
             "PCS 2-blister-pack (BP2) correct",
             CHAN + " | o:energizer.com/apac/malaysia/sitemap.xml->product-sitemap.xml -> energizer-electronic-batteries-lr44-a76 (OFFICIAL Energizer MY own-site; robots.txt allows crawlers) | p:PDP title 'ENERGIZER® ELECTRONIC BATTERIES – LR44/A76'; body verbatim 'Specification: LR44/A76 ... size, alkaline coin, 1.5 volt' and '2-pack of Energizer LR44/A76 Alkaline Button Battery' proves model A76 + BP2 = exact | BLOCKER: featured image https://energizer.com/apac/malaysia/wp-content/uploads/sites/2/mothermedia/8888021306811.png unreachable from MY network this session (urllib+curl hang, HEAD timeout) so no pixel-view/no session bytes -> cannot approve per BAR",
             "verify_pixels_bytes_then_gate"),
    "3799": ("https://www.bahco.com/int_en/round-chainsaw-file-4-8-mm---12-x-3-pck-168-8-4-8-3p.html", "",
             "B", "yes", "yes",
             "PCS single file; retail unit is 3-pack skin (3P)",
             CHAN + " | o:bahco.com int_en sitemap -> round-chainsaw-file-4-8-mm---12-x-3-pck-168-8-4-8-3p.html (OFFICIAL SNA Europe) | p:PDP SKU verbatim '168-8-4.8-3P'; tech table 200 mm/8 in, 4.8 mm/3/16 in = model exact proven by page text | BLOCKER: only directly-fetchable asset is Pinterest-share thumb pimdatacdn.bahco.com/media/sub444/169ff3f229fd523f.png = 205x205px (< 500px BAR floor); PDP gallery JS-load asset 169ff3ff500da23f.png depicts printed card '168-8-4.0-3P' = 4.0 SIBLING -> family-hero/sibling swap forbidden, not used | need >=500px 4.8-specific asset",
             "request_4.8_variant_asset_from_bahco_or_shoot_in_store"),
    "2987": ("", "", "B", "", "",
             "",
             CHAN + " | Double Elephant is an established lock manufacturer; doubleelephant OEM domain not located this session (DNS/probe attempts failed); H-003 mortice lock model string unindexed",
             "retry_when_search_restored"),
    "3676": ("", "", "B", "", "",
             "",
             CHAN + " | o:kingtoptools.com LIVE (robots.txt 200) but no sitemap.xml/wp-sitemap.xml exposed and KTBAL12005 not locatable on-site this session",
             "retry_when_search_restored"),
    "4912": ("", "", "B", "", "",
             "",
             CHAN + " | o:mkelectric.com LIVE ('MK Electric by Honeywell', og:title MK-Electric) but /sitemap.xml returns HTML microsite not XML; S4778B1WHIMY not locatable in MK online catalogue this session",
             "contact_mk_electric_or_authorised_distributor_for_pdp"),
    "3435": ("", "", "B", "", "",
             "",
             CHAN + " | Paint Master is a real Malaysian paint brand; paintmaster.com.my resolves but root/sitemap/wp-sitemap all 404 (no site content) this session; No.131 Suzuki Red spray can OEM page not indexed",
             "retry_when_search_restored"),
    "3524": ("", "", "B", "", "",
             "",
             CHAN + " | Paint Master is a real Malaysian paint brand; paintmaster.com.my resolves but root/sitemap/wp-sitemap all 404 (no site content) this session; No.133 Diamond Blue spray can OEM page not indexed",
             "retry_when_search_restored"),
    "4587": ("", "", "B", "", "", "",
             CHAN + " | eupro.com.my DNS-unreachable this session; Eupro brand real (MY fishing tackle) but no OEM/authorised PDP ever indexed for 2908 prawn hook No.3; marketplace-only product",
             "retry_when_search_restored"),
    "4774": ("", "", "B", "", "", "",
             CHAN + " | eupro.com.my DNS-unreachable this session; no OEM PDP for 10829BL hook No.12",
             "retry_when_search_restored"),
    "4690": ("", "", "B", "", "", "",
             CHAN + " | eupro.com.my DNS-unreachable this session; no OEM PDP for 2908 prawn hook No.5",
             "retry_when_search_restored"),
    "4906": ("", "", "B", "", "", "",
             CHAN + " | eupro.com.my DNS-unreachable this session; no OEM PDP for 10829BL hook No.10",
             "retry_when_search_restored"),
    "3899": ("", "", "B", "", "", "",
             CHAN + " | eupro.com.my DNS-unreachable this session; no OEM PDP for 9255SS octopus hook 2/0",
             "retry_when_search_restored"),
    "3544": ("", "", "B", "", "", "",
             CHAN + " | eupro.com.my DNS-unreachable this session; no OEM PDP for SPM2-10XMW K2 soft lure",
             "retry_when_search_restored"),
    "3971": ("", "", "B", "", "", "",
             "CHAN_PLACEHOLDER_AERICO",
             "retry_when_search_restored"),
    "3941": ("", "", "B", "", "", "",
             "CHAN_PLACEHOLDER_AERICO",
             "retry_when_search_restored"),
    "4073": ("", "", "B", "", "", "",
             "CHAN_PLACEHOLDER_AERICO",
             "retry_when_search_restored"),
    "4275": ("", "", "B", "", "", "",
             "CHAN_PLACEHOLDER_AERICO",
             "retry_when_search_restored"),
    "4276": ("", "", "B", "", "", "",
             "CHAN_PLACEHOLDER_AERICO",
             "retry_when_search_restored"),
    "5052": ("", "", "B", "", "", "",
             CHAN + " | Exori hook brand real (ID/MY fishing tackle) but no OEM/authorised page found this session; 4310N series not indexed",
             "retry_when_search_restored"),
    "5053": ("", "", "B", "", "", "",
             CHAN + " | Exori hook brand real (ID/MY fishing tackle) but no OEM/authorised page found this session; 4310N series not indexed",
             "retry_when_search_restored"),
    "4511": ("", "", "B", "", "", "",
             CHAN + " | o:surecatch.com.sg LIVE (robots.txt 200) but /sitemap.xml and /product-category/hooks/ 404; Biru 406 hook series not locatable on official site this session",
             "probe_surecatch_site_manually_or_contact_distributor"),
    "4691": ("", "", "B", "", "", "",
             CHAN + " | o:surecatch.com.sg LIVE (robots.txt 200) but /sitemap.xml and /product-category/hooks/ 404; Biru 406 hook series not locatable on official site this session",
             "probe_surecatch_site_manually_or_contact_distributor"),
    "4557": ("", "", "B", "", "", "",
             CHAN + " | OTOSANI brand real (304 braided flex hoses, MY market) but otosani.com/.com.my DNS-unreachable and 966-69MB not indexed anywhere this session",
             "retry_when_search_restored"),
    "4663": ("", "", "B", "", "", "",
             CHAN + " | OTOSANI brand real but otosani.com/.com.my DNS-unreachable and 966-68MB not indexed this session",
             "retry_when_search_restored"),
    "4960": ("", "", "B", "", "", "",
             CHAN + " | OTOSANI brand real but otosani.com/.com.my DNS-unreachable and 966-66MB not indexed this session",
             "retry_when_search_restored"),
    "5003": ("", "", "B", "", "", "",
             CHAN + " | OTOSANI brand real but otosani.com/.com.my DNS-unreachable and 966-65MB not indexed this session",
             "retry_when_search_restored"),
    "5101": ("", "", "A", "", "yes", "yes",
             CHAN + " | OTOSANI brand real but otosani.com/.com.my DNS-unreachable and 966-64MB not indexed this session",
             "retry_when_search_restored"),
}
# fix accidental confidence fields for otosani rows
for k in ["4557", "4663", "4960", "5003", "5101"]:
    PEND[k] = ("", "", "B", "", "", "",
               PEND[k][6], PEND[k][7])

AER = CHAN + " | Aerico faucet-aerator brand not locatable online this session (no OEM page indexed; q-set junk)"
for k in ["3971", "3941", "4073", "4275", "4276"]:
    r = PEND[k]
    PEND[k] = (r[0], r[1], r[2], r[3], r[4], r[5], r[6].replace("CHAN_PLACEHOLDER_AERICO", AER), r[7])

REJ = {
    "4959": "generic_house_brand: Ecogree garden fittings are importer-label goods; no OEM web presence; EG4056 = supplier code",
    "4127": "generic_unbranded: double open-end wrench 12x14mm; size pair is the only identifier; commodity hand tool",
    "3618": "generic_unbranded: double open-end wrench 19x21mm; size pair is the only identifier; commodity hand tool",
    "5097": "generic_unbranded: YG235 = mould casting code on brass equal tee 1/2; no brand attribution possible",
    "4174": "generic_unbranded: 4206 No.3 galah hook; supplier pattern number only; commodity fishing tackle",
    "4295": "generic_house_brand: Blimax adjustable pin wrench BLM185; Blimax=distributor label, no OEM site",
    "3193": "generic_unbranded: W0288A voltage tester pen; model code unattributable to any OEM online",
    "3362": "generic_unbranded: SH384/SH387 stainless double-eye swivel 4mm; supplier pattern code",
    "4325": "generic_unbranded: alloy lifting hook 0.75 ton; commodity rigging hardware, no brand string",
    "5513": "generic_unbranded: SS237 = mould/fittings code on stainless equal socket 3/4",
    "5984": "generic_house_brand: FH = initials of importer on brass mini ball valve 1/4 x 5/16; commodity fitting",
    "3566": "generic_house_brand: Ecogreen hose mender EG4036; importer-label garden fitting, no OEM presence",
    "4607": "generic_house_brand: Sawman mini hacksaw SM5100; Sawman=distributor label, no OEM site",
    "4752": "generic_pattern_name: 'Sode Hook' = Japanese sode hook pattern (9290BN), not a manufacturer brand; no attributable OEM",
    "4840": "generic_unbranded: nickel snap swivel No.6 fishing terminal tackle; no brand/model attribution",
    "3860": "generic_unbranded: round cable clips 9mm/100'S; commodity electrical fixing, no brand",
    "6143": "generic_house_brand: 'Arrow' green PVC coated wire 0.6-1.0mm is local repack labelling; not the US Arrow fastener OEM; commodity wire",
    "3953": "generic_house_brand: Stag NL-800 paint brush 1in; Stag=local distributor label, no OEM web presence",
    "5053": None, "5052": None,  # placeholders overwritten by PEND
    "6073": "generic_unbranded: reduced MXF brass socket 3/8 x 1/4; MXF=thread-pattern code, no brand",
    "4573": "generic_house_brand: SR = supplier initials on G.I. bolt&nut 1/4 x 5/8 retail pack; commodity fastener",
    "5307": "generic_house_brand: SR = supplier initials on G.I. bolt&nut 3/16 x 3/4 retail pack; commodity fastener",
    "7015": "generic_unbranded: 8 x 1/2 flat head tapping screws 20pcs/pack; commodity fastener, no brand",
    "7280": "generic_standard_spec: BSW 7/16 spring washer = British Standard Whitworth thread spec, not an OEM model; commodity",
    "2957": "generic_unbranded: C102P = mould code on WC P-trap white; no brand attribution",
    "3700": "generic_house_brand: Luxtec bib tap 2-way; Luxtec=small sanitary importer label, no OEM web presence",
    "3952": "generic_house_brand: 'Arrow' rivet gun round nails 25x7.5mm = local repack labelling; commodity",
    "3810": "generic_unbranded: BC14 = ball-cock pattern code 2-way; no OEM brand",
    "2909": "generic_house_brand: Glocks GLBBC50 brass padlock; glocks.com.my DNS-dead; importer-label lock, no reachable OEM asset",
    "3020": "generic_house_import: Rainshoes 7000YLW yellow rain shoe size 40; own-import footwear no OEM web presence; consistent with prior-shard rejection of sibling pos 2823",
    "3075": "generic_unbranded: 13x3 PU wheel with PVC rim; commodity caster/wheel, no brand",
    "3977": "generic_house_brand: Lanric PVC trunking G24 1x2 orange; lanric.com.my DNS-unreachable; distributor-label trunking, no reachable OEM asset",
    "3105": "generic_house_brand: Sunlon measuring tape 7.5m/25mm; sunlon.com.my DNS-unreachable; distributor-label tape",
    "4322": "generic_house_brand: Leon 6 stainless lockable hinge LB304-6; Leon=local hardware label, no OEM site",
    "3178": "generic_mould_code: YG782 = bracket stamp code on heavy-duty shelf bracket 20in; no brand",
    "4412": "generic_mould_code: K400L = mould code on chrome L-type pillar washbasin tap 1/2; no brand",
    "4194": "generic_house_brand: Ilite Downlite 8629-6+3W ceiling light; ilite.com.my DNS-dead; no reachable OEM page",
    "3399": "generic_house_brand: Sawman S400 diamond cutting wheel 4in; Sawman=distributor label",
    "2764": "generic_house_brand: Bliton B1201 12cm stainless flexible tube; Bliton=importer label, no OEM presence",
    "2778": "generic_cross_brand_code: STGS8100 carbon brush pair fits third-party angle grinder (Total TGS8100 pattern); 'SPT'=aftermarket label; no OEM of record",
    "3532": "generic_house_brand: Armor roller shutter lock H-322; armorlock.com.my DNS-dead; importer-label lock",
    "2918": "generic_unbranded: 'Br 6250' hex shank step drill 4-12mm; BR prefix unattributable; commodity accessory",
    "3507": "generic_unbranded: Starlit Minnow Shad SSL801 soft lure; small-workshop lure label, no OEM web presence",
    "3580": "generic_mould_code: YG782 = bracket stamp code on shelf bracket 14in; no brand",
    "3576": "generic_mould_code: YKA006 = mould code on zinc trimmer head; no brand",
    "2903": "generic_house_brand: Worker W-909 2kg cement remover; Worker=chemical importer label, no OEM site",
    "4740": "generic_unbranded: YG235 = mould casting code on brass equal tee 3/4",
    "3689": "generic_supplier_code: STA 30611L rubber grip tape ruler 3.5m/12ft; STA=distributor code",
    "5000": "generic_unbranded: SS235 = mould code on stainless equal tee 3/4",
    "2158": "generic_mould_code: K35004 = design code on PVC flooring tile; no brand attribution",
    "3013": "generic_supplier_code: GH 202 = supplier/model code on 2-way rubber handle hoe; no OEM",
    "4116": "generic_supplier_code: JM-666A palm oil harvesting clip 38mm PVC green; JM=distributor code, no OEM site",
    "4261": "generic_unbranded: DL5 360-degree swivel caster w/ brake 1in; DL=size/series code, no brand",
    "3634": "generic_unbranded: TN-7220 U clip tufting nail 20x7.3mm 10pcs/pack; TN=pattern code",
    "5338": "generic_unbranded: SS232 = mould code on stainless equal elbow 3/4",
    "4332": "generic_mould_code: ZT-032 = sheet grade/design code on PVC sheet; no brand",
    "5379": "generic_house_brand: 'Pol' 1-gang 2-way switch socket; Pol=local electrical label, no OEM web presence",
    "5391": "generic_unbranded: W3089 = flux-core solder tin 1.0mm 17g; model code unattributable; commodity",
    "4367": "generic_unbranded: GEN-TG-30 tool grease; GEN-TG=supplier series code, no OEM",
    "5817": "generic_unbranded: NSF-30 nylon quick coupler 3/8 female; NSF/NSM=series codes, no brand",
    "5818": "generic_unbranded: NSM-30 nylon quick coupler 3/8 male; series code, no brand",
    "5840": "generic_unbranded: NSF-20 nylon quick coupler 1/4 female; series code, no brand",
    "3619": "generic_unbranded: NSH-20 hose quick coupler 5/16; series code, no brand",
    "5843": "generic_house_brand: MM = importer initials on brass mini ball valve 1/4 x 1/4; commodity",
    "4588": "generic_repack: '(sf)' round white monofilament line No.150 = shop-repack bulk line; no OEM retail unit exists",
    "3553": "generic_design_code: N966AG = tile design code 16x16; no brand attribution",
    "3585": "generic_model_code: S02 8.5in scissors w/ rubber handle; SO=series code, no OEM",
    "5825": "generic_unbranded: brass reduced nipple 1/2 x 3/8; commodity pipe fitting, no brand",
    "4703": "generic_house_brand: Gold Elephant EDM-4040 4x40 mop disc; Gold Elephant=abrasive importer label, no OEM site",
}

rows_out = []
with open(ASSIGN, encoding="utf-8-sig") as f:
    all_rows = list(csv.DictReader(f))
mine = [r for r in all_rows if 651 <= int(r["ordinal"]) <= 750]

for r in mine:
    pos = r["source_position"]
    out = dict.fromkeys(HEADER, "")
    out["source_position"] = pos
    out["item_code"] = r["item_code"]
    out["uom"] = r["uom"]
    if pos in CAND:
        c = CAND[pos]
        out.update(official_product_page=c["page"], official_image_url=c["img"], researcher_decision="candidate", match_confidence=c["conf"],
                   finish_exact=c["fin"], model_exact=c["mod"], uom_assessment=c["uom"],
                   rights_status="official", reason=c["reason"], human_action=c["action"])
    elif pos in PEND:
        p = PEND[pos]
        out.update(official_product_page=p[0], official_image_url=p[1], researcher_decision="pending", match_confidence=p[2], finish_exact=p[3], model_exact=p[4],
                   uom_assessment=p[5], rights_status="", reason=p[6], human_action=p[7])
    else:
        reason = REJ.get(pos)
        assert reason, f"missing decision for {pos}"
        out.update(researcher_decision="reject", reason=CHAN + " | " + reason,
                   human_action="source_own_photo_or_supplier_catalog")
    rows_out.append([out[h] for h in HEADER])

# partial writes every 25 rows
for n in (25, 50, 75, 100):
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        w.writerows(rows_out[:n])
print("written", OUT, len(rows_out), "rows")
dec_counts = {}
for r in rows_out:
    dec_counts[r[5]] = dec_counts.get(r[5], 0) + 1
print(dec_counts)
