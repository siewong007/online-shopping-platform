"""Generate shard-1110-1139.csv (chat-02) - researcher output, csv.writer."""
import csv, os, sys

OUT = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\shard-1110-1139.csv"
HDR = ["source_position","item_code","uom","display_name","category","detected_brand",
       "detected_model","state","round_first_seen","round_last_touched","tiers_tried",
       "official_product_page","official_image_url","image_px_w","image_px_h","image_bytes",
       "image_sha256","match_confidence","finish_exact","model_exact","uom_assessment",
       "rights_status","researcher_decision","verifier_verdict","machine_gate","reason","human_action"]

INFRA = ("infra: shared websearch worked for first queries then HTTP429 (quota shared by nine chats, retries capped per brief); "
         "Bing RSS returned canned unrelated results for every query session-wide; DDG lite captcha-walled (14KB shell, zero links); "
         "working channels were direct OEM-domain probes and Wayback CDX")

def row(pos, ic, uom, name, cat, brand, model, st, tiers, page, img, pw, ph, pb,
        sha, conf, fin, mex, uom_a, rights, dec, reason, act):
    return [pos, ic, uom, name, cat, brand, model, st, "1", "1", tiers, page, img,
            pw, ph, pb, sha, conf, fin, mex, uom_a, rights, dec, "", "", reason, act]

rows = []

# ---------------- CANDIDATES ----------------
P5343 = "http://web.archive.org/web/20260519012539/https://www.hardexworld.com/index.php?ws=showproducts&products_id=2553252&cat=REPAIR-MAINTENANCE&lang=en"
I5343 = "https://cdn1.npcdn.net/image/1559617303032d525f8842aae59a0bd22e9ff6f836.png?md5id=ec97b3455d25310a00e49c9abf0633a1&new_width=1200&new_height=1200&size=max&w=1567133447"
rows.append(row(
    "5343", 'GUM-HAR-HE4252', "PCS", "Valve Griding Paste: Hardex HE4252(C)", "Plumbing",
    "", "HE4252", "candidate", "T1,T4", P5343, I5343, 324, 620, 241689,
    "7626319476d217bf4e32a6a63a6ca2c0c3c11a6273081090ce77a0a9d89e6b11",
    "high", "yes", "yes", "match", "unknown", "keep",
    INFRA + " | q:\"Hardex HE4252 valve grinding paste\" (websearch) -> official OEM hardexworld.com PDP products_id=2553252 titled VALVE GRINDING PASTE NO 2 (Coarse Grade) HE 4252 | p:live www.hardexworld.com serves 'This site is currently under maintenance.' (soft-down, 68 chars) | p:" + P5343 + " Wayback snapshot 20260519012539 cached, HE4252 present in page text (precheck True), real product signals (product title/spec block) | p:" + I5343 + " OEM product asset from hardexworld site CDN fetched 200 image/png 324x620px 241689B sha256=7626319476d217bf4e32a6a63a6ca2c0c3c11a6273081090ce77a0a9d89e6b11; distinct file from sibling HE4251 (no family-hero reuse). action=search",
    ""))

P5342 = "http://web.archive.org/web/20260519000700id_/https://www.hardexworld.com/index.php?ws=showproducts&products_id=2553251&cat=REPAIR-MAINTENANCE&lang=en"
I5342 = "https://cdn1.npcdn.net/image/1559617303450c97a99e0e8858c2c19c35251c4748.png?new_width=1200&new_height=1200&size=max"
rows.append(row(
    "5342", 'GUM-HAR-HE4251', "PCS", "Valve Griding Paste: Hardex HE4251(F)", "Plumbing",
    "", "HE4251", "candidate", "T1,T4", P5342, I5342, 324, 620, 221880,
    "cf23229c2ed5918f0cb200614775ceee5e249bb69aa89a5cdca4db7408f9230a",
    "high", "yes", "yes", "match", "unknown", "keep",
    INFRA + " | q:T2 sibling-id probe: HE4251 adjacent products_id on hardexworld REPAIR-MAINTENANCE category (CDX filter 25532xx) -> 2553251 | p:" + P5342 + " Wayback snapshot 20260519000700 cached, page titled HE 4251 REPAIR MAINTENANCE (Hardex Kuantan manufacturer page signals), HE4251 present (precheck True) | p:" + I5342 + " OEM product asset from hardexworld site CDN fetched 200 image/png 324x620px 221880B sha256=cf23229c2ed5918f0cb200614775ceee5e249bb69aa89a5cdca4db7408f9230a; distinct sha from HE4252 sibling (no family-photo reuse). action=search",
    ""))

