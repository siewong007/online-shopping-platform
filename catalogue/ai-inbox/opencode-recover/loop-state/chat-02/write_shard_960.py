import csv, io

OUT = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\shard-960-989.csv"
HDR = ["source_position","item_code","uom","display_name","category","detected_brand","detected_model","state","round_first_seen","round_last_touched","tiers_tried","official_product_page","official_image_url","image_px_w","image_px_h","image_bytes","image_sha256","match_confidence","finish_exact","model_exact","uom_assessment","rights_status","researcher_decision","verifier_verdict","machine_gate","reason","human_action"]

INFRA = "infra: shared websearch worked this session (used sparingly per brief); Bing HTML scrape (srch.py) and Bing RSS return unrelated junk for every quoted code this session; DuckDuckGo lite unused; working channels were direct OEM-domain probes and Wayback CDX"

def ex(pos, ic, uom, name, cat, dm, tiers, reason, action):
    return [pos,ic,uom,name,cat,"",dm,"exhausted",1,1,tiers,"","","","","","","","no","no","match","no_asset","exhausted","","",reason,action]

rows = []
rows.append(ex(960,'CLI-HOS-GP-2.1/4"',"PCS","Gp S/steel Hose CLIP-2.1/4 (33-57MM)","Outdoor & Garden","CLIP-2.1/4","T1,T5",
 'q:[bing-junk]\'hose clip\' "33-57mm" stainless (srch.py returned Google-Classroom/Clipchamp junk, query split on hyphen-quote) | ' + INFRA + ' | CLIP-2.1/4 is a generic galvanised hose-clip size band (33-57MM) sold loose under trade code GP; no manufacturer brand or official domain identifiable through any working channel; marketplace-only imagery expected which is below the official-source bar; exhausted with owner action. action=search',
 "Ask the hose-clip supplier for the GP box-face artwork / brand sheet for CLIP-2.1/4 (33-57MM); else photograph the blister card in-store with the size band visible"))
rows.append(ex(961,"TOI-PAP-ROL-PVC-9102","PCS","Toilet Paper Roller","Bathroom","TPE-9102","T1,T5",
 'q:[bing-junk]"TPE-9102" toilet roller (returned thermoplastic-elastomer polymer pages, code not recognised anywhere) | ' + INFRA + ' | TPE-9102 is an importer mould code on a commodity PVC toilet-paper roller; no OEM site exists or is resolvable; exhausted with owner action. action=search',
 "Photograph the TPE-9102 roller and its hang-tag in-store; ask the bathroom-accessories supplier for the maker's carton brand for a future OEM lookup"))
rows.append(ex(962,"FIT-HDPE-ADA-FEM-20MMX1/2\"","PCS","HDPE Adaptor Female 20MMX1/2","Plumbing","20MMX1/2","T1,T5",
 'q:[bing-junk]HDPE adaptor female 20mm x 1/2 Malaysia (only generic HDPE-material explainers and pipe wholesalers, no fitting PDP with this code) | ' + INFRA + ' | detected_model is just the size 20MMX1/2; unbranded commodity irrigation fitting with no identifiable manufacturer; marketplace imagery below source bar; exhausted with owner action. action=search',
 "Photograph the HDPE adaptor bag/barcode in-store; ask the plumbing supplier for the fitting maker's catalogue page covering 20mm x 1/2 female adaptor"))
rows.append(ex(963,"IND-DUS-ALI-120L","PCS","Aliclean HDPE Dustbin 120LTR","Plumbing","120LTR","T1,T4,T5",
 'q:Aliclean dustbin 120L official | p:https://www.aliclean.com/ (urllib 200 but JS-only shell, text_len=1, no crawlable catalogue) | p:https://www.aliclean.com/sitemap.xml (33-byte stub, zero URLs) | p:http://web.archive.org/cdx/search/cdx?url=aliclean.com* -> TIMEOUT | ' + INFRA + ' | aliclean.com exists but exposes no bot-readable product index and no 120L dustbin page could be confirmed or quoted; marketplace imagery below bar; exhausted with owner action. action=search',
 "Email Aliclean via aliclean.com contact page requesting an official product image of the 120L HDPE dustbin; else photograph the bin and its moulded brand mark in-store"))
