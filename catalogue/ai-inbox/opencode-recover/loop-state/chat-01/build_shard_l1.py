#!/usr/bin/env python3
"""Build chat-01/shard-L1.csv for the 35 demoted skip_pass rows."""
import csv

OUT = r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\shard-L1.csv"

CHAN = "[chan:exa-websearch-HTTP429-all-session;SERPs-executed-and-archived-bing-html->chat-01/serp-L1/serps.json]"


def qs(brand, model):
    return [
        f'q1:"{brand}" "{model}" site:.com.my',
        f'q2:"{model}" "{brand}" official',
        f'q3:"{model}" filetype:pdf',
        f'q4:"{model}" site:leeden.com.my OR site:theleedenstore.com.my',
        f'q5:"{brand}" "{model}" distributor Malaysia',
        f'q6:"{model}" authorised dealer',
    ]


def rsn(brand, model, out, extra):
    return (CHAN + " tier1-x6 " + "; ".join(qs(brand, model))
            + " | outcomes: " + out
            + (" | " + extra if extra else ""))


K = "khind.com.my"
rows = []


def add(pos, code, uom, brand, model, page, img, dec, conf, fin, mex, uoma, out, extra, ha):
    rows.append(dict(pos=pos, code=code, uom=uom, page=page, img=img, dec=dec, conf=conf,
                     fin=fin, mex=mex, uoma=uoma,
                     reason=rsn(brand, model, out, extra), ha=ha))


# ---- CANDIDATES ----
add("627", "FAN-CEI-DEKA-CX146BK12", "UNIT", "Deka", "X-One 46",
    "https://deka.my/x-one-46/",
    "https://deka.my/wp-content/uploads/2025/11/X-ONE-46-2560X2560-BK.png",
    "candidate", "A", "yes", "yes",
    "UNIT single ceiling fan retail unit correct",
    "q1 deka.my present but no direct PDP rank; q2/q3/q6 bing rewrote leading phrase 'X-One' to X(social network) junk; q5 generic deka set; q4 no leeden hit",
    "OEM probe deka.my nav+search confirms X-ONE 46 PDP live; X-ONE-46-2560X2560-BK.png matches item finish Black",
    "none - official Deka asset exact model+finish")

add("632", "FAN-CEI-DEKA-CDKN54MG12", "UNIT", "Deka", "KONI 54",
    "https://deka.my/koni-54/",
    "https://deka.my/wp-content/uploads/2025/07/KONI-54-MG-Jpg.jpg",
    "candidate", "A", "yes", "yes",
    "UNIT single ceiling fan retail unit correct",
    "q1 generic deka set only; q2 ubuntu junk(rewritten); q3/q4 junk; q5 generic deka; q6 apk junk; no exact SERP PDP",
    "OEM probe deka.my KONI 54 PDP live under ECO DC/MID RANGE nav; KONI-54-MG-Jpg.jpg matches Magnesium finish",
    "none - official Deka asset exact model+finish")

add("772", "FAN-CEI-DEKA-CDKN54OAK12", "UNIT", "Deka", "KONI 54",
    "https://deka.my/koni-54/",
    "https://deka.my/wp-content/uploads/2025/07/KONI-54-OAK-Jpg.jpg",
    "candidate", "A", "yes", "yes",
    "UNIT single ceiling fan retail unit correct",
    "identical query-set to pos 632 (same brand+model strings); shared archived SERPs",
    "OEM probe KONI 54 PDP live; KONI-54-OAK-Jpg.jpg matches Oak finish",
    "none - official Deka asset exact model+finish")

add("640", "FAN-CEI-DEKA-CCM34MG12", "UNIT", "Deka", "Concept Mini",
    "https://deka.my/concept-mini/",
    "https://deka.my/wp-content/uploads/2025/07/CONCEPT-MINI-MG-Jpg.jpg",
    "candidate", "A", "yes", "yes",
    "UNIT single ceiling fan retail unit correct",
    "q1 generic deka set; q2-q4,q6 dictionary 'concept' junk; q5 generic deka; no exact SERP PDP",
    "OEM probe CONCEPT MINI PDP live under CONCEPT Series nav; CONCEPT-MINI-MG-Jpg.jpg matches Magnesium finish",
    "none - official Deka asset exact model+finish")