# ---------------- EXHAUSTED ----------------
def ex(pos, ic, uom, name, cat, brand, model, tiers, reason, act):
    rows.append(row(pos, ic, uom, name, cat, brand, model, "exhausted", tiers,
                    "", "", "", "", "", "", "", "no", "no", "match", "no_asset",
                    "exhausted", reason, act))

ex("3415", "TOO-SCR-EXT-W0612", "SET", "6PCS Screw Extractor", "Fasteners & Fixings", "", "W0612", "T1,T5",
   INFRA + " | q:[bingrss-junk]'W0612' screw extractor (returned unrelated catalog noise) | q:[ddg-captcha]W0612 screw extractor (lite shell, zero external links) | W0612 is an importer size/set code on an unbranded 6pc screw-extractor set; no manufacturer brand or OEM domain identifiable through any working channel; only marketplace imagery expected which is below the official-source bar; exhausted with owner action. action=search",
   "Ask the hand-tool supplier for the maker/brand and carton artwork of the W0612 6pc screw-extractor set; otherwise photograph the sealed set in-store")

ex("2640", "TOO-PLI-CIRWHS175", "PCS", "Intl Plier Straight 175MM", "Hand Tools", "", "WHS175B", "T1,T2,T5",
   INFRA + " | q:[bingrss-junk]'WHS175B' (returned Bing-rewards quiz junk) | q:[ddg-captcha]WHS175B plier (captcha shell) | T2 normalisation kept WHS175B verbatim (no prefix-map hit); code reads as an import-line plier model with no resolvable OEM domain or authorised-distributor page in any working channel; exhausted with owner action. action=search",
   "Ask the plier supplier which factory brands the Intl straight plier WHS175B line; request their catalogue sheet or photograph the hang-tag in-store")

ex("3479", 'HOS-FLE-VIP-PP30"', "PCS", "PP-30 White Nylon Vip Flexible Tube", "Outdoor & Garden", "", "PP-30", "T1,T5",
   INFRA + " | q:[bingrss-junk]VIP flexible tube PP-30 nylon (returned J&T VIP courier pages) | q:[ddg-captcha]VIP PP-30 nylon flexible tube | 'VIP' is a trade print on the commodity white-nylon tube bag; no OEM site resolvable through any working channel; marketplace-only imagery expected; exhausted with owner action. action=search",
   "Ask the hose/tube supplier for the VIP flexible-tube maker and its PP-series leaflet (PP-08/PP-30); otherwise photograph the printed bag in-store")

ex("3975", "CUT-BLA-STA-9MM-9920113001", "PKT", "9MM (10PKT/BOX)SNAP-OFF Knife Blade", "Abrasives & Cutting", "", "10PKT/BOX", "T1,T2,T5",
   INFRA + " | q:[websearch]stanley 9mm snap-off blade cushion codes -> only Walmart/marketplace sets, official SBD APAC blades carry 0-11-xxx codes (e.g. 0-11-300 9mm snap knife blade 10pk) | q:T2 mapping: Ekoway legacy APAC code 9920113001 does not appear on any official stanleytools.global page; detected_model 10PKT/BOX is packaging text whose tokens cannot bind an official page | official equivalents exist but no official page quotes this SKU's own code/model, so the machine model-match cannot be satisfied honestly; exhausted with owner action. action=search",
   "Request the SBD/Stanley APAC cross-reference for 9920113001 (likely 0-11-300 family) from the Stanley dealer/Leeden price list, or photograph the blade box face in-store")