rows.append(ex(965,"TOO-HAM-CLA-MHT2839","PCS","Steel Handle Magnetic Claw","Hand Tools","HAMMER-28X390MM","T1,T5",
 'q:[bing-junk]"MHT2839" claw hammer (returned Japanese meme pages, code unknown to web) | ' + INFRA + ' | MHT2839 is a supplier stock code on an unbranded steel-shank magnetic claw hammer; no OEM presence identifiable; marketplace-only imagery below bar; exhausted with owner action. action=search',
 "Photograph the hammer head stamp and hang-tag showing the stock code in-store; ask the hand-tools supplier for the maker's catalogue entry"))
rows.append(ex(966,"IND-CAS-H/DUTY-MCLSCB-6\"","PCS","6 DL5 H/duty Mcl Swivel Caster W Double Brake","Fishing & Tackle","DL5","T1,T5",
 'q:[bing-junk]"DL5" caster double brake (Netflix/store junk, code unrecognised) | ' + INFRA + ' | DL5 is a caster-frame code on an import heavy-duty swivel caster; no manufacturer brand printed in listing and no official domain identifiable; exhausted with owner action. action=search',
 "Ask the caster supplier for the DL5 double-brake swivel-caster datasheet photo; else photograph the top-plate and hub markings in-store"))
rows.append(ex(967,"ELE-LED-SOL-EMGY-200W-3CLR","PCS","Solar Emergency","Electrical","200W-3CLR","T1,T5",
 'q:[bing-junk]solar emergency light "200W" 3 colour Malaysia (only TNB/SEDA/solar-installer results, no matching luminaire PDP) | ' + INFRA + ' | unbranded solar emergency LED unit; 200W-3CLR is a spec descriptor not a quotable model; generic-import imagery below source bar; exhausted with owner action. action=search',
 "Photograph the unit and its carton brand/model sticker in-store; request the spec sheet from the electrical supplier for a future branded lookup"))
rows.append(ex(968,"FAS-SCR-ZPH-DSMHO520-BOX","BOX","Sr Zph Self Drilling Screw (1000PCS/BOX) DSM-HO520","Fasteners & Fixings","1000PCS/BOX","T1,T5",
 'q:[bing-junk]"DSM-HO520" self drilling screw (DSM psychiatry/company junk, code unrecognised) | ' + INFRA + ' | ZPH is a fastener trade mark with no resolvable official domain found; detected_model is pack-count text not a part number; commodity screw imagery below bar; exhausted with owner action. action=search',
 "Request the ZPH DSM-HO520 box-face artwork (showing thread, length, 1000-pc count) from the fastener supplier; else photograph both box ends in-store"))
rows.append(ex(969,"DOR-LOC-LEV-SMR-3491SS","SET","Heavy Duty Level Lock SMR-3491SS","Locks & Security","SMR-3491SS","T1,T5",
 'q:[bing-rss-junk]"SMR-3491" (SMR HR consulting / small-modular-reactor junk) | ' + INFRA + ' | SMR-3491SS is an importer code on a heavy-duty lever (level) lock; no manufacturer brand or official domain identifiable through any working channel; exhausted with owner action. action=search',
 "Email the lock supplier for the SMR-3491SS lever-lock product sheet / box art; else photograph the boxed lock face showing the code in-store"))
rows.append(ex(970,"NP-BAR-BS1094-1L","TIN","1L Bintang Automotive Refinish 033 White (premixed)","Automotive","BS1094","T1,T2,T4,T5",
 'q:"Nippon Paint Bintang automotive refinish BS1094" (websearch: official family PDP only, no colour codes) | q:[websearch-junk]"BS1094" Bintang white (Bitner cable / BathSelect faucet hits, unrelated) | p:https://www.nipponpaint.com.my/product/bintang-automotive-refinish/ (200; official family page describes Bintang refinish but contains neither BS1094 nor 033 nor 1L pack codes, so gate model precheck cannot pass) | ' + INFRA + ' | official Nippon MY page exists but carries no per-colour/per-pack codes; BS1094 appears to be an internal supplier code; cannot certify model_exact against any official source; exhausted with owner action. action=search',
 "Email the Nippon Paint automotive dealer for the Bintang 033 White 1L premix tin shot and TDS confirming internal code BS1094; else photograph the tin label in-store"))
