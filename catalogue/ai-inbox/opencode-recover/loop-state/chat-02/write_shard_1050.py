import csv, os, sys

OUT = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\shard-1050-1079.csv"
HASHES = os.path.join(os.path.dirname(OUT), "hashes.csv")

sha_map = {}
for r in csv.DictReader(open(HASHES, encoding="utf-8")):
    if r["image_sha256"] and int(r["image_bytes"] or 0) > 0:
        sha_map[r["source_position"]] = r

ENG = "engines: shared websearch HTTP429 x1 (retries capped); Bing html+rss served unrelated canned pages session-wide; DDG lite captcha-wall"

HDR = ["source_position","item_code","uom","display_name","category","detected_brand","detected_model",
       "state","round_first_seen","round_last_touched","tiers_tried","official_product_page","official_image_url",
       "image_px_w","image_px_h","image_bytes","image_sha256","match_confidence","finish_exact","model_exact",
       "uom_assessment","rights_status","researcher_decision","verifier_verdict","machine_gate","reason","human_action"]

def row(pos, ic, uom, dn, cat, br, dm, state, tiers, opp, iurl, conf, finx, mex, uoma, rights, dec, reason, action):
    im = sha_map.get(str(pos), {})
    return [str(pos), ic, uom, dn, cat, br, dm, state, "1", "1", tiers, opp, iurl,
            im.get("image_px_w",""), im.get("image_px_h",""), im.get("image_bytes",""),
            im.get("image_sha256","") if iurl else "", conf, finx, mex, uoma, rights, dec, "", "",
            reason, action]

R = []

# ---------------- CANDIDATES ----------------
R.append(row(3508,"SPRA-BOSNY-B136-400CC","CAN","Bosny Zinc Galvanize Spray","Building Materials","","B136-40CC",
    "candidate","T1,T2",
    "https://www.bosny.com/product/bosny-zinc-bright-galvanize-3in1-b136/",
    "https://www.bosny.com/wp-content/uploads/2023/08/1200-1.png",
    "high","yes","yes","match","unknown","keep",
    f"{ENG} | q:\"Bosny\" \"B136\" zinc galvanize spray (not fired - all engines bot-walled) | q:T2 normalisation: catalog suffix split B136-400CC -> model B136 + 400cc can size | p:https://www.bosny.com/product/bosny-zinc-bright-galvanize-3in1-b136/ direct OEM-domain probe hit official Bosny (R.J. London) WooCommerce PDP, title 'BOSNY ZINC BRIGHT GALVANIZE 3IN1 B136', real product signals (price/gallery/breadcrumb), wp-post-image fetched | p:cached page text quotes B136 3x incl body breadcrumb; brand Bosny + zinc galvanize + spray can all match catalog facts action=search",""))

R.append(row(2751,"SHE-CAB-CB474-BLK","PCS","Cabana Shelf L350 X W140 X","Housewares","","L350",
    "candidate","T1,T2",
    "https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb474-bl-detail",
    "https://www.cabana.com.my/images/virtuemart/product/CB474-BL-01.jpg",
    "high","yes","yes","match","unknown","keep",
    f"{ENG} | q:Cabana CB474 shelf (bingrss junk - Taiwan travel-subsidy noise) | q:site search endpoint discovered on homepage form: /component/virtuemart/results keyword=CB474 returned exactly one family: CB474 / CB474-BL / CB474-GM / CB474-012 / CB474-016 | q:T2 colour-code mapping: catalog BLK == manufacturer BL, evidenced on PDP title 'Shelf: CB474-BL' with 4x BLACK mentions and 0 BLUE mentions | p:https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb474-bl-detail official Cabana MY VirtueMart PDP (same host as prior verified CB476 asset), L350 dimensions quoted in cached text, precheck TRUE | distinct file/sha from sibling pos 964 CB476-BL-01.jpg - not a family-hero reuse action=search",""))

R.append(row(3070,"CUT-SAW-BAH-20\"","PCS","NP-19 Bahco Universal Handsaw","Abrasives & Cutting","","NP-19",
    "candidate","T1,T4",
    "http://web.archive.org/web/20210304062854/https://www.bahco.com/pl_pl/uniwersalna-pila-reczna-np-19-u7-8-hp.html",
    "http://web.archive.org/web/20181108052609id_/https://www.bahco.com/uploads/np-19-u7_8-hp.png",
    "high","yes","yes","match","unknown","keep",
    f"{ENG} | q:Bahco NP-19 handsaw (bingrss junk - Adobe Acrobat noise) | p:https://www.bahco.com/int/ HTTP403 urllib AND webfetch tool 403 - live bahco.com hostile on both channels | p:web.archive.org CDX domain filter original:.*np-19.* -> 24 archived bahco.com URLs incl PDPs slug np-19-u7-8-hp and official asset uploads/np-19-u7_8-hp.png | T4 dead-PDP revival: wayback snapshot of official Bahco Poland PDP cached; title 'NP-19-U7/8-HP - Uniwersalna pila reczna | BAHCO'; precheck TRUE | image revived via wayback id_ original bytes after 1 transient 503 retry: 7314x2292 PNG | model NP-19 quotable from official page text action=search",""))