ex("4079", 'BRA-SHE-S/S-G785-06"', "SET", "G785 304 H/duty Shelf Bracket 6", "Housewares", "", "G785", "T1,T5",
   INFRA + " | q:[bingrss-junk]'G785' 304 stainless shelf bracket (unrelated noise) | G785 is an importer bracket code; no OEM domain identifiable through any working channel; commodity hardware with marketplace-only imagery below the source bar; exhausted with owner action. action=search",
   "Ask the housewares supplier for the G785 bracket maker and its box/label artwork; otherwise photograph the paired bracket in-store")

ex("3500", "FAS-SCR-TD640HW-WOOD-PCK", "PCK", "12 X 1 1/2 Self Drilling Screw (50PCS/PACK)", "Fasteners & Fixings", "", "50PCS/PACK", "T1,T5",
   INFRA + " | q:[bingrss-junk]self drilling screw TD640HW 12x1.5 (no fastener PDP with this trade code) | detected_model is pack-count text; TD640HW is an importer box code on commodity self-drilling screws with no identifiable manufacturer; marketplace-only imagery below bar; exhausted with owner action. action=search",
   "Ask the fastener supplier for the TD640HW carton brand/maker sheet; otherwise photograph the labelled pack in-store")

ex("6716", "BEW-PAL-DC-D-150V", "PCS", "Bew Panel Meter DC", "Electrical", "", "0-D-150V", "T1,T5",
   INFRA + " | q:[bingrss-junk]panel meter BEW DC 0-150V (returned celebrity/noise pages) | q:[ddg-captcha]BEW panel meter DC 0-150V | BEW panel-meter maker unresolvable via any working engine or domain guess; analogue DC 0-150V panel meters are generic import goods; exhausted with owner action. action=search",
   "Ask the electrical supplier for the BEW panel-meter factory and its catalogue page covering the DC 0-150V square meter; photograph the dial in-store meanwhile")

ex("4243", "TOO-WRE-KEY-KTBAL-12004", "SET", "King TOP9PCS-4 Ball Point Hex Key Wrench", "Hand Tools", "", "TOP9PCS-4", "T1,T2,T5",
   INFRA + " | q:[probes]King Toyo ball point hex key set TOP9PCS -> bingrss junk | p:https://www.kingtoyo.com.my/product-sitemap.xml enumerated: 104 live products, zero ball-point/hex-key sets; site search (?s=hex key) is a JS shell with no server-rendered results | no other 'King'-brand hex-key OEM resolvable through any working channel; exhausted with owner action. action=search",
   "Confirm with the tool supplier which 'King' factory supplies the TOP9PCS-4 ball-point hex-key set and request its catalogue image; photograph the folded set in-store meanwhile")

ex("3460", "TOO-DRV-PRE-7391B", "SET", "Precision Screw Driver (+/-)", "Fasteners & Fixings", "", "7391B", "T1,T5",
   INFRA + " | q:[ddg-captcha]precision screwdriver set 7391B (captcha shell) | 7391B is a generic far-east precision-driver kit code used by multiple unbranded importers; no single OEM or official page identifiable; exhausted with owner action. action=search",
   "Ask the tool supplier for the maker of the 7391B +/- precision driver set; photograph the blister in-store")

ex("3642", "BLI-HSS-HOL-SAW-20MM", "PCS", "Blimax Hss Hole SAW-20MM", "Power Tool Accessories", "", "SAW-20MM", "T1,T2,T5",
   INFRA + " | q:[probes]Blimax HSS hole saw Malaysia -> bingrss junk | p:https://www.blimax.com.my/search/hole+saw fetched: Blimax Supply Sdn Bhd is an agricultural/electrical trading company (brush cutters, fans); zero hole-saw products on site, so it is not the Blimax hole-saw OEM | no hole-saw manufacturer behind the Blimax trade name is resolvable; exhausted with owner action. action=search",
   "Ask the accessories supplier which factory makes the Blimax-branded HSS hole saws and request its datasheet/box art for 19mm and 20mm; photograph the carded saw in-store meanwhile")