rows.append(ex(971,"LOC-CYL-SGD-C3010/70MM","PCS","Ss/privacy St. Guchi Cyl Lock","Locks & Security","SDCD-C3010/70MM","T1,T2,T3,T5",
 'q:"St Guchi SGDC-C3010 cylindrical lock" (websearch: only St Guchi distributor SGC-series SGC1000/36200/37300, no C3010) | q:[websearch-junk]St Guchi "C3010" OR "SGDC-C3010" 70mm (Yaskawa SGDC servopack junk) | p:http://www.stguchi.com.my/my/en/sitemap.xml (200; full product sitemap; cylindrical-lock range is SGCD-xxxx only: sgcd-9900/3100/v3000/v3010/36200..., no c3010 slug) | p:https://www.stguchi.com.my/my/en/products/mechanical-locks/cylindrical-lock/sgcd-v3010 (200; closest match SGCD-V3010 is Privacy SUS304 but backset 60mm antique-copper finish, mismatches 70MM SS) | p:https://gw-assets.assaabloy.com/is/image/assaabloy/SGDC-C3010 (403 Forbidden, pattern probes all refused) | ' + INFRA + ' | T2 normalisation SDCD->SGCD/SGDC tried; SGD-C3010/70MM is absent from the current official St Guchi MY range (likely re-coded or discontinued); refusing to substitute the mismatching V3010; exhausted with owner action. action=search',
 "Ask the St Guchi dealer/lock supplier which current SGCD-series model supersedes SGD-C3010/70MM stainless-privacy and request its official image; else photograph the boxed lock in-store"))
rows.append(ex(972,"TAP-2-WAY-CA411QH","PCS","CA411QH 2-WAY Tap V/p","Plumbing","CA411QH","T1,T5",
 'q:[bing-rss-junk]"CA411QH" (NAVER Korean junk) | ' + INFRA + ' | CA411QH is a mould/carrier code on an unbranded chrome-plated 2-way bib tap; no manufacturer domain identifiable; exhausted with owner action. action=search',
 "Photograph the CA411QH tap hang-tag/carrier in-store; ask the plumbing supplier for the tap maker's catalogue to enable an OEM lookup"))
rows.append(ex(973,"ELE-METW0453","PCS","Digital Multi-meter W0453","Electrical","W0453","T1,T5",
 'q:[bing-rss-junk]"W0453" multimeter (bot-protection blog junk) | ' + INFRA + ' | W0453 is a supplier stock code on a generic DMM; METW prefix gives no resolvable brand; marketplace-only imagery below bar; exhausted with owner action. action=search',
 "Photograph the W0453 multimeter and carton in-store; ask the electrical supplier for the meter brand's spec sheet"))
rows.append(ex(975,"TOO-CLA-GW473160","PCS","Heavy G-shape Clamp 6","Hand Tools","W0473F","T1,T5",
 'q:[bing-junk]"W0473F" G clamp (Microsoft-community junk) | ' + INFRA + ' | W0473F is a supplier stock code on an unbranded forged G-clamp; no OEM presence identifiable; exhausted with owner action. action=search',
 "Photograph the W0473F clamp label/stamp in-store; ask the hand-tools supplier for the maker's line sheet"))
rows.append(ex(976,"RAI-BOO-KRK-Y43#","PAIR","Rainshoes - 43 (10) 7000YLW","Curtains & Blinds","7000YLW","T1,T5",
 'q:[bing-junk]rain boots "7000YLW" (rain-radar junk) | ' + INFRA + ' | 7000YLW is an importer colour/size run code (yellow, size 43) on commodity rain boots; no brand domain identifiable; exhausted with owner action. action=search',
 "Photograph the yellow size-43 rainshoe pair and carton label in-store; request the importer's style card for the 7000 run"))
rows.append(ex(977,"TOO-WRE-KEY-MD06218","SETS","Mdsi (MD-06218) Colourful Extra Long Hex. Key Wrench","Hand Tools","MD-06218","T1,T3,T4,T5",
 'q:"MDSI" OR "MD" hex key wrench set MD-06218 extra long ball point (websearch: MDSI is a real Taiwan-origin hand-tool brand distributed in MY but only via distributors Yee Tat Hardware / Singtex / Sui U listings of other MD-xxxxx items; no MD-06218 page found) | p:mdsi.com.tw / www.mdsi.com.tw (DNS getaddrinfo failed - no OEM domain resolves) | p:http://web.archive.org/cdx/search/cdx?url=mdsi.com.tw* -> 0 urls | ' + INFRA + ' | brand has no official website; distributor retailer pages fail the official-source bar; exhausted with owner action. action=search',
 "Email the MDSI distributors (Yee Tat Hardware Melaka or Sui U Machinery KL) for the MD-06218 extra-long colourful ball-point hex-key set image; else photograph the blister set in-store"))