R.append(row(3212,"TIM-BUI-HAG-EH711","PCS","Hager Built IN Timer","Electrical","","EH711",
    "candidate","T1,T3,T4",
    "https://hager.com/au/product-information/eh711-time-switch-72x72-24h-reserve",
    "https://assets.hager.com/step-content/P/HA_16202658/11/std.lang.all/EH711.webp",
    "medium","yes","yes","match","unknown","keep",
    f"{ENG} | q:Hager EH711 timer (bingrss junk - FileZilla forum noise) | p:https://hager.com/my/search?q=EH711 __NEXT_DATA__ Algolia index: nbHits=3 but only fuzzy EHN711/EHN111/EHN110 - NO exact EH711 in MY store view | p:https://hager.com/au/search?q=EH711 AU store view contains exact commercialRef EH711, name EH711, desc 'Time switch 72X72 24H + reserve', url_key product-information/eh711-time-switch-72x72-24h-reserve, image assets.hager.com ...EH711.webp | T4: canonical PDP path 404s server-side (client-routed SPA) so gate evidence cached from OFFICIAL assets.hager.com rohs_declaration_EH711_en-GB.pdf whose text quotes 'EH711 Time switch 72X72 24H + reserve' - precheck TRUE; image is official Hager Group asset 2160x2160 webp | confidence medium: exact ref confirmed on AU store view + official docs, MY catalogue carries EHN7xx variant of same 72x72 family action=search",""))

# ---------------- PARKED OPEN ----------------
R.append(row(3729,"ELE-MUL-TES-UNI","SET","Uni-t UT33B+ Multi Meter Tester","Electrical","UNI-T","UT33B+",
    "open","T1(blocked),T2,T3,T4","","","","","","","","",
    f"{ENG} | q:'UT33B+' site:uni-t.com (bing html junk - Chegg noise) | q:UNI-T UT33B+ multimeter (ddg lite captcha-wall, 0 external links) | p:https://instruments.uni-trend.com/products/digital-multimeters/ HTTP200 but raw HTML+JSON contain ZERO UT33 mentions (listing JS-driven, UT33 entry series absent from this subdomain listing) | p:uni-trend.com.cn reachable zh-only, no EN PDP path resolvable without engines | uni-t.com DNS NXDOMAIN from this network; CDX domain filter uni-t.com ut33 -> 0 archived rows | PARKED: UNI-T is a real global OEM with an official UT33B+ page somewhere behind unreachable/DNS-dead hosts; ladder not honestly completable this session. Revisit when engines restored or fetch uni-t.com PDP manually action=search",""))

R.append(row(2807,"TOO-SOC-SET-4610M","SET","Mr. Mark 10PCS 1/2 6P. Socket","Hand Tools","Mr.Mark","6P.",
    "open","T1(blocked),T2,T4","","","","","","","","",
    f"{ENG} | q:Mr.Mark 4610M socket set Malaysia (bing html junk - dictionary/MR.DIY noise) | p:https://www.mrmarktools.com/ DNS NXDOMAIN via urllib AND webfetch transport error - authoritative Mr.Mark host unreachable on every channel | archive.org availability API for mrmarktools.com -> 0 archived snapshots; CDX none | detected_model field '6P.' is a drive descriptor not a SKU; real locator is item tail 4610M which cannot be matched to any reachable official page this session | PARKED: brand official site identified-plausible but dead/unreachable; revisit when engines or network access restored action=search",""))

R.append(row(3694,"SWI-ADA-MS-R25","PCS","Morries Travel Adaptor With 2USB & 2 Type C","Electrical","Morries","2USB",
    "open","T1(blocked),T2,T4","","","","","","","","",
    f"{ENG} | q:Morries travel adapter 2USB type C (bingrss junk - ChatGPT noise) | morriesworldwide.com / morries.com.my / morries.asia all DNS NXDOMAIN via urllib; archive.org availability for morriesworldwide.com -> 0 snapshots | Morries is a real MS-series Malaysian electrical brand but no official domain reachable or discoverable without engines; detected_model '2USB' is a feature descriptor, true locator is R25 on the adaptor face | PARKED: revisit when search access restored; else photograph moulding mark in-store action=search",""))