ex("3301", 'TOO-DRV-STA-PH0-1/8"X6"-9960651600', "PCS", 'Cushion Grip S/dr PHILIPS-1/8"X6"X0PT ( 0X150MM)', "Power Tools", "", 'PHILIPS-1/8', "T1,T2,T4,T5",
   INFRA + " | q:[websearch]site:my.stanleytools.global cushion grip screw driver -> MY official site carries STMT608xx-8 series | q:T2 mapping: legacy APAC code 9960651600 corresponds to PH0 x 150mm Cushion Grip Phillips = STMT60803-8 (Wayback slug evidence) | p:http://web.archive.org/web/20240524191622/https://asia.stanleytools.global/product/stmt60803-8/cushion-grip-screw-driver-phillips-ph0-x-150mm exists in Wayback index but my.stanleytools.global does not list this size, and every official page spells PHILLIPS so the recorded model token PHILIPS-1/8 can never literally match official text (machine model-match impossible without inventing a claim); exhausted with owner action. action=search",
   "Ask the Stanley dealer/Leeden to confirm 9960651600 = STMT60803-8 (Cushion Grip Phillips PH0 x 150mm) on the APAC price list and supply the official product shot; photograph the driver in-store meanwhile")

ex("3737", "IND-CAS-SCR-10MM", "PCK", "2 Screw (4PCS/PCK) CASTER-10MM", "Fasteners & Fixings", "", "4PCS/PCK", "T1,T5",
   INFRA + " | q:[bingrss-junk]caster screws 10mm 4pcs pack (generic fastener pages) | detected_model is pack-count text; mounting screws sold loose for casters have no identifiable manufacturer; exhausted with owner action. action=search",
   "Photograph the caster-screw pouch in-store; ask the caster supplier whether the matching screw pack has a maker's card")

ex("4345", "SHH-LINE-L/G-OHML30", "PCS", "Omega Hayasu Mono Line (rainbow) 30LBS", "Fishing & Tackle", "", "30LBS", "T1,T5",
   INFRA + " | q:[bingrss-junk]Omega Hayasu mono filament fishing line (returned OMEGA watches) | q:[ddg-captcha]Omega Hayasu fishing line | no official Omega/Hayasu fishing-line domain resolvable through any working channel; Hayasu is a Japanese-styled importer line name; exhausted with owner action. action=search",
   "Ask the tackle supplier for the Omega Hayasu importer/distributor and its spool artwork for the 30LBS rainbow grade; photograph the spool label in-store")

ex("4346", "SHH-LINE-L/G-OHML8", "PCS", "Omega Hayasu Mono Line 8LBS (rainbows)", "Fishing & Tackle", "", "8LBS", "T1,T5",
   INFRA + " | q:[bingrss-junk]Omega Hayasu mono filament fishing line (OMEGA watches again) | q:[ddg-captcha]Omega Hayasu 8LBS | same situation as sibling 30LBS grade: no official brand domain findable; exhausted with owner action. action=search",
   "Same owner action as OHML30: get the Omega Hayasu distributor's spool artwork covering 8LBS, else photograph the spool in-store")

ex("3363", 'TOO-DRV-STA-3X150MM-9960651830', "PCS", 'Cushion Grip S/dr Std - (1/8"X6")', "Power Tools", "", "3X150MM", "T1,T2,T4,T5",
   INFRA + " | q:[websearch]stanley cushion grip slotted sizes -> regional .global sites use metric titles | q:T2 mapping: BR official series proves slotted 1/8\" x 6\" = STMT60820 (-840 slug chave-emborrachada-fenda-plana-18-x6) | p:p:https://br.stanleytools.global/produto/stmt60820-840/chave-emborrachada-fenda-plana-18-x6 (Wayback index) confirms the code exists, but no live PDP exists on my./asia./in. hosts (all slug variants tried return 404) and no official page prints the literal string 3X150MM, so the machine model-match cannot be met honestly; exhausted with owner action. action=search",
   "Request the STMT60820-8 official product image from the SBD Malaysia rep / Leeden (APAC price list shows 9960651830); photograph the driver in-store meanwhile")

ex("2912", "SWI-ADA-3388-931L", "PCS", "Taicon 3388 Multi Travel Adaptor", "Electrical", "Taicon", "", "T1,T4,T5",
   INFRA + " | q:[ddg-captcha]Taicon travel adaptor Malaysia (captcha shell) | p:taicon.com.my DNS-unresolvable (https/http/www all fail) | p:Wayback CDX taicon.com.my* returns zero captures | Taicon has no reachable official presence this session; multi-travel-adaptor OEM imagery therefore unobtainable above the source bar; exhausted with owner action. action=search",
   "Contact the Taicon distributor for the 3388 multi-travel-adaptor product sheet/image, or photograph the unit and its box in-store")