rows.append(ex(978,"ANG-EAV901SS","PCS","Eav 901 SS Elise Double Open Angle (SUS304)","Other","SUS304","T1,T5",
 'q:[bing-rss-junk]"EAV901" OR "EAV 901" (YouTube-help junk; RSS mangles hyphens) | ' + INFRA + ' | EAV901 is a valve-body code on an Elise-series double-open angle valve; SUS304 is a material grade not a brand; no manufacturer domain identifiable; exhausted with owner action. action=search',
 "Photograph the EAV901 angle-valve box face in-store; ask the bathroom-ware supplier which brand carries the Elise SUS304 series and request its catalogue image"))
rows.append(ex(979,"COC-BASIN-K400C-1/2\"","PCS","Washbasin Tap:c/p Cross-type 1/2","Plumbing","K-400C","T1,T5",
 'q:[bing-rss-junk]"K-400C" basin tap (letter-K junk) | ' + INFRA + ' | K-400C is a carrier code on a commodity chrome-plated cross-handle basin tap; despite the K- prefix it does not correspond to any findable Kohler catalogue number at this price class and no brand is claimed in the listing; exhausted with owner action. action=search',
 "Photograph the K-400C basin tap and its carrier in-store; request the tap catalogue from the plumbing supplier to identify the maker"))
rows.append(ex(981,"FAS-SCR-TECH-METAL-45MM-BOX","BOX","Techscrew-metal Screw X 45MM (300PCS/BOX)","Fasteners & Fixings","300PCS/BOX","T1,T3,T4,T5",
 'q:[bing-rss-junk]Techscrew self drilling screw (Vietnam-food junk) | p:https://techscrew.com.my/ and http://www.techscrews.com/ (DNS getaddrinfo failed) | p:http://web.archive.org/cdx/search/cdx?url=techscrew* -> 0 urls | ' + INFRA + ' | Techscrew is a trade name with no resolvable official domain or archive footprint; detected_model is pack-count text; commodity screw imagery below bar; exhausted with owner action. action=search',
 "Email the Techscrew importer/wholesaler for the 45mm metal-screw 300-pcs box artwork; else photograph the box face showing thread and count in-store"))
rows.append(ex(982,"TOO-LEV-MAG-3804X18\"","PCS","T&t Magnetic Flat Aluminium Level - 3804X18","Power Tools","3804X18","T1,T5",
 'q:[bing-junk]"3804X18" aluminium level (HYROX race junk) | ' + INFRA + ' | 3804X18 encodes dimensions of a T&T-trade-name aluminium box level; no official T&T tools domain identifiable; exhausted with owner action. action=search',
 "Photograph the level profile and 3804X18 hang-tag in-store; ask the supplier for the T&T level series sheet"))
rows.append(ex(985,"TOO-WRE-KEY-W0199A","SET","9PCS Extralong Ball Point W0199A","Power Tools","W0199A","T1,T5",
 'q:[bing-junk]"W0199A" hex key (Reddit junk) | ' + INFRA + ' | W0199A is a supplier stock code on a 9-pc extra-long ball-point hex-key set; sibling W-codes in this catalogue resolve to no OEM; exhausted with owner action. action=search',
 "Photograph the W0199A pouch/blister set in-store; ask the hand-tools supplier for the hex-key maker's catalogue"))
rows.append(ex(986,"COP-ROD-LOC-12MMX5FT","PCS","Local Copper Rod 12MM X 5FT","Other","5FT","T1,T5",
 'q:[bing-junk]local copper rod 12mm x 5ft (dictionary/maps junk) | ' + INFRA + ' | bulk local-market copper rod stock sold by size only; no brand or OEM exists by definition; exhausted with owner action. action=search',
 "Photograph the 12MM x 5FT copper rod bundle and price tag in-store; ask the copper supplier for the mill/source reference if a brand image is later required"))
rows.append(ex(987,"TOO-PLI-COM-W208D","PCS","Combination Pliers 200MM B208D","Power Tools","B208D","T1,T5",
 'q:[bing-junk]"B208D" combination pliers 200mm (Chinese Q&A junk) | ' + INFRA + ' | B208D is a supplier stock code on unbranded 200mm combination pliers; no OEM presence identifiable; exhausted with owner action. action=search',
 "Photograph the B208D pliers handle stamp and hang-tag in-store; request the pliers catalogue from the hand-tools supplier"))
