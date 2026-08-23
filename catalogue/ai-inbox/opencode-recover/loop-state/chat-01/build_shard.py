import csv, io, os

OUT = r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01\shard-0101-0150.csv"
ROWS = []

def add(pos, code, uom, page="", img="", dec="", conf="", fin="", mod="",
        uom_a="", rights="", reason="", human=""):
    ROWS.append([pos, code, uom, page, img, dec, conf, fin, mod, uom_a, rights, reason, human])

# ---------------- batch 1 (written) ----------------
add("3141","SHH-SINKER-NO.6","PCS",dec="reject",conf="R",fin="no",mod="no",uom_a="pcs_ok",rights="no_asset",
    reason="tier2 start (ledger=1). q:generic fishing sinker no brand/model in catalogue (detected_model junk '1PC/PCK'); tier2 normalization yields nothing (no brand/model string); generic_unbranded lead weight, no OEM page concept; prior reject upheld",human="none")
add("2928","WIN-HOO-PIN-8406","PCK",dec="pending",conf="C",fin="unknown",mod="unknown",uom_a="pck_of_25_ok",rights="unknown",
    reason="tier2 start. q:'SR \"pin hook\" 8406 Malaysia hardware' [websearch 429-blocked most of session]; SR=local repack fastener brand, no official site discoverable; direct probes leeden/senq none; blocker=search_api_429; prior pending upheld",human="retry_when_search_restored")
add("3153","BNW-BOL-SS304-M10-50MM","PCS",dec="reject",conf="R",fin="no",mod="no",uom_a="pcs_ok",rights="no_asset",
    reason="tier2 start. commodity SS304 hex bolt M10x50 (DIN931/A2) generic_unbranded, no OEM page concept; prior reject upheld; q attempts blocked by search_api_429 but category is commodity fastener",human="none")
add("3658","DOR-ROL-CAT-RDL304","PCS",dec="reject",conf="R",fin="no",mod="no",uom_a="pck_of_4_ok_uom_catalogue_pcs",rights="no_asset",
    reason="tier2 start. s/s double roller catch generic door hardware no brand/model OEM; RDL304=item-code suffix not a mfr model found on reachable pages; probe p:https://theleedenstore.com.my/?s=E0813B vertical-mismatch none",human="none")
add("6739","BNW-WAS-M5","PCK",dec="reject",conf="R",fin="no",mod="no",uom_a="pck_of_20_ok",rights="no_asset",
    reason="tier2 start. M5 plain washer 20pk commodity generic_unbranded; no OEM exists; prior reject upheld",human="none")
add("2730","ELE-BUL-C7-E12-MINI","PCS",dec="reject",conf="R",fin="no",mod="no",uom_a="pcs_ok",rights="no_asset",
    reason="tier2 start. C7 E12 mini candle bulb clear commodity lamp generic_unbranded; no OEM page; prior reject upheld",human="none")
add("6054","SOC-BOX-28-13A","PCS",dec="reject",conf="R",fin="no",mod="no",uom_a="pcs_ok",rights="no_asset",
    reason="tier2 start. GI socket box 28mm 13A generic_unbranded electrical box; no OEM; prior reject upheld",human="none")
add("5878","SOC-6MM-3WAY","PCS",dec="reject",conf="R",fin="no",mod="no",uom_a="pcs_ok",rights="no_asset",
    reason="tier2 start. PVC 3/4in 3-way junction box generic_unbranded; no OEM; prior reject upheld",human="none")
add("3306","WAS-TAP-PAI","PCS",dec="reject",conf="R",fin="no",mod="no",uom_a="pcs_ok",rights="no_asset",
    reason="tier2 start. washi tape 24MMx15M unbranded commodity; no OEM; prior reject upheld",human="none")
add("4893",'FAS-SCR-CSK-3" X 8G-PCK',"PCK",dec="reject",conf="R",fin="no",mod="no",uom_a="pck_of_10_ok",rights="no_asset",
    reason="tier2 start. Sr csk tapping screw 3x8G local repack (SR brand) commodity wood screw; no OEM site discoverable; probes leeden/senq none; prior reject upheld",human="none")
add("5317",'NAI-CON-GAL-2.1/2"-PCK',"PCK",dec="reject",conf="R",fin="no",mod="no",uom_a="pck_of_20_ok",rights="no_asset",
    reason="tier2 start. galvanised steel nail 2-1/2in 20pk commodity generic_unbranded; no OEM; prior reject upheld",human="none")
add("3915",'FAS-SCR-TAP-CSK-6#2"',"PACK",dec="reject",conf="R",fin="no",mod="no",uom_a="pack_of_10_ok",rights="no_asset",
    reason="tier2 start. 6x2 csk self-tapping screw flat head 10pk commodity generic_unbranded; no OEM; prior reject upheld",human="none")
add("3646",'FAS-SCR-TAP-CSK-6#2-1/2"',"PACK",dec="reject",conf="R",fin="no",mod="no",uom_a="pack_of_10_ok",rights="no_asset",
    reason="tier2 start. 6x2-1/2 csk self-tap screw 10pk commodity generic_unbranded; no OEM; prior reject upheld",human="none")
add("5258",'FAS-SCR-TAP-CSK-10#2"',"PCK",dec="reject",conf="R",fin="no",mod="no",uom_a="pck_of_10_ok",rights="no_asset",
    reason="tier2 start. 10x2 csk self-tap screw 10pk commodity generic_unbranded; no OEM; prior reject upheld",human="none")
add("5511",'FAS-SCR-TAP-PAN-8#1"',"PACK",dec="reject",conf="R",fin="no",mod="no",uom_a="pack_of_20_ok",rights="no_asset",
    reason="tier2 start. 8x1 pan head self-tapping screw 20pk commodity generic_unbranded; no OEM; prior reject upheld",human="none")