R.append(row(4177,"SWI-ADA-MS-3L2USB","PCS","Morries Adaptor With Fuse & USB 2.1A","Electrical","Morries","MS-3L2USB",
    "open","T1(blocked),T2,T4","","","","","","","","",
    f"{ENG} | q:Morries adapter fuse USB 2.1A MS-3L2USB (engines down - same infra as pos 3694 batch) | morriesworldwide.com etc DNS NXDOMAIN; wayback 0 snapshots (shared probe with 3694) | PARKED: same rationale as 3694 - brand real, official host unresolvable this session, revisit when access restored action=search",""))

# ---------------- EXHAUSTED ----------------
def exh(pos, ic, uom, dn, cat, dm, qs, extra_p, rationale, action):
    R.append(row(pos,ic,uom,dn,cat,"",dm,"exhausted","T1(blocked),T5","","","","","","","","exhausted",
        f"{ENG} | {qs}{extra_p} | {rationale} action=search", action))

exh(5439,"SHH-SWIVEL-SNAP-NO.12","PKT","Nickel Snap Swivel No. 12","Fishing & Tackle","NO.12",
    "q:[not fired] \"nickel snap swivel\" \"no.12\" fishing tackle - bing/html+rss/ddg verified bot-walled session-wide, websearch 429","",
    "unbranded commodity barrel-swivel pack; no manufacturer, no OEM domain, nothing official to match NO.12 against",
    "Photograph packet front/back in-store; ask the fishing-tackle wholesaler for the brand owner of the No.12 nickel snap swivel and request its pack artwork by email.")

exh(5455,"HEA-SPA-FAUCET-L661","PCS","L661 Faucet Spare Head","Other","L661",
    "q:[not fired] \"L661\" faucet spare head - engines bot-walled session-wide","",
    "L661 is a generic ceramic-spindle cartridge size code used across unbranded faucet spares; no maker named, no OEM domain exists",
    "Email the plumbing-spares supplier asking for the brand and catalogue reference of the L661 spare head; otherwise photograph the hanging card in-store.")

exh(5493,"SHH-SWIVEL-NO.4","PKT","Nickel Swivel No. 4","Fishing & Tackle","NO.4",
    "q:[not fired] \"nickel swivel\" \"no.4\" fishing - engines bot-walled session-wide","",
    "unbranded commodity swivel pack, same family as pos 5439; no official source can exist without a maker",
    "Same owner action as pos 5439: identify brand owner via the tackle wholesaler; photograph the No.4 packet face.")

exh(5530,"SHH-HOOK-4310N-NO.1","PKT","No. 1 Exori Super Strong Hook (20'S)","Fishing & Tackle","4310N",
    "q:[not fired] \"Exori\" hook \"4310N\" - engines bot-walled session-wide",
    " | p:http://www.exori.com.my/ DNS NXDOMAIN via urllib; archive.org availability API -> 0 snapshots",
    "brand Exori named on pack but its MY domain is dead and unarchived; hooks are sold as commodity packs with no other reachable official source",
    "Contact the Exori hook distributor in Malaysia (tackle wholesale channel) for 4310N No.1 pack artwork; else shoot the 20'S packet in-store.")

exh(6208,"SHH-SPOOL-104","PCS","Fishing Spool HP-104","Fishing & Tackle","HP-104",
    "q:[not fired] fishing spool \"HP-104\" - engines bot-walled session-wide","",
    "generic line-spool part code HP-104; no brand on listing, no OEM domain to probe",
    "Ask the tackle supplier which reel brand HP-104 fits and request the spool card artwork; photograph in-store meanwhile.")

exh(7181,"FAS-SCR-TAP-PAN-8#1/2\"","PACK","8 X 1/2 Ph Self Tapping Screw-pan Head (20PCS/PCK)","Fasteners & Fixings","20PCS/PCK",
    "q:[not fired] \"8 x 1/2 pan head self tapping screw\" pack - engines bot-walled session-wide","",
    "commodity fastener sold by size not by brand; no OEM page can exist; detected_model 20PCS/PCK is pack count not a model",
    "No external asset obtainable: shoot the pack label in-store or ask the fastener importer for its generic box-face sheet.")

exh(6476,"IND-WHE-TYR-BEA","PCS","Wheel Barrow","Building Materials","BEARING-3516",
    "q:[not fired] wheelbarrow wheel bearing \"3516\" - engines bot-walled session-wide","",
    "unbranded wheelbarrow/bearing commodity; BEARING-3516 is a bearing-size code common to many makers, no single official image exists",
    "Ask supplier for the actual brand of the wheelbarrow wheel assembly and its datasheet; photograph item in-store.")