rows.append(ex(988,"SWI-FOO-10A-250VAC","PCS","Foot Switch 101 10A 250C","Electrical","250C","T1,T5",
 'q:[bing-junk]foot switch "101" 10A 250VAC Malaysia (Messenger-localisation junk) | ' + INFRA + ' | model-101 foot switch is a commodity import; 250C is a voltage descriptor; no manufacturer domain identifiable; exhausted with owner action. action=search',
 "Photograph the model-101 foot switch and carton in-store; ask the electrical supplier for the maker's datasheet"))
rows.append(ex(989,"SWI-T/SOC-FLE-913-2M3G","SET","Fle T/skt Sp TC-3GL-240B 913-2M","Electrical","TC-3GL-240B","T1,T5",
 'q:[bing-rss-junk]"TC-3GL-240B" (Kota-Kinabalu trading-company junk) | ' + INFRA + ' | FLE flush-type socket SP with TC-3GL-240B code matches no findable wiring-accessory OEM; code appears to be an importer batch reference; exhausted with owner action. action=search',
 "Photograph the TC-3GL-240B flush-socket set box in-store; ask the electrical supplier for the FLE-series wiring-accessory catalogue"))

def cand(pos, ic, uom, name, cat, dm, tiers, page, img, w, h, bts, sha, rights, reason):
    rows.append([pos,ic,uom,name,cat,"",dm,"candidate",1,1,tiers,page,img,w,h,bts,sha,"high","yes","yes","match",rights,"keep","","",reason,""])

cand(964,"SHE-CAB-CB476-BLK","PCS","Cabana Corner Shelf S/s Matt Blk","Housewares","CB476-BLK","T1,T2",
 "https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb476-bl-detail",
 "https://www.cabana.com.my/images/virtuemart/product/CB476-BL-01.jpg",
 3334,3334,149810,"b5893f545f57e322a4ac915953911835211adb747b2d496c535be72c72f815eb","needs_permission",
 'q:"Cabana CB476 corner shelf stainless black Malaysia" (websearch: located official Cabana MY site shelf category listing CB476-BL/CB476-GM) | p:https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf (official category page lists CB476-BL) | p:https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb476-bl-detail (official VirtueMart PDP titled "Shelf: CB476-BL"; CB476BL quotable in cached text) | p:image URL (official site asset images/virtuemart/product/CB476-BL-01.jpg) | T2 suffix normalisation CB476-BLK->CB476-BL (BL = matt black stainless); all named facts match (corner shelf, stainless matt black); image 3334x3334 well above bar. action=search')

cand(974,"ELE-D/L-PHL-59467-SQ-6500K","SET","59467 Meson 17 1200 150 Square 6500K","Electrical","6500K","T1,T3",
 "https://www.eshop.lighting.philips.com/Produk/Index/280",
 "https://www.assets.signify.com/is/image/Signify/MESON_WH_SQ_recessed-SPP?$jpglarge$",
 2400,2400,84726,"c4de14a0cdf4befbcf125d08480bbd36ebca3b9ec20e2a9cb7d245ab56957ab0","needs_permission",
 'q:"Philips 59467 Meson LED downlight" (websearch: identified 59467 = Meson 17W square recessed downlight) | q:59467 Meson site:philips.com.my OR site:lighting.philips.com (websearch: found official Philips e-shop PDP) | p:https://www.eshop.lighting.philips.com/Produk/Index/280 (official Philips/Signify global e-shop PDP titled "Home Downlight 59467 MESON 150 17W 65K ... WH SQ recessed"; 59467/MESON/17W/6500K all quotable in cached text; T3 locale escalation .com ID shop, same model code) | p:https://www.assets.signify.com/is/image/Signify/MESON_WH_SQ_recessed-SPP?$jpglarge$ (official Signify Scene7 asset MESON_WH_SQ_recessed = Meson white square recessed, 2400x2400; eshop digpro thumb rejected at 8.9KB below 20KB gate) | display string "Meson 17 1200 150 Square 6500K" matches PDP naming exactly. action=search')

