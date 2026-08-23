import csv

OUT = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\shard-1170-1199.csv"

HDR = ["source_position","item_code","uom","display_name","category","detected_brand","detected_model",
       "state","round_first_seen","round_last_touched","tiers_tried","official_product_page","official_image_url",
       "image_px_w","image_px_h","image_bytes","image_sha256","match_confidence","finish_exact","model_exact",
       "uom_assessment","rights_status","researcher_decision","verifier_verdict","machine_gate","reason","human_action"]

INFRA = ("infra: shared websearch HTTP429 x3 (initial+2 retries, quota shared by nine chats); Bing html+rss served canned "
         "unrelated results session-wide; DDG lite captcha shell (14KB, zero links); working channels were direct OEM-domain probes and Wayback CDX")

rows = []

def ex(pos, ic, uom, dn, cat, dm, tiers, reason, ha):
    rows.append([pos, ic, uom, dn, cat, "", dm, "exhausted", 1, 1, tiers, "", "", "", "", "", "", "", "no", "no", "match", "no_asset", "exhausted", "", "", reason, ha])

def cand(pos, ic, uom, dn, cat, dm, tiers, pp, iu, w, h, b, sha, conf, rights, reason):
    rows.append([pos, ic, uom, dn, cat, "", dm, "candidate", 1, 1, tiers, pp, iu, w, h, b, sha, conf, "yes", "yes", "match", rights, "keep", "", "", reason, ""])

# ---------------- CANDIDATES ----------------
cand("1197","SHE-CAB-CB781-BL","PCS","Cab Double Corner Shelf (matt Blk) -CB781-BL","Housewares","CB781-BL","T1,T2",
     "https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb781-bl-detail",
     "https://www.cabana.com.my/images/virtuemart/product/CB781-BL.jpg",3334,3334,316454,
     "62c672084550015f777222d2ada3595520c9d9248efec217d4722a39d4fcfdc0","high","unknown",
     INFRA + " | q:[websearch-429]Cabana CB781 corner shelf Malaysia | q:T2 sibling-id probe: verified PDP pattern /shelf/cbNNN-bl-detail from prior CB476/CB474 candidates -> cb781-bl-detail live 200 | p:https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb781-bl-detail official Cabana MY VirtueMart PDP titled 'Shelf: CB781-BL'; cached text quotes Double Corner Shelf L350xW140mm S/Steel 304 Matt Black (precheck-equivalent TRUE, CB781BL quotable) | p:https://www.cabana.com.my/images/virtuemart/product/CB781-BL.jpg official site asset fetched 200 image/jpeg 3334x3334px 316454B sha256=62c672084550015f777222d2ada3595520c9d9248efec217d4722a39d4fcfdc0; distinct file/sha from sibling CB476-BL/CB474-BL assets (no family-hero reuse) | all named facts match (corner shelf, matt black stainless, CB781-BL); Wayback CDX also confirms resized/cb781-bl_300x300.jpg existed on same host (20250725). action=search")

cand("1191","CUT-BLA-LB39H","PCS","Tajima Spare Blade - 9MM","Abrasives & Cutting","LB39H","T1,T4",
     "https://tajima-tools.com/produkt/cutterklingen-9-mm-30-acute-angle-blade-lb39h/",
     "https://tajima-tools.com/wp-content/uploads/2021/06/ph_004.png",1200,1200,288192,
     "339325e38bc2e16d187b8e07577b7e354410dffe33175b540b08f55e07504577","high","unknown",
     INFRA + " | q:[websearch-429]Tajima LB39H spare blade 9mm | q:[bingrss-junk]Tajima \"LB39H\" blade -> YouTube-Music canned noise | q:T4 CDX tajima-tools.com matchType=domain filter lb39 -> official OEM PDP slug cutterklingen-9-mm-30-acute-angle-blade-lb39h (snapshot 20210919165612) then LIVE fetch 200 | p:https://tajima-tools.com/produkt/cutterklingen-9-mm-30-acute-angle-blade-lb39h/ official Tajima Tool global/EU shop page titled 'CUTTERKLINGEN 9 mm 30 deg Acute Angle Blade LB39H - Tajima-Tools' (LB39H quotable in cached text, precheck-equivalent TRUE) | p:https://tajima-tools.com/wp-content/uploads/2021/06/ph_004.png OEM product asset fetched 200 image/png 1200x1200px 288192B sha256=339325e38bc2e16d187b8e07577b7e354410dffe33175b540b08f55e07504577 | named facts match (spare blade, 9mm, LB39H); tajima-tools.com is Tajima's own brand shop (contact @tajima-tools.de on page). action=search")