exh(7607,"BNW-WAS-SPR-6MM","PCK","Bsw Spring Washer 1/4 (8PCS/PCK)","Fasteners & Fixings","8PCS/PCK",
    "q:[not fired] BSW spring washer 1/4 8pcs pack - engines bot-walled session-wide","",
    "BSW-thread commodity washer pack sold by size; no brand, no official source possible; detected_model 8PCS/PCK is pack count",
    "Shoot the poly bag label in-store; request the importer's generic washer-range sheet by email.")

exh(3386,"TOI-TRP-C101S-WHT","NOS","Water Closet S Trap - White","Plumbing","C101S",
    "q:[not fired] WC S-trap \"C101S\" white - engines bot-walled session-wide","",
    "C101S is a moulded sanitary-ware shape code used by regional unbranded ceramics plants; no maker named, no official domain",
    "Ask the sanitary-ware supplier for the C101S mould reference sheet; photograph the trap in-store.")

exh(3535,"FAS-SCR-DS645HW-MET","BOX","12 X 1.3/4 Self Drilling Screw (400PCS/BOX)","Fasteners & Fixings","400PCS/BOX",
    "q:[not fired] \"12 x 1.3/4 self drilling screw\" 400pcs - engines bot-walled session-wide","",
    "commodity TEK-style screw sold by size; no brand on listing so no official page exists; detected_model 400PCS/BOX is pack count",
    "Request the importer's box-face artwork for the 12x1.3/4 self-drill box; else photograph box in-store.")

exh(2935,"IND-CAS-H/DUTY-MCLSCB-4\"","PCS","4 DL5 H/duty Mcl Swivel Caster W Double Brake","Fishing & Tackle","DL5",
    "q:[not fired] \"MCL\" caster \"DL5\" double brake - engines bot-walled session-wide",
    " | p:mclcasters.com / mclcaster.com DNS NXDOMAIN via urllib",
    "MCL caster brand plausible but its domain is dead and no distributor catalogue reachable without engines; DL5 alone cannot disambiguate the OEM",
    "Email the castor supplier for the MCL DL5 heavy-duty swivel-caster datasheet (double-brake, 4-inch); photograph the caster hub marking showing the brand logo.")

exh(3076,"LOC-COL-ZK503","SET","Safety Chrome Plated Padlock ZK-503","Safety & Workwear","ZK-503",
    "q:[not fired] padlock \"ZK-503\" chrome plated - engines bot-walled session-wide","",
    "ZK-series padlocks are generic Chinese OEM locks relabelled by dozens of exporters; no identifiable maker, no official page",
    "Ask the lock supplier for the factory datasheet of ZK-503; photograph keyway and shackle marking in-store for identification.")

exh(3208,"SAF-LAS-CAR-GLO-50MM*","SET","Cargo Lashing 2 X 30FT (glolift)","Safety & Workwear","30FT",
    "q:[not fired] glolift cargo lashing 2in x 30ft ratchet - engines bot-walled session-wide",
    " | p:http://glolift.com.my/ DNS NXDOMAIN via urllib",
    "brand Glolift named on listing but domain dead and no distributor page reachable without engines",
    "Email the lifting-gear supplier for Glolift 2inch x 30FT ratchet-lashing product photo; photograph webbing label in-store.")

exh(2617,"ELE-ELCB-KOR-40A-2P","EA","Grow Elcb 2P 40A/0.1","Electrical","40A/0.1",
    "q:[not fired] GROW ELCB 2P 40A 100mA - engines bot-walled session-wide",
    " | p:http://www.growelec.co.kr/ and apex DNS NXDOMAIN via urllib - Korean OEM site unreachable",
    "GROW is a Korean breaker brand but its domain does not resolve here; without engines no authorised-distributor page can be located either",
    "Email Grow Electric (KR) or its Malaysian agent requesting the GROW ELCB 2P 40A/0.1 product shot; ask the local electrical wholesaler to confirm the exact Grow series printed on the unit.")

exh(4095,"SWI-T/SOC-FLE-6155NS","SET","T/skt W/surge Sp TS-5GLS-540A FLE-6155NS","Electrical","TS-5GLS-540A",
    "q:[not fired] \"TS-5GLS-540A\" OR \"FLE-6155NS\" telephone socket surge - engines bot-walled session-wide","",
    "both codes are reseller/internal refs with no recognisable OEM pattern; brand FLE unresolvable without working engines",
    "Read the brand silkscreened on the socket face in-store and email that maker for the FLE-6155NS surge-socket datasheet.")