ex("3699", "BLI-HSS-HOL-SAW-19MM", "PCS", "Blimax Hss Hole SAW-19MM", "Power Tool Accessories", "", "SAW-19MM", "T1,T2,T5",
   INFRA + " | q:[probes]same as 20MM sibling | p:https://www.blimax.com.my/search/hole+saw zero hole-saw products (trading company, wrong Blimax) | no OEM behind the Blimax hole-saw trade name resolvable; exhausted with owner action. action=search",
   "Same owner action as the 20mm sibling: request the Blimax hole-saw factory datasheet/box art (19mm) from the supplier, else photograph the carded saw in-store")

ex("5491", "PIP-EXT-M255", "PCS", "M255 Pipe Extractor 1/2", "Plumbing", "", "M255", "T1,T5",
   INFRA + " | q:[ddg-captcha]M255 pipe extractor 1/2 (captcha shell) | M255 is a mould/trade code on an unbranded plumbing tool; no manufacturer resolvable through any working channel; exhausted with owner action. action=search",
   "Ask the plumbing supplier for the M255 pipe-extractor maker; photograph the tool with its band-card in-store")

ex("5517", "GUN-CAU-H/D-Y93", "PCS", "Alitool Caulking Gun - Y93", "Fasteners & Fixings", "", "Y93", "T1,T4,T5",
   INFRA + " | q:[bingrss-junk]Alitool caulking gun Malaysia (Japanese rental listings) | p:alitool.com.my / alitool.com / alitoolsb.com all DNS-unresolvable | p:Wayback CDX alitool.com.my* returns zero captures | Alitool (importer brand) has no reachable official presence this session; exhausted with owner action. action=search",
   "Contact Alitool Marketing (Malaysia) directly for the Y93 heavy-duty caulking-gun product image/sheet, else photograph the hanging gun in-store")

ex("3413", 'TOO-DRV-STA-5X150MM', "PCS", 'Cushion Grip S/dr Std - (3/16"X6")', "Power Tools", "", "5X150MM", "T1,T2,T4,T5",
   INFRA + " | q:[websearch]stanley cushion grip standard screwdriver sizes | q:T2 mapping: official APAC lineup archives show standard 5mm sizes 60821=x75, 60822=x100, 60824=x200; a 5x150 PDP (would-be STMT60823-8) is absent from every regional host and all slug variants 404 | p:no official page prints 5X150MM for this line, so machine model-match cannot be satisfied; exhausted with owner action. action=search",
   "Ask the Stanley dealer/Leeden whether 99xxxx 3/16\" x 6\" Cushion Grip standard maps to STMT60823-8 and request the official image; photograph the driver in-store meanwhile")

ex("5498", "SWI-SOC-ULT-M061W", "PCS", "Ultra 16A 1 GANG Doorbell Switch-white (M061W)", "Electrical", "", "M061W", "T1,T5",
   INFRA + " | q:[bingrss-junk]Ultra doorbell switch 16A M061W (U-Mobile/UltraViewer noise) | p:ultra.com.my is Ultra Computer Center (unrelated); ultralite.com.my is Ultralite Engineering with no M-code switch catalogue visible | the 'Ultra' switch OEM behind M061W is not resolvable through any working channel; exhausted with owner action. action=search",
   "Ask the switch supplier for the Ultra-brand (M061W) factory and its faceplate artwork; photograph the white 1-gang doorbell switch in-store")