# ---------------- EXHAUSTED ----------------
ex("1170","5414 SHH-SPOOL-107" if False else "SHH-SPOOL-107","PCS","Fishing Spool HP-107","Fishing & Tackle","HP-107","T1,T5",
   INFRA + " | q:[bingrss-junk]'\"HP-107\" fishing spool' -> HP Inc computer pages x10 | HP-107 is a spool size code on an unbranded/import-line fishing spool; no manufacturer or OEM domain resolvable through any working channel; only marketplace imagery expected which is below the official-source bar; exhausted with owner action. action=search",
   "Ask the fishing-tackle supplier for the HP-spool series maker and its bag/card artwork (HP-105/106/107 share one card); otherwise photograph the sealed spool in-store")

ex("1171","HOO-S-3PCS-ZT2093","PCK","Zheng Tu 3PCS S Shape Hook Small","Doors & Hardware","ZT2093","T1,T3,T5",
   INFRA + " | q:[bingrss-junk]'Zheng Tu \"ZT2093\" hook' -> cover-letter templates junk | q:T3 probe: CDX zhengtu.cn domain-wide -> derelict 2004-2017 Chinese corporate shell, no tackle catalogue, ZT2093 absent | Zheng Tu is an import-line hook mark sold through marketplaces; no official EN/CN page quoting ZT2093 reachable via any working channel; exhausted with owner action. action=search",
   "Ask the tackle supplier for the Zheng Tu hook importer's pack card for ZT2093 (S-shape small, 3pcs); otherwise photograph the packet in-store")

ex("1172","DRI-SAW-A68-6MM","PCS","Sawman A68 Multi Purpose Drill Bit 6MM","Power Tool Accessories","A68","T1,T5",
   INFRA + " | q:[bingrss-junk]'Sawman \"A68\" drill bit' -> Gmail junk | q:T1 CDX sawman.com/sawman.com.tw/sawman.com.my -> parked/dead domains since 2011, no tool catalogue | 'Sawman' print is unresolvable to a living OEM; A68 is an import-line bit code; marketplace-only imagery expected below the source bar; exhausted with owner action. action=search",
   "Ask the power-tool-accessory supplier which factory makes the Sawman A68 bit line and request its blister-card artwork; otherwise photograph the card in-store")

ex("1173","SHH-RING-1WAY-50LB","PKT","1 Way Wire Rig (i-fixh) 50LB (7CM)","Electrical","50LB","T1,T5",
   INFRA + " | q:[bingrss-junk]'\"i-fixh\" wire rig 50LB' -> Instagram/Wikipedia junk | q:T1 CDX ifixh.com -> EMPTY (domain never archived) | 'i-fixh' is a small tackle-mark; 50LB/7CM are rig specs not a catalogued model; no OEM page reachable through any working channel; exhausted with owner action. action=search",
   "Ask the tackle supplier for the i-fixh rig card artwork (1-way 50LB 7cm); otherwise photograph the sealed rig in-store")

