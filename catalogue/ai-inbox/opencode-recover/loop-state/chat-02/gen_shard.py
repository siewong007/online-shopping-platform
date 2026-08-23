"""Generate shard-840-869.csv for chat-02 loop. All research executed this session."""
import csv, os

OUT = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\shard-840-869.csv"
HDR = ["source_position","item_code","uom","display_name","category","detected_brand","detected_model",
       "state","round_first_seen","round_last_touched","tiers_tried","official_product_page","official_image_url",
       "image_px_w","image_px_h","image_bytes","image_sha256","match_confidence","finish_exact","model_exact",
       "uom_assessment","rights_status","researcher_decision","verifier_verdict","machine_gate","reason","human_action"]

OUTAGE = "engines: exa MCP HTTP429 whole session; Bing served unrelated canned pages; DDG captcha; Brave/Google/Searx bot-walled"

def row(pos, ic, uom, name, cat, brand, model, state, tiers, reason, action="", dec=""):
    return [pos, ic, uom, name, cat, brand, model, state, "1", "1", tiers, "", "", "", "", "", "",
            "", "", "", "unknown", "", dec, "", "", reason, action]

rows = [
row("4678","CUT-KNI-CK-X11R16","PCS","X11 R16 Bison Cutting Knife","Abrasives & Cutting","","X11","exhausted","T1,T5",
    OUTAGE + " | q:\"X11 R16\" Bison cutting knife (Bing canned-noise) | q:R16 Bison cutting knife (Bing canned-noise) | Unbranded commodity cutting knife; no OEM/brand site discoverable and no working search channel to find one; nothing gate-bindable exists online. Verdict: exhausted with owner shoot.",
    "action=search; shoot the knife in-store at Ekoway counter or request a supplier catalogue photo from the hardware wholesaler","exhausted"),
row("4804","SHH-HOOK-45708-NO.6","PKT","2908 No. 1 Eupro Prawn Hook (15'S)","Fishing & Tackle","Eupro","NO.1","exhausted","T1,T2,T4,T5",
    OUTAGE + " | q:Eupro prawn hook 2908 No.1 (Bing canned-noise) | p:http://eupro.com/index.php?p=hook (live fetch this session; official Eupro hook catalogue lists families 3892BN/3255BN/3918BN/3988BN/3168BN/7930BN only - model 2908 absent) | p:http://web.archive.org/cdx/search/cdx?url=eupro.com*hook*&output=json&limit=15 (0 archived hook URLs) | Official MY-brand site checked directly; legacy prawn-hook code not listed; detected_model NO.1 is a size token so machine gate could not bind any pack art anyway. Verdict: exhausted with owner request to brand importer.",
    "action=search; email Eupro importer IPS Sdn Bhd via eupro.com contact page (ips.com.my linked in site footer) requesting pack photo of hook model 2908 No.1 (15's)","exhausted"),
row("5965","FIT-YG228R-NIP-REC-1/2\"X1/4\"-BRA","PCS","Brass Reduced Nipple 1/2\"X1/4","Plumbing","","X1/4","exhausted","T1,T5",
    OUTAGE + " | q:Nippon brass reduced nipple 1/2 x 1/4 fitting Malaysia (results were Nippon Paint/nippon.com - wrong domain class; no plumbing-fittings PDP) | Commodity brass fitting; NIP prefix maps to Nippon but no fittings line is web-reachable; Nippon Paint Malaysia website terms restrict copied imagery per supplier-permission-contacts.csv. Verdict: exhausted with owner shoot/catalogue request.",
    "action=search; shoot the fitting in-store or request a catalogue photo from the brass-fittings wholesaler supplying Ekoway","exhausted"),
row("4964","SHH-HOOK-9290BN8","PKT","Sode Hook No. 8(18'S)","Fishing & Tackle","","9290BN","exhausted","T1,T5",
    OUTAGE + " | q:Sode hook 9290BN No.8 (Bing junk - flight-sim/dictionary noise) | Unbranded imported hook type (sode pattern), no maker site exists to query; nothing bindable. Verdict: exhausted with owner shoot.",
    "action=search; shoot the hook pack in-store at Ekoway counter","exhausted"),
row("5011","SHH-HOOK-10829BL-NO.08","PKT","Eupro Fishing Hook No. 8 (14PC)","Fishing & Tackle","Eupro","10829BL","exhausted","T1,T2,T4,T5",
    OUTAGE + " | q:Eupro fishing hook 10829BL (Bing canned-noise) | p:http://eupro.com/index.php?p=hook (live fetch this session; official hook catalogue has no 10829 family) | p:http://web.archive.org/cdx/search/cdx?url=eupro.com*hook*&output=json&limit=15 (0 archived hook URLs) | Official brand site lacks this code; gate cannot bind (model string absent anywhere). Verdict: exhausted with owner request.",
    "action=search; email Eupro importer IPS Sdn Bhd via eupro.com contact page requesting pack photo of hook model 10829BL No.8 (14pc)","exhausted"),
row("6325","ELE-HOL-MX660/A","PCS","13A E27 Night Light Holder","Electrical","","E27","exhausted","T1,T5",
    OUTAGE + " | q:MX660/A E27 night light holder (Bing junk - zhihu noise) | Generic holder code MX660/A, no identifiable maker; commodity accessory with no official web presence. Verdict: exhausted with owner shoot.",
    "action=search; shoot the holder in-store at Ekoway counter","exhausted"),
row("3807","BAT-TOS-AA","PCK","Toshiba Battery Aa (4PCS/PCK)","Electrical","Toshiba","4PCS/PCK","exhausted","T1,T3,T5",
    OUTAGE + " | q:Toshiba alkaline AA battery 4 pack (only query that returned real results: toshiba-lifestyle.com/my and asia.toshiba.com/malaysia - appliance sites, no battery PDP) | p:https://www.global.toshiba/ww/products-consumer/battery/ (404) | p:https://www.global.toshiba/ww/products-consumer/battery/battery.html (404) | Official Toshiba MY presence covers appliances only; consumer batteries are licensed merch without reachable MY product page; detected_model 4PCS/PCK is packaging info, not a model code, so the machine gate could never bind an official image. Verdict: exhausted with owner confirmation step.",
    "action=search; email Toshiba Malaysia via toshiba-lifestyle.com/my contact form asking who holds the Toshiba AA-battery licence in MY and request an official AA 4-pack product photo","exhausted"),
row("5272","SHH-HOOK-4310N-NO.10","PKT","No. 10 Exori Super Strong Hook (20'S)","Fishing & Tackle","Exori","4310N","exhausted","T1,T3,T5",
    OUTAGE + " | q:Exori super strong hook 4310N (exa attempt returned HTTP429; Bing attempt returned Path-of-Exile forum noise) | Direct domain probes: exori.co.id / exori.asia / exori.biz all DNS-dead this session | No official Exori web property reachable; same model string as sibling size No.12. Verdict: exhausted with owner shoot/wholesaler request.",
    "action=search; ask Ekoway's fishing-tackle wholesaler for an Exori 4310N No.10 card/pack photo, else shoot the pack in-store","exhausted"),
row("5273","SHH-HOOK-4310N-NO.12","PKT","No. 12 Exori Super Strong Hook (20'S)","Fishing & Tackle","Exori","4310N","exhausted","T1,T3,T5",
    OUTAGE + " | q:Exori super strong hook 4310N (same executed query as No.10 row; exa HTTP429, Bing PoE-forum noise) | exori.co.id / exori.asia / exori.biz DNS-dead | Size suffix differs only; no official asset distinguishable per size without distributor art. Verdict: exhausted with owner shoot/wholesaler request.",
    "action=search; ask Ekoway's fishing-tackle wholesaler for an Exori 4310N No.12 card/pack photo, else shoot the pack in-store","exhausted"),
row("6253","FIT-SS239R-SOC-REC-MXF-3/4\"-SUS304","PCS","SS Mxf Reducing Socket 3/4","Electrical","","SS239R","exhausted","T1,T5",
    OUTAGE + " | q:SS239R reducing socket SUS304 (Bing junk - YouTube support pages) | Commodity stainless fitting code SS239R/MXF; no manufacturer identity; nothing official exists to fetch. Verdict: exhausted with owner shoot.",
    "action=search; shoot the socket in-store at Ekoway counter","exhausted"),
row("6465","VAL-BAL-MMAN-7733#X1/2","PCS","M'man Ball Valve X 1/2","Plumbing","","W/THREAD-7733","exhausted","T1,T5",
    OUTAGE + " | q:M-MAN ball valve 7733 (Bing junk - Wikipedia/hotel noise) | M'man valve brand unverifiable (likely Taiwan trade mark with no web PDP); model token W/THREAD-7733 not resolvable. Verdict: exhausted with owner shoot/importer ask.",
    "action=search; shoot the valve in-store or ask the valve importer named on the carton for a product photo of model 7733","exhausted"),
row("5411","SHH-HOOK-12146BN-1/0","PKT","No. 1/0 Hytac Hook 18'S","Fishing & Tackle","","12146BN","exhausted","T1,T3,T5",
    OUTAGE + " | q:Hytac hook 12146BN (Bing junk - zhihu noise) | p:https://hytac.com (live fetch: CMT Materials CNC tooling company - unrelated namesake) | No fishing-brand Hytac web property found; hook code 12146BN unbindable. Verdict: exhausted with owner shoot.",
    "action=search; shoot the Hytac hook pack in-store at Ekoway counter","exhausted"),
row("5437","SHH-SINKER-HOLE-NO.1","PCK","Hole Sinker No. 1 (10PCS/PCK)","Fishing & Tackle","","10PCS/PCK","exhausted","T1,T5",
    OUTAGE + " | q:hole sinker no.1 fishing 10pcs pack (Bing junk - hole.io game noise) | Commodity lead sinker, no brand; detected_model is packaging count. Nothing official exists. Verdict: exhausted with owner shoot.",
    "action=search; shoot the sinker packet in-store at Ekoway counter","exhausted"),
row("6863","FAS-BOL-ANC06","PCK","Sh Drop IN Anchor 1/4 X 1-1/8 (5PCS/PCK)","Fasteners & Fixings","","5PCS/PCK","exhausted","T1,T5",
    OUTAGE + " | q:drop in anchor 1/4 x 1-1/8 5pcs (Bing junk - YouTube support noise) | Commodity drop-in anchor; 'Sh' prefix gives no resolvable maker; packaging-count model token cannot bind. Verdict: exhausted with owner shoot.",
    "action=search; shoot the anchor pack in-store or request the fastener supplier's trade photo","exhausted"),
row("2939","PIP-HDPE-25MM-N-SIRIM","COIL","HDPE Pipe 25MM (non-sirim)","Plumbing","","PN12.5","exhausted","T1,T5",
    OUTAGE + " | q:HDPE pipe 25mm PN12.5 coil Malaysia (real results were trade directories hub.unitrade.com.my and ewarehouse.my - distributor listings, not an authorised OEM PDP; equivalent to marketplace bar) | Non-SIRIM commodity coil sold by length; no OEM brand to authorise use. Verdict: exhausted with own-photo action.",
    "action=search; photograph our own stock coil in the warehouse (own-photo policy; no third-party rights needed)","exhausted"),
row("3222","ELE-LED-SOL-YB-L10507-34W","SET","Marviss 34W Outdoor Sensor Solar Light (L10517)","Electrical","Marviss","L10517","exhausted","T1,T5",
    OUTAGE + " | q:Marviss L10517 solar sensor light 34W (Bing junk - QQ download noise) | q:Marviss \"L10517\" (Bing junk - Google apps noise) | p:https://www.marviss.com (live fetch: parked Epik lander 'contact with domain owner') | marviss.com.my DNS-dead this session | Brand real (Marviss Marketing Sdn Bhd) but no live official property; NOTE data conflict: item_code carries L10507 while display_name/detected_model carry L10517 - must be resolved before any asset hunt. Verdict: exhausted pending owner clarification.",
    "action=search; email Marviss Marketing Sdn Bhd requesting solar-light media AND confirm whether the correct model is L10507 or L10517 (catalogue conflict)","exhausted"),
row("2744","CHA-SAW-IETO-HD3012","SET","Ieto Electric Chain Saw Stand HD3012","Rope, Chain & Netting","","HD3012","exhausted","T1,T5",
    OUTAGE + " | q:IETO chain saw stand HD3012 (Bing junk - classifieds noise) | ieto.com.my DNS-dead this session | No IETO web property found; stand model HD3012 unbindable. Verdict: exhausted with owner shoot/supplier ask.",
    "action=search; shoot the saw stand in-store or ask the power-tool wholesaler carrying IETO for a product photo of HD3012","exhausted"),
row("3520","FAS-SCR-ZPH-DSMHO620-BOX","BOX","Sr Zph Self Drilling Screw (500PCS/BOX) DSM-HO620","Fasteners & Fixings","","500PCS/BOX","exhausted","T1,T5",
    OUTAGE + " | q:DSM-HO620 ZPH self drilling screw (Bing junk - DSM psychiatry noise) | Commodity self-drilling screws; ZPH/SR prefixes give no resolvable maker; box-count model token cannot bind. Verdict: exhausted with owner shoot.",
    "action=search; shoot the screw box in-store or request the fastener supplier's trade photo for DSM-HO620","exhausted"),
row("3104","MEA-TAP-SENSUI-JBM048-25FT","PCS","25FT Sensui Measuring Tape (S10)","Hand Tools","","25FT","exhausted","T1,T5",
    OUTAGE + " | q:Sensui measuring tape S10 25FT (Bing junk - ChatGPT noise) | sensui.com.my DNS-dead this session | Sensui hand tools have no reachable official site; detected_model 25FT is a size token. Verdict: exhausted with owner shoot.",
    "action=search; shoot the tape measure in-store at Ekoway counter","exhausted"),
row("3103","LOC-COL-RA401","PCS","Colex Anti-cut Steel Padlock RA-401","Locks & Security","Colex","RA-401","exhausted","T1,T5",
    OUTAGE + " | q:Colex padlock RA-401 (Brave attempt HTTP429) | q:Colex anti-cut padlock RA-401 (Bing junk - Apple community noise) | q:Colex \"RA-401\" padlock (Bing junk - Youku noise) | colex.com.my / colex.my / colexlock.com all DNS-dead this session | Colex lock brand real in MY trade but no web property reachable; RA-401 unbindable. Verdict: exhausted with wholesaler/shoot action.",
    "action=search; ask Ekoway's padlock wholesaler/distributor for the Colex RA-401 trade photo, else shoot the packaged lock in-store","exhausted"),
row("4178","SWI-T/SOC-FLE-915-5M5G","SET","Fle T/skt Sp TC-5GL-540B 915-5M","Electrical","Fle","TC-5GL-540B","exhausted","T1,T5",
    OUTAGE + " | q:FLE TC-5GL-540B terminal connector (Bing junk - YouTube support noise) | p:http://fle.com.my (live fetch: 'FLE Global - Global Digital Marketing Agency' - unrelated namesake, not the wiring-accessories FLE) | FLE wiring-accessories principal not web-reachable; TC-5GL-540B unbindable. Verdict: exhausted with owner shoot.",
    "action=search; shoot the terminal set in-store or request the electrical wholesaler's catalogue photo for TC-5GL-540B","exhausted"),
row("4381","SWI-SOC-ULT-M074MG","PCS","Ultra 1GANG Data Out (RJ45)-MAT Grey (M074MG)","Electrical","Ultra","1GANG","exhausted","T1,T3,T5",
    OUTAGE + " | q:Ultra switch \"M20AW\" Malaysia (via webfetch-Bing: canned Microsoft-support page) | q:Ultra \"M074MG\" (Bing junk - Kosovo noise) | q:Ultra M074MG RJ45 data outlet grey (Bing junk - ICBC noise) | p:https://ultra.com.my (live: Ultra Computer Center - unrelated namesake) | p:http://www.ultraelectrical.com (live: parked '/lander' redirect stub) | ultraelectric.com.my / www.ultra-elec.com.my / ultra.com.sg DNS-dead | Real switch brand but every candidate official domain is parked/dead/unrelated; detected_model 1GANG is generic. Verdict: exhausted with principal-identification step.",
    "action=search; identify the Ultra wiring-accessories principal through Ekoway's electrical wholesaler and request an official media pack covering M074MG","exhausted"),
row("4406","BIB-TAP-K2B-LT8114","PCS","Luxtec Wall Bibtap K2B-LT8114","Plumbing","Luxtec","K2B-LT8114","exhausted","T1,T5",
    OUTAGE + " | q:Luxtec K2B-LT8114 wall bib tap (Bing junk - quotes/rakuten noise) | q:Luxtec \"K2B-LT8114\" (Bing junk - BrainyQuote noise) | luxtec.com.my / luxtec.sg DNS-dead this session | Luxtec sanitary brand not web-reachable; K2B-LT8114 unbindable. Verdict: exhausted with owner shoot.",
    "action=search; shoot the bib tap in-store or ask the sanitaryware wholesaler for a Luxtec K2B-LT8114 catalogue photo","exhausted"),
row("2733","FAS-SCR-TECH-METAL-50MM-BOX","BOX","Techscrew-metal Screw X 50MM (250PCS/BOX)","Fasteners & Fixings","","250PCS/BOX","exhausted","T1,T5",
    OUTAGE + " | q:Techscrew metal screw 50mm box Malaysia (Bing junk - Baidu/gov-system noise) | techscrew.com.my DNS-dead this session | Techscrew appears brand-like but no web property resolves; box-count model token cannot bind. Verdict: exhausted with owner shoot.",
    "action=search; shoot the screw box in-store or request the fastener supplier's trade photo","exhausted"),
row("4270","SWI-SOC-MK-NEO-S8423","PCS","Mk 20AX 1 GANG Dp Switch + Neon","Electrical","MK","20AX","open","T1(partial-blocked),T3,T4",
    OUTAGE + " | q:MK electric S8423 switch 20AX neon Malaysia (Bing canned MK-Curtain noise) | q:MK electric \"S8423\" (Bing canned noise) | six exa template queries for S8423 all returned HTTP429 | p:https://www.mkelectric.com/en-gb/search?text=S8423 (SPA shell loaded, JS-only search, 0 server-side hits) | p:https://mkelectric.com.sg/products?q=S2747 variant probes (urllib timeout x2) and webfetch transport error - authoritative MK Asia source unreachable | p:http://web.archive.org/cdx/search/cdx?url=mkelectric.com.sg*s8423*&output=json&limit=15 (0 archived rows) | PARKED: the only plausible official sources (mkelectric.com.sg Asia range carrying S-codes) are unreachable from every channel this session; ladder not honestly completable. Revisit when network/search access restored.",""),
row("4309","ELE-PVC-CAS-2\"X3\"","LGTH","Kancil 2 X 3 X6FT PVC Casing","Electrical","Kancil","X6FT","open","T1(blocked),T3",
    OUTAGE + " | q:Kancil PVC casing trunking 2x3 Malaysia (Bing junk - Korean punctuation noise) | p:https://kancil.com.my (HTTP 403 Forbidden via urllib AND webfetch; error text reveals real entity: Kancil Hardware Industrial Sdn Bhd - official site EXISTS but bot-walls all automated fetchers) | PARKED: official brand site identified but hostile to both direct fetch and webfetch; per parking rule leave open rather than block. Retry kancil.com.my product section manually or with browser session.",""),
row("4460","SHO-BID-NOZZ-SN66","PCS","Vip Stainless Steel Spray Nozzle","Power Tool Accessories","","SN-66","exhausted","T1,T5",
    OUTAGE + " | q:VIP SN-66 stainless spray nozzle (Bing junk - dictionary/VIP-education noise) | 'VIP' nozzle branding gives no resolvable maker; SN-66 unbindable. Verdict: exhausted with owner shoot.",
    "action=search; shoot the nozzle in-store at Ekoway counter","exhausted"),
row("3471","BRA-SHE-S/S-G785-10\"","SET","G785 304 H/duty Shelf Bracket 10\"","Housewares","","G785","exhausted","T1,T5",
    OUTAGE + " | q:\"G785\" stainless shelf bracket (Bing: zero organic results) | Unbranded commodity bracket code G785; no maker identity; nothing official exists. Verdict: exhausted with owner shoot.",
    "action=search; shoot the bracket in-store at Ekoway counter","exhausted"),
row("4540","SWI-SOC-ULT-M20AW","PCS","Ultra 20A Dou Pole Swi Neon-white (M20AW)","Electrical","Ultra","M20AW","exhausted","T1,T3,T5",
    OUTAGE + " | q:Ultra switch \"M20AW\" Malaysia (webfetch-Bing canned Microsoft-support page) | q:Ultra \"M20AW\" variants within Ultra batch above | p:https://ultra.com.my (unrelated computer retailer) | p:http://www.ultraelectrical.com (parked lander) | ultraelectric.com.my / ultra-elec.com.my / ultra.com.sg DNS-dead | Same conclusion as sibling M074MG row: brand real, official channels dead; detected_model M20AW is the true code so a future media pack would bind cleanly. Verdict: exhausted with principal-identification step.",
    "action=search; identify the Ultra wiring-accessories principal through Ekoway's electrical wholesaler and request an official media pack covering M20AW","exhausted"),
row("4216","SWI-SOC-MK-S2747","PCS","Mk 13A X 2 Switch Socket - Slimline Plus","Electrical","MK","S2747","open","T1(partial-blocked),T3,T4",
    OUTAGE + " | q:\"S2747\" \"MK\" site:.com.my / \"S2747\" MK electric official / \"S2747\" filetype:pdf / \"S2747\" authorised dealer / MK electric switch S2747 Slimline / MK electric \"S2747\" Slimline (all: exa HTTP429 or Bing canned Michael-Kors/MK-Curtain noise) | p:https://www.mkelectric.com/en-gb/search?text=S2747 (JS SPA, 0 server-side hits) | mkelectric.com.sg unreachable via urllib timeout x2 and webfetch transport error | p:http://web.archive.org/cdx/search/cdx?url=mkelectric.com.sg*s2747*&output=json&limit=15 (0 archived rows) | PARKED: MK Asia (Slimline Plus S-codes) authoritative source unreachable by every available channel this session. Revisit when access restored; S2747 is a real MK-style code likely listed there.",""),
]

assert len(rows) == 30, len(rows)
with open(OUT, "w", encoding="utf-8", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(HDR)
    for r in rows:
        assert len(r) == len(HDR), (r[0], len(r))
        w.writerow(r)
print("wrote", OUT, "rows:", len(rows))