ex("3486", 'TOO-DRV-STA-3X125MM-9960651820', "PCS", 'Cushion Grip S/dr Std - (1/8"X5")', "Power Tools", "", "3X125MM", "T1,T2,T4,T5",
   INFRA + " | q:[websearch]site:my.stanleytools.global cushion grip screw driver | p:https://in.stanleytools.global/product/stmt60819-8/cushion-grip-standard-screwdriver-3-x-125mm fetched 200: official global-OEM PDP titled 'Cushion Grip(TM) 3mm x 125mm Standard Screwdriver' (= our 1/8\" x 5\") BUT normalized page text contains 3MMX125MM, never the recorded token 3X125MM, and its og:image resolves to a category-fallback asset, not the product; my.stanleytools.global 404s the same slug | an honest machine-gated candidate is impossible from this page (model-string mismatch is a recording artifact, not a product doubt); exhausted with owner action. action=search",
   "Obtain the official STMT60819-8 hi-res product image from the SBD Malaysia rep / Leeden and confirm 9960651820 = STMT60819-8 on the APAC price list; photograph the driver in-store meanwhile")

ex("5510", "ELE-PVC-BOX-TC4X6", "EA", "Tc 4X6 PVC Enclosure Box", "Electrical", "", "4X6", "T1,T5",
   INFRA + " | q:[bingrss-junk]TC 4x6 PVC junction enclosure box (generic wholesalers) | 'TC' is a mould mark on a commodity PVC wiring box; no manufacturer resolvable; detected_model is bare size text; exhausted with owner action. action=search",
   "Photograph the TC-marked 4x6 PVC box in-store; ask the electrical supplier for the moulding factory's catalogue entry")

ex("3927", "NAI-SQU-SUP-100MM-1KGS", "PKG", "E. G Square Boat Nail 100MM 1KGS", "Fasteners & Fixings", "", "1KGS", "T1,T5",
   INFRA + " | q:[bingrss-junk]square boat nail 100mm 1kg (generic nail pages) | E.G square boat nails are plain imported hardware; detected_model is weight text; no manufacturer identifiable; exhausted with owner action. action=search",
   "Photograph the 1kg E.G boat-nail packet/label in-store; ask the fastener supplier for the mill's brand sheet")

ex("4601", "AER-4ME8", "PCS", "Aerico 4ME8", "Other", "", "4ME8", "T1,T5",
   INFRA + " | q:[bingrss-junk]Aerico 4ME8 (nothing relevant) | p:www.aerico.com is a US critical-power (data-centre) company cached this session - unrelated to this aerosol/other trade item | no Aerico consumer-product OEM resolvable through any working channel; exhausted with owner action. action=search",
   "Ask the supplier what product 'Aerico 4ME8' is (maker + category) and request the label copy; photograph the item in-store")

ex("5559", "NAI-CON-ACE-25-BOX", "BOX", "Ace Galvanised Flat Head Nails 25 X 2.0 (500GM)", "Fasteners & Fixings", "", "500GM", "T1,T5",
   INFRA + " | q:[bingrss-junk]Ace galvanised flat head nails 25x2.0 (US retail noise) | Ace-branded commodity nails packed for the local market; detected_model is weight text; no OEM product page carrying this pack spec exists in reach; exhausted with owner action. action=search",
   "Photograph the Ace 500gm nail box in-store; ask the supplier for the packing factory's brand sheet if one exists")

ex("3665", "HOS-FLE-VIP-PP08", "PCS", "PP-08 White Nylon Vip Flexible Tube", "Outdoor & Garden", "", "PP-08", "T1,T5",
   INFRA + " | q:[bingrss-junk]VIP PP-08 nylon tube (courier/VIP noise) | same VIP trade-name bag as PP-30 sibling; no OEM site resolvable; exhausted with owner action. action=search",
   "Same owner action as PP-30: request the VIP tube maker's PP-series leaflet (covers PP-08 and PP-30), else photograph the printed bag in-store")

ex("4315", "FIL-GAU-W2868A", "PCS", "Filler Gauges 100MM*14", "Other", "", "100MM*14", "T1,T5",
   INFRA + " | q:[ddg-captcha]filler gauge W2868A (captcha shell) | q:[bingrss-junk]filler gauge W2868A | W2868A looks like a maker code but no gauge OEM resolvable through any working channel; commodity feeler/filler gauge set; exhausted with owner action. action=search",
   "Ask the tool supplier which maker owns code W2868A for the 14-blade 100mm filler gauge and request its card artwork; photograph the gauge set in-store")

# ---- write ----
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(HDR)
    w.writerows(rows)
print("wrote", OUT, "rows:", len(rows))