ECO = "Ecogreen is a Malaysian garden-watering line whose web presence is derelict"
for pos, ic, dm, dn in [
    ("1174","HOS-CON-ADA-ECO4011","EG4011","Ecogreen- Tool Adaptor / 3/4"),
    ("1182","HOS-CON-ADA-40200006","EG4012","Ecogreen- Tap Adaptor / 3/4")]:
    uom = "PCS"; cat = "Electrical"
    ex(pos,ic,uom,dn,cat,dm,"T1,T2,T5",
       INFRA + f" | q:[bingrss-junk]'Ecogreen \"{dm}\" adaptor' -> unrelated blog junk | q:T1/T2 direct OEM-domain ladder: ecogreen.com.my live homepage is a 1679-byte placeholder with zero product links; ecogreen.my archived under-construction page only (since 2014); ecogreen2u.com is an unrelated blog | {ECO}; EG4011/EG4012 codes appear on no reachable official page; exhausted with owner action. action=search",
       "Email/request the Ecogreen hose distributor for the EG4011/EG4012 adaptor leaflet or pack shot; otherwise photograph both adaptors in-store")

ex("1175","CLI-SPE-TER-FEM","PCK","Female Speaker Clip Gold (10PCS/PCK)","Other","10PCS/PCK","T1,T5",
   INFRA + " | q:[bingrss-junk]'female speaker clip gold terminal' -> Windows-help junk | detected_model 10PCS/PCK is packaging text; gold female spade clips are pure commodity with no brand or OEM; marketplace-only imagery expected below the source bar; exhausted with owner action. action=search",
   "Ask the electronics-accessories supplier for the clip bag brand artwork; otherwise photograph a 10-piece pack in-store")

ex("1177","GLO-COT-GRY-1220","PAIR","Polyester Grip Cotton Glove Grey","Safety & Workwear","","T1,T5",
   INFRA + " | q:[bingrss-junk]'Glotool polyester grip cotton glove grey' -> Dcard forum junk | q:T1 CDX glotool.com.my -> EMPTY (house-brand domain never archived) | Glotool is Ekoway's house/import brand; grip gloves carry no OEM model or public asset; exhausted with owner action. action=search",
   "Request the Glotool glove carton/pack shot (grey polyester-grip cotton, code GLO-COT-GRY-1220) from the supplier; otherwise photograph a pair in-store")

ex("1178","IND-WIR-MES-2512-18GX100","FTS","Wire Mesh 1 X 1/2 X3 X18G","Electrical","X18G","T1,T5",
   INFRA + " | q:[bingrss-junk]'wire mesh galvanised \"X18G\"' -> Wire-messenger junk | X18G is a gauge token cut from the size string (1x1/2in mesh, 18G, 100ft roll); galvanised wire mesh is commodity with no brand/OEM; exhausted with owner action. action=search",
   "Ask the electrical supplier for the wire-mesh roll label photo (1x1/2in 18G x100ft); otherwise photograph the roll end-label in-store")

ex("1179","SHH-LINE-WHI-NO.30","PCS","(bs)long White M. L No. 30","Fishing & Tackle","NO.30","T1,T5",
   INFRA + " | q:[bingrss-junk]'white nylon fishing line \"NO.30\"' -> Wikipedia white junk | 'M.L No.30' is a monofilament line-class print on an unbranded spool; no OEM resolvable through any working channel; exhausted with owner action. action=search",
   "Ask the tackle supplier for the No.30 white line spool band artwork; otherwise photograph the band in-store")

ex("1180","FLO-MOC-J3030","PCS","J3030 30X30CM","Flooring","J3030","T1,T5",
   INFRA + " | q:[bingrss-junk]'\"J3030\" floor 30x30cm' -> JP catering junk | J3030 30x30cm is an importer tile/mop-pad size code; no brand or OEM domain identifiable through any working channel; exhausted with owner action. action=search",
   "Ask the flooring supplier for the J3030 carton face artwork; otherwise photograph the tile face + box label in-store")