def khind(pos, code, model, handle, fname, v, uoma, note=""):
    img = f"https://cdn.shopify.com/s/files/1/0921/1566/5177/files/{fname}?v={v}"
    add(pos, code, "SET", "Khind", model,
        f"https://{K}/products/{handle}", img,
        "candidate", "A", "yes", "yes", uoma,
        "all six bing SERP junk or safesearch-blocked (archived); no usable SERP hit",
        "OEM Shopify suggest.json probe: exact product title-match '" + model + "' on khind.com.my (handle "
        + handle + "); official featured_image " + fname + note,
        "none - official Khind asset exact model")


khind("469", "GAS-STO-KHI-GC6010", "GC6010", "khind-gas-cooker-gc6010",
      "gc6010-hi_220523171908.jpg", "1751809699",
      "SET gas cooker retail set correct", " (featured_image 4288x2848)")
khind("446", "VAC-KHI-VC68P", "VC68P", "vacuum-cleaner-vc68p-160061299",
      "vc68p-cover_220721131926_2a27f2fb-6483-4697-84ad-75ecc2a7d160.jpg", "1751809349",
      "SET vacuum cleaner retail set correct")
khind("578", "PRE-STO-KHI-SPC6", "SPC6", "east-malaysia-exclusive-smart-pressure-cooker",
      "spc6_230821170400.jpg", "1751809563",
      "SET pressure cooker retail set correct")
khind("440", "VAC-KHI-VC8020MS", "VC8020MS", "canister-vacuum-cleaner-vc8020ms",
      "ssmy.zone-1693885930-VC8020MS_wh_cover.jpg", "1751809268",
      "SET canister vacuum retail set correct")
khind("442", "MIX-KHI-HM200", "HM200", "hand-mixer",
      "ssmy.zone-1721101196-HM200_WH.jpg", "1751809038",
      "SET hand mixer retail set correct")
khind("523", "KHI-IRO-EI405-GRY", "EI405", "electric-dry-iron",
      "ei405-wh-cover_190523162150.jpg", "1751809338",
      "SET electric iron retail set correct")
khind("647", "VAC-KHI-VC8630", "VC8630", "khind-vacuum-cleaner-vc8630",
      "VC8630_cover_KOL_ed4d8500-314c-4871-b62a-7beaf7d45972.jpg", "1751809252",
      "SET stick vacuum 2-in-1 retail set correct")
khind("477", "JUG-KHI-EK502", "EK502", "khind-5l-stainless-steel-kettle-ek502",
      "ek502-wh-cover_220523155050.jpg", "1751809340",
      "SET 5.0L kettle retail set correct", "; sibling EK5025 excluded - exact EK502 handle used")
khind("522", "KHI-COO-MC121", "MC121", "multi-cooker-mc121",
      "mc121-1-kol_150622103348.jpg", "1751809249",
      "SET 1.2L multi cooker retail set correct")

add("1202", "TAP-SAN-SWS-304-3977", "PCS", "Saniware", "SWS-304-3977",
    "https://saniware.com/product/sws-304-3977/",
    "https://saniware.com/wp-content/uploads/2021/03/SWS-304-3977.jpg",
    "candidate", "A", "yes", "yes",
    "PCS single tap retail piece correct",
    "bing SERP junk archived; earlier harvest-livecheck slug-match was sibling sws-304-2874 (not used)",
    "OEM probe PDP live 200 og_title='Premier Basin Tap Series SWS-304-3977 - Saniware'; og:image exact-model jpg (~92KB head)",
    "none - official Saniware asset exact model")

add("1440", "VAL-SAN-SW-SS-AV-80", "PCS", "Saniware", "SW-SS-AV-80",
    "https://saniware.com/product/sw-ss-av-80-2/",
    "https://saniware.com/wp-content/uploads/2021/03/SW-SS-AV-80-1.jpg",
    "candidate", "A", "yes", "yes",
    "PCS angle valve retail piece correct",
    "bing SERP junk archived; harvest-livecheck had already slug-matched this PDP",
    "OEM probe PDP live 200 og_title='Angle Valve SW-SS-AV-80 - Saniware'; og:image exact-model jpg (~66KB head)",
    "none - official Saniware asset exact model")