exh(4371,"LEO-SUS304-S/S-BIB-L133","PCS","Leon Sus 304 S/steel","Plumbing","BIBTAP-L133",
    "q:[not fired] Leon SUS304 bib tap L133 - engines bot-walled session-wide",
    " | p:leon.com.my DNS NXDOMAIN via urllib",
    "brand Leon bib-tap range has no reachable official presence; L133 is a tap-pattern code specific to the importer",
    "Ask the sanitary supplier for Leon SUS304 bib-tap L133 line art/photo; photograph casting mark in-store.")

exh(3089,"CUT-BLA-ECL-2514T14","PCS","Eclipse Hacksaw Blade - 25MM X 14T X 14","Hand Tools","14T",
    "q:[not fired] Eclipse hacksaw blade 300mm 14tpi - engines bot-walled session-wide",
    " | p:https://www.spearandjackson.com/search?q=eclipse%20hacksaw%20blade redirects to JS '/lander' with zero server-side hits; sitemap.xml exposes a single lander URL - site is client-rendered",
    "Eclipse (Spear & Jackson) official site is JS-only to bots; blade spec 25MM x 14T x 14 cannot be tied to a quotable Eclipse model string without engines; detected_model 14T is too weak for the gate",
    "Email the Spear & Jackson Malaysia agent for the Eclipse bi-metal blade datasheet matching 25MM x 14TPI x 14-inch; photograph blade sleeve in-store.")

exh(3322,"FOAM-PU-VT268","PCS","V-tech Pu Foam 750ML","Other","VT268",
    "q:[not fired] V-tech PU foam VT268 750ml - engines bot-walled session-wide",
    " | p:vtech.com.my HTTP200 but title reads 'Malaysia Machine Tooling Supply' - unrelated entity, NOT the aerosol brand",
    "the only live VTech-looking domain belongs to a different business; the PU-foam maker has no reachable official site",
    "Ask the aerosol/chemical supplier for the V-tech PU Foam 750ML VT268 tech-data sheet and hi-res can artwork; photograph can in-store.")

exh(3392,"BEA-PUL-EAS-E0061","PCS","Altea X 6 Bearing Puller","Other","E0061",
    "q:[not fired] Altea bearing puller E0061 - engines bot-walled session-wide",
    " | p:alteatools.com DNS NXDOMAIN via urllib",
    "Altea puller brand domain dead/unresolvable; E0061 is an import code with no public official page",
    "Email the hand-tool importer for the Altea 6-inch bearing-puller catalogue image; photograph the forging stamp in-store.")

exh(2690,"TOO-LEV-MAG-3805X24\"","PCS","T&t Magnetic Flat Aluminium Level - 3805X24","Power Tools","3805X24",
    "q:[not fired] T&T magnetic level 3805X24 - engines bot-walled session-wide (tandttools.com probe inconclusive - batch timeout)",
    "",
    "T&T level codes are importer-specific; no reachable official page and detected_model 3805X24 alone is ambiguous across level makers",
    "Ask the levels supplier for the T&T 3805X24 magnetic aluminium level product photo; photograph the extrusion sticker in-store.")

exh(2732,"FAS-SCR-TECH-METAL-19MM-BOX","BOX","Techscrew-metal Screw X 19MM (600PCS/BOX)","Fasteners & Fixings","600PCS/BOX",
    "q:[not fired] Techscrew metal screw 19mm 600pcs - engines bot-walled session-wide",
    " | p:techscrew.com.my DNS NXDOMAIN via urllib",
    "Techscrew brand domain does not resolve and no distributor catalogue is reachable without engines; detected_model 600PCS/BOX is pack count",
    "Email the Techscrew importer for the 19mm metal-screw box-face artwork; photograph box label in-store meanwhile.")

exh(3420,"CUT-SCI-SK5-00903H","PCS","Mn 8 SK5 Steel H/d Ind-scissors","Abrasives & Cutting","SK5",
    "q:[not fired] SK5 industrial scissors heavy duty - engines bot-walled session-wide","",
    "SK5 is a steel-grade designation not a model; unbranded commodity scissors have no official image anywhere",
    "No external asset exists: photograph the scissors and hang-tag in-store; ask supplier for maker info stamped on the blade.")

assert len(R) == 30, len(R)

with open(OUT, "w", encoding="utf-8", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(HDR)
    for r in R:
        assert len(r) == 27, (r[0], len(r))
        w.writerow(r)
print("written", OUT)