ex("1181","SHH-HOOK-12146BN-2","PKT","No. 2 Hytac Hook 16'S","Fishing & Tackle","12146BN","T1,T3,T5",
   INFRA + " | q:[bingrss-junk]'Hytac hook \"12146BN\"' -> Microsoft campus junk | q:T3 CDX hytac.com -> derelict 2002-2007 flash-era shell, no hook catalogue, 12146BN absent | Hytac is a legacy tackle mark with no living official site; 12146BN is a hook lot code; exhausted with owner action. action=search",
   "Ask the tackle supplier for the Hytac hook packet card (No.2, 16's, code 12146BN); otherwise photograph the packet in-store")

ex("1183","TIE-CAB-SS-100MM","PCK","SS Cable Ties (10PCS/PCK) SUS304 M4.6X100MM","Electrical","M4.6X100MM","T1,T5",
   INFRA + " | q:[bingrss-junk]'stainless steel cable tie \"M4.6X100MM\" SUS304' -> generic stainless-wiki junk | M4.6x100 SUS304 is a dimensional spec, not a branded model; ball-lock SS ties are commodity; marketplace-only imagery expected below the bar; exhausted with owner action. action=search",
   "Ask the cable-tie supplier for the SUS304 tie bag brand artwork (M4.6x100, 10pcs); otherwise photograph the bag in-store")

ex("1184","SHH-SPOOL-106","PCS","Fishing Spool HP-106","Fishing & Tackle","HP-106","T1,T5",
   INFRA + " | q:[bingrss-junk]'\"HP-106\" fishing spool' -> HP Inc computer pages x10 | sibling of pos 5414 HP-107; import-line spool code, no OEM resolvable through any working channel; exhausted with owner action. action=search",
   "Same holding-line as HP-107: request the HP-spool maker's card artwork from the tackle supplier; otherwise photograph the sealed spool in-store")

ex("1185","FIT-YG252-SOC-10MM-BRA","PCS","Straight Brass Connector 10MM","Plumbing","YG252","T1,T5",
   INFRA + " | q:[bingrss-junk]'\"YG252\" brass connector 10mm' -> Meralco junk | YG252 is an importer fitting casting code; unbranded brass socket 10mm has no OEM page reachable through any working channel; exhausted with owner action. action=search",
   "Ask the plumbing supplier which foundry supplies the YG252 straight connector and request its box/bag artwork; otherwise photograph the fitting in-store")

ex("1186","SCP-FIL-POW-464GM","BOX","Scin Powder Filla","Paint & Sundries","464GM","T1,T3,T5",
   INFRA + " | q:[bingrss-junk]'Scin powder filla filler 464gm' -> Naver finance junk | q:T3 CDX scin.com.my -> EMPTY | 'Scin' filler brand unresolvable to any living OEM; 464GM is pack weight not a model; exhausted with owner action. action=search",
   "Ask the paint-sundries supplier for the Scin Powder Filla 464gm box/carton artwork; otherwise photograph the box faces in-store")

ex("1187","CLI-HOS-GP-2.1/2\"","PCS","Gp S/steel Hose CLIP-2.1/2 (40-63MM)","Outdoor & Garden","CLIP-2.1/2","T1,T2,T5",
   INFRA + " | q:[bingrss-junk]'stainless hose clip 2-1/2 40-63mm' -> generic stainless wiki | T2 suffix-split of CLIP-2.1/2 yields only size tokens 40-63MM; GP-stamped worm-drive clips are commodity; no OEM resolvable through any working channel; exhausted with owner action. action=search",
   "Ask the garden/hose supplier for the GP clip bag artwork (2.1/2in, 40-63mm); otherwise photograph a clip + stamp in-store")

ex("1188","SHH-SPOOL-105","PCS","Fishing Spool HP-105","Fishing & Tackle","HP-105","T1,T5",
   INFRA + " | q:[bingrss-junk]'\"HP-105\" fishing spool' -> HP Inc computer pages x10 | third of the HP-spool family (105/106/107); import-line code, no OEM resolvable through any working channel; exhausted with owner action. action=search",
   "Same holding-line as HP-107/106: request the HP-spool maker's card artwork from the tackle supplier; otherwise photograph the sealed spool in-store")