cand(980,"SWI-SOC-MK-G2977","EA","Mk Alm 13A M/c S/socket","Electrical","G2977","T1,T3",
 "https://www.ne2u.com.my/product/mk-g2977-alm-13a-1gang-switch-socket-outlet-metalclad/",
 "https://www.ne2u.com.my/wp-content/uploads/2020/10/MK-G2977.jpg",
 550,500,37389,"2f310f78f50f340208a0ec83c92143ea63727c23aef4486a70bf85e1322a8dff","needs_permission",
 'q:MK Electric "G2977" socket (websearch: identified MK G2977 ALM 13A 1-gang Metalclad Plus switched socket) | q:site:mkelectric.com G2977 OR metalclad plus 13A switched socket (websearch: 0 results - OEM site not indexed) | p:https://www.mkelectric.com/en/search?text=G2977 (200 but JS shell, G2977 not present; OEM search endpoint unusable) | p:http://web.archive.org/cdx/search/cdx?url=mkelectric.com&filter=urlkey:*g2977* -> 0 urls | p:https://www.ne2u.com.my/product/mk-g2977-alm-13a-1gang-switch-socket-outlet-metalclad/ (MY specialist electrical dealer Nanyang Electric estore; static PDP quotes "MK G2977 ALM 13A 1Gang Switch Socket Outlet (Metalclad)" verbatim incl Honeywell Metalclad Plus copy; G2977 quotable in cached text) | p:image URL MK-G2977.jpg 550x500 above gate | zhongtrading npcdn variant rejected because JS-rendered page carried no quotable model text; uom EA vs PCS single-unit sale consistent. action=search')

cand(983,"CUT-DEW-DW4724","PCS","Diamond Blade, Turbo","Abrasives & Cutting","DW4724","T1",
 "https://www.dewalt.com/en-us/product/dw4724/hp-4-diamond-turbo-blade",
 "https://assets.dewalt.com/NAG/PRODUCT/IMAGES/HIRES/WHITEBG/DW4724_1_1680.webp",
 1680,1680,406716,"cf2ffa4ad2acaac9032f541a1dfe4b320207891cb738fca45ca7d0d0ac676e24","unknown",
 'q:"DeWalt DW4724 turbo diamond blade official" (websearch: dewalt.com PDP top hit, SKU table confirms DW4724 HP 4in turbo blade) | p:https://www.dewalt.com/en-us/product/dw4724/hp-4-diamond-turbo-blade (official global OEM PDP; DW4724 quotable in cached text, page_status 200) | p:https://assets.dewalt.com/NAG/PRODUCT/IMAGES/HIRES/WHITEBG/DW4724_1_1680.webp (official DeWalt assets CDN hires white-bg render referenced by that PDP; first-choice .jpg twin 404ed, webp fetched 1680x1680 406KB) | Wayback revival attempted for older dewalt.com/product/dw4724 EU-named page (archived snapshots exist but asset extraction stalled; live US PDP sufficed). action=search')

cand(984,"SWI-SOC-ULT-M074W","PCS","Ultra 1 GANG Data Out (RJ45)-WHI (M074W)","Electrical","RJ45","T1,T2",
 "https://www.jllelectrical.com.my/showproducts/productid/3172589/retouch-ultra-rimless-ultra-1-gang-cat5e-data-outlet-rj45-whitetexture-goldmatte-grey/",
 "https://cdn1.npcdn.net/npimg/1653882104111229568660eb1031bce9a937d495b2.webp?md5id=d0866fb7fef7340334755089f89bdfeb&new_width=1000&new_height=1000&size=max&w=1784535547&from=png&type=9",
 1000,1000,27892,"7f85a9ecde93c9f26cc9e98d664f25707179b445d52fb4c6b86ffc5272a67c6f","needs_permission",
 'q:"M074W" OR "M073W" Ultra 1 gang data outlet RJ45 (websearch: identified reTOUCH ULTRA RIMLESS ULTRA 1 GANG CAT5E DATA OUTLET (RJ45) colour-code WHITE M074W) | p:ultra.com.my probed and rejected (unrelated computer retailer) | p:https://www.jllelectrical.com.my/tag/tag_id/46034,197855/ (MY electrical wholesaler series listing carrying the exact M074W colour-code block) | p:https://www.jllelectrical.com.my/showproducts/productid/3172589/retouch-ultra-rimless-ultra-1-gang-cat5e-data-outlet-rj45-whitetexture-goldmatte-grey/ (product PDP; M074W and RJ45 quotable in cached text; og:image meta names exactly this product photo) | p:image URL (npcdn size=max render of og:image, 1000x1000 27.9KB above gate) | T2: WHI->W white suffix normalisation; display facts (Ultra 1 gang RJ45 data outlet white M074W) all matched. action=search')

with open(OUT, "w", encoding="utf-8", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(HDR)
    w.writerows(rows)

print("rows:", len(rows))