add("5905",'FAS-SCR-TAP-PAN-6#3/4"',"PACK",dec="reject",conf="R",fin="no",mod="no",uom_a="pack_of_20_ok",rights="no_asset",
    reason="tier2 start. 6x3/4 pan head self-tap screw 20pk commodity generic_unbranded; no OEM; prior reject upheld",human="none")
# ---------------- batch 2: evidence-backed ----------------
add("3361","SWI-ADA-MS3106N","PCS",
    page="https://www.yuanming.com.my/product/morries-uk-plug-travel-adaptor-ms3106n/",
    img="https://www.yuanming.com.my/wp-content/uploads/2025/08/41-600x600.png",
    dec="candidate",conf="A",fin="yes",mod="yes",uom_a="pcs_ok_1_unit_adaptor",rights="needs_permission",
    reason="tier2 start. q:Morries MS3106N travel adaptor + q:Morries electrical Malaysia official [search OK after 429 outage]; p:https://www.yuanming.com.my/product/morries-uk-plug-travel-adaptor-ms3106n/ title='MORRIES UK Plug Travel Adaptor with LED Indicator - MS3106N - YUAN MING ELECTRIC SDN. BHD'; page text verbatim 'Model: MORRIES MS3106N ... UK PLUG TRAVEL ADAPTOR LED Lumen 35-60lm Body Color: White'; Yuan Ming carries BRANDS/MORRIES line = MY distributor site; gallery wp-post-image 41.png 600x600 (>=500px); catalogue colour-neutral, page=White; sibling MS3106N-BK black variant NOT used; cross-ref q hit p:https://www.homepro.com.my/p/1075259 'MS3106N WHITE' specs Max Load 13A(3250W) matches; UOM PCS=1 adaptor matches; bytes fetch pending this session via fetcher",human="verify_bytes_then_gate")
add("3039","SWI-SOC-ELE-E0813B","PCS",dec="pending",conf="B",fin="unknown",mod="unknown",uom_a="pcs_ok",rights="unknown",
    reason="tier2 start. q:'E0813B elegance socket' [OK]; brand=ELEGANCE series by RETOUCH (Broadlink Marketing Sdn Bhd) official site retouch.my; p:https://www.retouch.my/showproducts/productid/5703834/cid/577199/sockets/ (official Black sockets page) lists only siblings CODE E0815B 15A round-pin c/w neon and E0813A+CUSBB 13A flat-pin w/ USB PD20W - exact E0813B ABSENT from OEM site (sibling trap, not used); retailer hits prove model string: p:https://thelivingdepot.com.my/retouch-elegance-13a-flat-pin-double-pole-switch-socket-w-o-neon-black--e0813b.9170 'RETOUCH ELEGANCE 13A FLAT PIN DOUBLE POLE SWITCH SOCKET W/O NEON BLACK - E0813B RM14.00', p:https://panda-mt.my/product/retouch-elegance-senses-sockets 'Type E0813B'; retailers not proven authorised MY distributor -> pending colour/model unproven at OEM; probes leeden/senq/ums none",human="contact_broadlink_or_find_authorised_distributor")
add("3223","ELE-T5-4-CIELO-W/W","PCS",
    page="https://cimalighting.com.my/product/cielo-gen2-t5-led-batten-2ft-3ft-4ft-10w-14w-18w-sirim-cetificated",
    img="https://cdn1.sgliteasset.com/eluxelig/images/product/product-5938586/cached/klRotFIO6772683db025f_1735551038_420x420.jpg",
    dec="pending",conf="C",fin="unknown",mod="no",uom_a="pcs_ok",rights="unknown",
    reason="tier2 exhausted(1|2) -> fresh phrasing. q:'Cielo T5 LED batten 18W 4FT Malaysia' [OK]; p:https://cimalighting.com.my/product/cielo-gen2-t5-led-batten-2ft-3ft-4ft-10w-14w-18w-sirim-cetificated Cima Lighting Sdn Bhd (CIELO brand owner) og:title 'CIELO GEN2 T5 LED BATTEN [2FT/3FT/4FT] [10W/14W/18W] - SIRIM CETIFICATED'; desc proves Watt 10W/14W/18W and search snippet proves CCT options 'Daylight 6000K / CoolWhite 4000K / WarmWhite 3000K' matching WW-830=3000K warm-white; BLOCKERS: og:image cached 420x420 < 500px bar (low_res), literal model string 'WW-830' absent from static page (variant JS) so model_exact=no; variable listing covers 9+ variants -> family-listing risk; prior red:model_absent consistent; pending low_res+model_string_unproven",human="request_full_res_image_from_cima_or_confirm_variant_sku")
add("3623","CUT-DIS-MARK-12300-P024","PCS",dec="pending",conf="C",fin="unknown",mod="unknown",uom_a="pcs_ok",rights="unknown",
    reason="tier2 exhausted(1|2) fresh-formulation pass. OEM Mr.Mark (mrmark.com.tw resolves 103.1.221.165) but site serves identical 290082-byte JS SPA shell for all routes incl /index.php?route=product/search&search=12300 - no server-rendered product data (bot-wall proven); search quota 429-blocked during window; prior red:hash_collision; pending js_spa_wall_no_model_proof",human="retry_offpeak_or_contact_mrmark_my_dealer")

add("110","SR-PLACEHOLDER","PKT")

with open(OUT,"w",newline="",encoding="utf-8") as fh:
    w=csv.writer(fh)
    w.writerow(["source_position","item_code","uom","official_product_page","official_image_url","researcher_decision","match_confidence","finish_exact","model_exact","uom_assessment","rights_status","reason","human_action"])
    for r in ROWS[:-1]:
        w.writerow(r)
print("rows written:", len(ROWS)-1)