ex("1189","SHH-FLOAT-FF125","PKT","(1 1/4\") Plastic Float (2PCS/PCK)","Fishing & Tackle","2PCS/PCK","T1,T2,T5",
   INFRA + " | q:[bingrss-junk]'\"FF125\" plastic fishing float' -> Fleetguard filter/Fostex junk only | FF125 collides with automotive-filter and headphone codes, never a fishing float OEM; item_code FF125 vs display '(1 1/4\") plastic float' suggests FF=1-1/4 float size code; commodity tackle, no OEM page reachable; exhausted with owner action. action=search",
   "Ask the tackle supplier for the 1-1/4in plastic float card (2pcs pack); otherwise photograph the pack in-store")

ex("1190","CHA-CAP-ROU-EXT-19MM","PCK","Round External Cap 19MM (4PCS/PCK)","Outdoor & Garden","4PCS/PCK","T1,T5",
   INFRA + " | q:[bingrss-junk]'round external cap 19mm chain' -> dictionary/wiki junk | 19mm round external cap is a chain/rail accessory size code on an unbranded bag; no OEM resolvable through any working channel; exhausted with owner action. action=search",
   "Ask the outdoor/garden supplier for the cap bag brand artwork (19mm, 4pcs); otherwise photograph the bag in-store")

ex("1176","PAI-BRU-NIP-STEEL-TR880","PCS","Steel Wired Paint Brush (N10)","Paint & Sundries","N10","T1,T2,T4,T5",
   INFRA + " | q:T1/T2 CDX nippanpaint... nipponpaint.com.my filter brush -> OFFICIAL product URL /product/steel-wired-paint-brush/ (archived 20250423, live redirects renamed) | p:https://www.nipponpaint.com.my/product/steel-wired-paint-brush/ live page now titled 'Bendable Steel Wired Paint Brush' | p:http://web.archive.org/web/20250423023102id_/https://www.nipponpaint.com.my/product/steel-wired-paint-brush/ Wayback revival 200: title still Bendable variant; N10 and TR880 appear NOWHERE in cached text (model precheck False) so the machine model-match cannot be satisfied by this official page; reusing its imagery would be a family-photo violation | N10 is Ekoway's size code needing dealer confirmation against Nippon Paint's steel-wired brush line before any official asset can bind; exhausted with owner action. action=search",
   "Ask the Nippon Paint dealer to cross-check size code N10 (and legacy TR880) against their steel-wired brush price list; else photograph the brush ferrule print in-store")

ex("1192","SHH-SINKER-ROUND-NO.6","PCK","Round Shape Sinker 6 (1PC/PCK)","Fishing & Tackle","1PC/PCK","T1,T5",
   INFRA + " | q:[bingrss-junk]'round shape sinker no 6 fishing' -> dictionary/wiki junk | sinker weight No.6 is a cast-lead size code on an unbranded pack; no OEM resolvable through any working channel; exhausted with owner action. action=search",
   "Ask the tackle supplier for the sinker bag artwork (round No.6, 1pc); otherwise photograph the pack in-store")

for pos, ic, sz in [("1193","FAS-ANC-PJA-0975","3/8 X 3"),("1195","FAS-ANC-PJA-0866","5/16 X 2-5/8")]:
    ex(pos,ic,"PCS",f"Glotool P. J. Anchor {sz}","Fasteners & Fixings","", "T1,T2,T5",
       INFRA + f" | q:[bingrss-junk]'Glotool \"P.J.\" anchor {sz}' -> Facebook-login junk | q:T1 CDX glotool.com.my -> EMPTY (house brand) | Glotool P.J. wedge anchors are house-import fasteners boxed loose; size string {sz} is the only differentiator and no OEM page exists through any working channel; exhausted with owner action. action=search",
       f"Request the Glotool anchor box-face artwork ({sz}) from the fastener supplier; otherwise photograph the labelled box in-store")