add("1996", "BID-CAB-CB91SS-BL-DIY", "PCS", "Cabana", "CB91SS-BL-DIY",
    "https://cabana.com.my/index.php/products/bathroom/bidet/cb90ss-bl-diy-detail",
    "https://cabana.com.my/images/virtuemart/product/CB91SS-BL-DIY-01.jpg",
    "candidate", "A", "yes", "yes",
    "PCS hand bidet DIY retail piece correct",
    "all six bing SERP junk; cabana.com.my never surfaced by any of the six",
    "OEM probe cabana.com.my (Joomla/VirtueMart, 559 detail URLs crawled): page <title> literal 'Bidet: CB91SS-BL-DIY'; product image CB91SS-BL-DIY-01.jpg; URL slug quirk says cb90ss-bl-diy-detail while title/image are CB91SS-BL-DIY",
    "confirm OEM-side slug/title mismatch; image filename is exact model")

add("2067", "BID-CAB-CB90SS-DIY", "PCS", "Cabana", "CB90SS-DIY",
    "https://cabana.com.my/index.php/products/bathroom/bidet/cb90ss-diy-detail",
    "https://cabana.com.my/images/virtuemart/product/CB90SS-DIY-01.jpg",
    "candidate", "A", "yes", "yes",
    "PCS hand bidet DIY retail piece correct",
    "all six bing SERP junk; cabana.com.my never surfaced by any of the six",
    "OEM probe: page <title> literal 'Bidet: CB90SS-DIY'; product image CB90SS-DIY-01.jpg exact model",
    "none - official Cabana asset exact model")

add("2602", "IND-CEM-GREY-25KG", "BAG", "Sika", "SikaCeram-88",
    "https://mys.sika.com/en/construction/tile-setting/tile-adhesives/sikaceram-88.html",
    "https://sika.scene7.com/is/image/sikacs/my-SikaCeram-88-25kg-01536099:1-1",
    "candidate", "A", "yes", "yes",
    "BAG 25kg bag packaging matches 25KG/BAG",
    "bing SERP junk archived; ledger's prior scene7 URL carried wid=480 crop params -> red:too_small",
    "OEM probe mys.sika.com PDP live 200; same scene7 asset recovered WITHOUT wid/hei crop params (my-SikaCeram-88-25kg-01536099:1-1) -> full-res",
    "fetch full-res variant; expect >=500px/>=20KB")

add("3630", "GROUT-SEAL-703", "CAN", "Sika", "Sikagard 703 Groutseal",
    "https://mys.sika.com/en/home-improvement/waterproofing/sikagard-703-groutseal.html",
    "https://sika.scene7.com/is/image/sikacs/my-02-en-MY-Sikagard-703-GroutSeal-1x1-00557701:1-1",
    "candidate", "A", "yes", "yes",
    "CAN 1-litre can matches 1LTR",
    "bing SERP junk archived; prior red:model_absent traced to crop-variant sizing",
    "OEM probe mys.sika.com PDP live 200 og_title='Sikagard(R)-703 GroutSeal'; scene7 asset without crop params my-02-en-MY-Sikagard-703-GroutSeal-1x1-00557701:1-1",
    "fetch full-res variant; expect >=500px/>=20KB")

# ---- PENDING ----
def pend(pos, code, uom, brand, model, uoma, out, extra, ha):
    add(pos, code, uom, brand, model, "", "", "pending", "D", "", "", uoma, out, extra, ha)


B_OUT = "all six bing SERP junk or safesearch-blocked (archived)"
B_EXTRA = ("bosch-pt.com.my probes: robots.txt names sitemap_index_my.xml but its products-sitemaps.xml/"
           "ocs-products-sitemaps.xml children return EMPTY bodies; /my/en/search endpoints 404; "
           "earlier harvest scan of 7443 bosch urls found no slug match")

pend("826", "BOS-0601-6B3-0L1", "UNIT", "Bosch", "GKS 140",
     "UNIT power tool correct", B_OUT, B_EXTRA,
     "retry when exa restored; then bosch OCS API/part-number URL guess")
pend("950", "BOS-0601-3A0-0L0", "UNIT", "Bosch", "GDC 140",
     "UNIT power tool correct", B_OUT, B_EXTRA, "retry when exa restored")
pend("821", "BOS-0601-5A2-0L0", "UNIT", "Bosch", "GKS 235 Turbo",
     "UNIT power tool correct", B_OUT, B_EXTRA, "retry when exa restored")
pend("810", "BOS-0601-9E5-1L0", "UNIT", "Bosch", "GAS 15 PS",
     "UNIT vacuum cleaner correct", B_OUT, B_EXTRA, "retry when exa restored")