ex("1194","SHH-PLA-NET-NEEDLE-NO.5","PCS","Plastic Net Needle No. 5 (white)","Fishing & Tackle","NO.5","T1,T5",
   INFRA + " | q:[bingrss-junk]'plastic net needle no 5 white fishing' -> Zhihu junk | net needle No.5 is a size code on an unbranded tool; no OEM resolvable through any working channel; exhausted with owner action. action=search",
   "Ask the tackle supplier for the net-needle hang-tag artwork (No.5 white); otherwise photograph the tool in-store")

ex("1196","SIN-CAV-CA215","PCS","SS Sink With Waste","Plumbing","CA215","T1,T2,T4,T5",
   INFRA + " | q:[bingrss-junk]'\"CA215\" stainless steel sink waste' -> Microsoft junk | q:T2 parent-group probe (cabana=sorento=Sorento Sdn Bhd): Cabana kitchen-sink category listing contains NO CA215; Sorento VirtueMart search echoes keyword only with zero result rows; /kitchen-sink/ca215-detail guesses 404 | q:T4 CDX cabana.com.my filter ca215 -> EMPTY | CA215 is an importer sink code outside the Cabana/Sorento published range; no OEM page reachable through any working channel; exhausted with owner action. action=search",
   "Ask the sanitary supplier for the CA215 stainless-sink maker and its crate/carton label (sink incl waste); otherwise photograph the bowl stamp + crate in-store")

ex("1198","ELE-CON-MAG-SC-N25","BOX","Contactor SC-N2S","Electrical","SC-N2S","T1,T2,T3,T4,T5",
   INFRA + " | q:[websearch-429]Mitsubishi Electric \"SC-N2S\" magnetic contactor (final retry) | q:[bingrss-junk]SC-N2S contactor -> Facebook-login junk; [bing-html-via-webfetch]site:mitsubishielectric.com \"SC-N2S\" -> Standard-Chartered canned noise | q:T3 CDX mitsubishielectric.com.sg/.co.th filter sc.n2s -> EMPTY; domain-wide .com CDX timed out twice at 25s | q:T2 authorised estore ElectGo: server-side search JS-only (no SC-N2S rows in HTML), /product/* paths bot-wall urllib | p:https://www.mitsubishielectric.com/fa/products/lvd/lvsw/index.html live OEM 'Contactors and Motor Starters' section lists NO SC-series models (classic SC-N2S discontinued, delisted from current FA catalogue) | SC-N2S is real Mitsubishi hardware but no reachable official page quotes it today, so no gate-passing image obtainable; exhausted with owner action. action=search",
   "Email the Mitsubishi Electric FA distributor (or holding supplier) for the legacy SC-N2S datasheet/catalogue scan; otherwise photograph the contactor faceplate + box in-store")

ex("1199","TAP-PRE-TB-2016Q","PCS","Premio: Wall Bib Tap","Plumbing","TB-2016Q","T1,T2,T5",
   INFRA + " | q:[bingrss-junk]'Premio wall bib tap \"TB-2016Q\"' -> Google translate/images junk | q:T2 name-collision audit: premio.com.my is an archived STATIONERY firm (autocad/binding pages 2006-2018, not sanitaryware); premioware.com serves cpanel/webmail parking shells; premiobathware.com and premio.my never archived | Premio tap mark has no living official domain; TB-2016Q quoted nowhere reachable; exhausted with owner action. action=search",
   "Ask the tap supplier for the Premio brand owner and its TB-2016Q wall bib tap leaflet/box artwork; otherwise photograph the tap + carton print in-store")

with open(OUT, "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(HDR)
    w.writerows(rows)

print("rows written:", len(rows))