pend("856", "BOS-0601-1C4-0L0", "UNIT", "Bosch", "GRW 140",
     "UNIT mixer tool correct", B_OUT, B_EXTRA, "retry when exa restored")
pend("986", "BOS-0601-58F-0L0", "UNIT", "Bosch", "GST 90 BE",
     "UNIT jigsaw correct", B_OUT, B_EXTRA, "retry when exa restored")
pend("991", "BOS-0601-9H2-281", "UNIT", "Bosch", "GO 3",
     "UNIT cordless screwdriver kit correct",
     "all six bing SERP junk ('GO 3' rewritten to Go-language/X results)",
     B_EXTRA + "; display name maps to Bosch GO Gen 3 cordless screwdriver",
     "retry with 'GO Gen 3' phrasing when exa restored")

pend("2557", "BOS-2608-521-043", "PCS", "Bosch", "2608521043",
     "PCS single bit retail piece correct",
     "all six bing SERP junk (part number tokenised)",
     B_EXTRA + "; Bosch accessory part numbers usually sit on -ocs-ac URLs",
     "retry when exa restored; then guess ocs-ac accessory URL pattern")

pend("621", "FAN-PSN-F-M14DZVBKH", "PCS", "Panasonic", "F-M14DZVBKH",
     "PCS ceiling fan unit correct",
     "all six bing SERP junk (Microsoft/Facebook filler); panasonic.com/my blocks scripts (403) incl robots.txt/sitemap",
     "'Bayu' = MY market series name; no reachable OEM PDP this pass",
     "retry panasonic.com/my via browser-context fetch when exa restored")

pend("449", "X-PSN-NI-317W-LN", "PCS", "Panasonic", "NI-317W",
     "PCS dry iron unit correct",
     "all six bing SERP junk; panasonic.com/my unreachable to scripts (403)",
     "detected_model field reads '317W-LN'; queries normalised to NI-317W per item code X-PSN-NI-317W-LN and 'Polished 0.9KG Iron' naming",
     "confirm exact Panasonic MY sku (NI-317W vs NI-317W-LN) then retry")

pend("1028", "RIC-COO-MID-MRM18010BDG", "PCS", "Midea", "MRM18010BDG",
     "PCS rice cooker unit correct",
     "all six bing SERP junk; midea.com.my sitemap returns SPA HTML shell; ?s= searches render no MRM links server-side; midea.com/my search also JS-rendered",
     "",
     "retry when exa restored; check Midea MY official-store policy for marketplace-only skus")

CAB_OUT = "all six bing SERP junk; cabana.com.my never surfaced"
for pos, code, model, cat in [
    ("3772", "TAP-CAB-CB6331", "CB6331", "drinking tap"),
    ("1900", "TAP-CAB-CB2807", "CB2807", "basin tap"),
    ("2022", "TAP-CAB-CB65SS-GM", "CB65SS-GM", "basin cold tap gunmetal"),
    ("4880", "TAP-CAB-CB2805A", "CB2805A", "hose bib tap"),
    ("4881", "TAP-CAB-CB2806A", "CB2806A", "bib tap"),
]:
    pend(pos, code, "PCS", "Cabana", model,
         "PCS " + cat + " retail piece correct",
         CAB_OUT,
         "OEM probe: cabana.com.my IS the OEM site (Joomla/VirtueMart); 43 category pages + 559 detail URLs crawled; "
         + model + " absent from current online catalogue (" + cat
         + " categories crawled); Joomla component search endpoint 404",
         "catalogue-absent on OEM site (possible discontinued); retry via exa once restored before any reject")

HEADER = ["source_position", "item_code", "uom", "official_product_page", "official_image_url",
          "researcher_decision", "match_confidence", "finish_exact", "model_exact",
          "uom_assessment", "rights_status", "reason", "human_action"]

with open(OUT, "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(HEADER)
    for r in rows:
        w.writerow([r["pos"], r["code"], r["uom"], r["page"], r["img"], r["dec"], r["conf"],
                    r["fin"], r["mex"], r["uoma"], "unknown", r["reason"], r["ha"]])
print("wrote", OUT, len(rows), "rows")
cand = sum(1 for r in rows if r["dec"] == "candidate")
pend_n = sum(1 for r in rows if r["dec"] == "pending")
rej = sum(1 for r in rows if r["dec"] == "reject")
print("candidate:", cand, "pending:", pend_n, "reject:", rej)
