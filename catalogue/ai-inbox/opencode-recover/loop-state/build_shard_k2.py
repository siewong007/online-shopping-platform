#!/usr/bin/env python3
"""Build shard-0751-0839.csv for researcher slot K2 (ordinals 751-839 of chat-01)."""
import csv, io, json, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

LS = os.path.dirname(os.path.abspath(__file__))
ROWS = os.path.join(LS, "chat-01", "k2-rows.csv")
SERPS = os.path.join(LS, "chat-01", "serp-K2", "serps.json")
OUT = os.path.join(LS, "chat-01", "shard-0751-0839.csv")

serps = json.load(open(SERPS, encoding="utf-8"))

def qlist(pos):
    key = pos if pos in serps else ("3579" if pos == "3584" else pos)
    v = serps.get(key)
    if not v:
        return "[chan:bing_fallback+ddg_local-runner;no-serp-entry]"
    kinds = "; ".join(f"q{i+1}:{r['kind']}({len(r['results'])})" for i, r in enumerate(v["rows"]))
    chan = sorted({r["note"].split("|")[0] for r in v["rows"]})
    return f"[chan:{'+'.join(chan)};SERPs-executed-and-archived->chat-01/serp-K2/serps.json] tier1-x6 {kinds}"

# bing no-JS globally served junk/safesearch this session; websearch-tool results noted where used
CHAN_NOTE = "bing-noJS-served-junk/safesearch-all-session"

# pos -> dict(decision, conf, finish_exact, model_exact, uom, rights, human, probe)
D = {}
def d(pos, dec, conf="", fe="", me="", uom="n/a no authoritative page", rights="", hum="", probe=""):
    D[pos] = dict(dec=dec, conf=conf, fe=fe, me=me, uom=uom, rights=rights, hum=hum, probe=probe)

GEN = "generic_unbranded commodity; marketplace-only imagery; never borrow sibling photos"
GENH = "shoot product in-store"
REJ = lambda pos, extra="": d(pos, "reject", "", "", "", "n/a no authoritative page",
                              "", GENH, extra or GEN)

# ---- CANDIDATES ----
d("4057", "pending", "", "yes", "yes",
  "PCS single snap-in coupling correct vs OEM fitting item",
  "unknown", "obtain >=500px official asset or photograph in-store",
  "OEM probe ecogreen-garden.com fittings page live; page line '#4021' + 'One way snap-in coupling'; display EG4021 maps to OEM #4021 one-way snap-in coupling (MY sellers list as Ecogreen 4021); wixstatic e2e81a_2517019c...mv2.png alt '4021.png'; evidence round4: img HTTP200 sha300710be.. 330x330 28KB - model proven but FAILS >=500px BAR -> pending")
d("3184", "pending", "", "yes", "yes",
  "PCS single universal connector correct",
  "unknown", "obtain >=500px official asset or photograph in-store",
  "same OEM fittings page; page line '#4134 ... connector - UNIVERSAL' captioned 1/2\",5/8\",3/4\" matching display 'Quick Connector (universal) 1/2, 5/8, 3/4'; wixstatic e2e81a_dcdded5c...mv2.png alt '4134.png'; evidence round4: img HTTP200 shad42581cb.. 330x330 48KB - FAILS >=500px BAR -> pending")
d("4780", "candidate", "A", "yes", "yes",
  "PCS single switch unit correct",
  "unknown", "none if gate passes - official reTOUCH/Broadlink asset exact model+finish",
  "OEM retouch.my PDP productid/5818228 cid585128 category path Ultra Rimless>Matte Grey; page code table line 'M031MG - 3 GANG 1 WAY' proves model; matte-grey finish from category node; npcdn userfiles MG26.png is the 3-GANG figure beside the code")

# ---- PENDING ----
d("4907", "pending", "", "", "", "PKT 10-pc pack plausible unverified", "unknown",
  "photograph in-store; request Eupro hook card art from distributor Haiyen",
  "brand OEM euprointernational.com (Haiyen Sports Fishing, Tangkak Johor) confirmed live but publishes rods/reels/lures/lines categories only - hook SKU 10829 not listed; shopee 10829BN sibling listing only")
d("4425", "pending", "", "", "", "PKT 7-pc pack plausible unverified", "unknown",
  "photograph in-store", "lazada 'EUPRO INTERNATIONAL O'SHAUGHNESSY 1920SS STAINLESS STEEL HOOK' listing found; OEM site lacks hook PDPs")
for p in ("5145", "5146", "5147"):
    d(p, "pending", "", "", "", "PKT 20s/10s count unverified", "unknown", "photograph in-store",
      "exorifishing.com OEM catalog live (IDR market) but 4310N absent; MY marketplaces carry 4310BHC sibling suffix not N")
d("4641", "pending", "", "", "", "PKT 20s unverified", "unknown", "photograph in-store",
  "surecatchworld.com official (SureCatch World Pte Ltd) live; Biru-406 prawn-hook SKU not published there; shopee/lazada listings only")
d("4209", "pending", "", "", "", "PKT 20s unverified", "unknown", "photograph in-store",
  "Eagle Wave DX-400 sold widely on lazada/shopee/facebook resellers; no OEM site found")
d("2866", "pending", "", "yes", "yes", "PCS single padlock correct", "unknown",
  "verify HomePro authorised-retailer status or obtain Colex brand asset; photograph in-store fallback",
  "homepro.com.my/p/1073968 'COLEX PRO ANTI-CUT SINGLE PADLOCK RA501 50MM' RM45.90 matches RA-501 chrome anti-cut; esales.com.my also lists; manufacturer site unfound so authorisation unproven")
d("2953", "pending", "", "", "", "PCS single padlock correct", "unknown", "photograph in-store",
  "esales.com.my/product/colex-rb401 + shopee RB401 long-shackle listings; no clean >=500px authorised asset")
d("2810", "pending", "", "yes", "", "PCS single blade correct", "unknown",
  "confirm 14-inch reading of item suffix X14; request Spear&Jackson/Eclipse asset",
  "tulips.com.my productid/1865190 ECLIPSE HSS Hacksaw Blade spec table row 'ECHS1410 | 14'' X 1'' X 10T' matches 25MM(1in)x10T x14 reading; thumbnail-only imagery")
d("4948", "pending", "", "", "", "PCS single outlet correct", "unknown",
  "obtain official M073W white RJ11 asset from retouch.my", 
  "retouch.my Ultra Rimless WHITE series exists; gluckhardware variant list includes 'M073W' under RETOUCH Ultra Rimless Switch Series (WHITE Series) but no dedicated PDP image")
d("2716", "pending", "", "", "", "PCS single shear correct", "unknown", "photograph in-store",
  "official estore.jayamata.com.my live with JM-series shears (JM202/JM601/JM602/JM701) but JM-1002 curved-8 not located")
d("2133", "pending", "", "", "", "CAN aerosol correct", "unknown",
  "request Paint Master spray-can artwork; photograph in-store fallback",
  "paintmaster.my = PAINT MASTER SDN BHD official; products sitemap opaque IDs, spray-paint No.6 orange-red not located; sonichardware.com.my lists 'Paint Master Spray Paint Doz #6 Red'")
d("4529", "pending", "", "", "", "PCS single nozzle correct", "unknown", "photograph in-store",
  "ecogreen-garden.com accessories page shows '#4525 7-pattern plastic gun SET' and fittings #40xx/#41xx; standalone #4440 gun page not located")
d("2665", "pending", "", "", "", "PCS single capsule lamp correct", "unknown",
  "photograph in-store; legacy National/Panasonic discontinued lamp",
  "National = legacy Matsushita/Panasonic MY brand (consolidated 2000s); T16W incandescent capsule not in current panasonic.com/my lighting catalog")
d("3792", "pending", "", "", "", "PCS single pad correct", "unknown", "photograph in-store",
  "Sandex abrasive brand known SG/MY; facoabrasive sells generic velcro pads; no Sandex official PDP found this session")

# ---- REJECTS (generic/unbranded/house-brand) ----
for p in ("4136","6513","5108","5319","3029","3894","4574","6800","4647","6682","6819","6820",
          "5913","4814","6916","6917","5998","6108","3179","6217","2860","3048"):
    REJ(p)
REJ("3660", "Lanric brand string unverifiable beyond listing text; marketplace-only")
REJ("2979"); REJ("3059"); REJ("4046"); REJ("2654"); REJ("3241")
REJ("788placeholder") if False else None
REJ("2839", "Activ house aerosol brand; no OEM garden-sprayer asset"); REJ("4711")
REJ("2861"); REJ("3581"); REJ("2805"); REJ("2848")
REJ("3579")  # parang AK350 (also covers dup pos-3579 YG782 bracket via shared archived SERP)
REJ("2806"); REJ("3687"); REJ("2302"); REJ("2870")
REJ("3833"); REJ("3100"); REJ("4032"); REJ("4098"); REJ("3285"); REJ("2892")
REJ("3097"); REJ("3995"); REJ("4222"); REJ("5076")
REJ("3691", "Korakoh brand unverifiable beyond listing text; marketplace-only rain boots")
REJ("3692", "Korakoh brand unverifiable beyond listing text; marketplace-only rain boots")
REJ("3584", "parang AK350 house-brand machete; marketplace-only imagery")
REJ("3579", "YG782 shelf bracket unbranded commodity; shares archived SERP set of pos-3584 parang family (bing junk)")
REJ("5231"); REJ("4352"); REJ("4111"); REJ("5653"); REJ("5546"); REJ("4561")
REJ("4667"); REJ("5339"); REJ("5428"); REJ("4509")
REJ("5732", "MB15AK generic MIG consumable (Binzel-style); many resellers; no ownable OEM asset")
REJ("3674"); REJ("5982"); REJ("5697"); REJ("5983"); REJ("3514"); REJ("3650"); REJ("5922")

PAGE = {
 "4907": "https://euprointernational.com/",
 "5145": "https://exorifishing.com/", "5146": "https://exorifishing.com/", "5147": "https://exorifishing.com/",
 "4641": "https://www.surecatchworld.com/",
 "2866": "https://www.homepro.com.my/p/1073968",
 "2953": "https://esales.com.my/product/colex-rb401-anti-cut-padlock",
 "2810": "https://www.tulips.com.my/showproducts/productid/1865190/eclipse-hss-hacksaw-blade/",
 "4948": "https://www.gluckhardware.com.my/showproducts/productid/6056878/cid/610547/retouch-ultra-rimless-switch-series-white-series",
 "2716": "https://estore.jayamata.com.my/",
 "2133": "https://www.paintmaster.my/",
 "4529": "https://www.ecogreen-garden.com/copy-of-spray-guns",
}
CAND = {
 "4057": ("https://www.ecogreen-garden.com/our-products-1",
          "https://static.wixstatic.com/media/e2e81a_2517019c563742869a750aed65a05346~mv2.png"),
 "3184": ("https://www.ecogreen-garden.com/our-products-1",
          "https://static.wixstatic.com/media/e2e81a_dcdded5cee5f437aad0b6553421d79d4~mv2.png"),
 "4780": ("https://www.retouch.my/showproducts/productid/5818228/cid/585128/ultra-rimless-16a-light-switches/",
          "https://cdn1.npcdn.net/userfiles/27047/file/MG26.png"),
}

rows_out = []
with open(ROWS, newline="", encoding="utf-8") as fh:
    src = list(csv.DictReader(fh))

seen3579 = False
for r in src:
    pos = r["source_position"]
    info = D.get(pos)
    if info is None:
        raise SystemExit(f"missing decision for pos {pos}")
    dec, conf = info["dec"], info["conf"]
    pg, img = "", ""
    if pos in CAND:
        pg, img = CAND[pos]
    elif pos in PAGE:
        pg = PAGE[pos]
    reason = f"{qlist(pos)} | {CHAN_NOTE} | probe: {info['probe']}"
    if pos == "3584":
        reason += " | note: six-query set archived under runner key pos-3579 (same parang query strings)"
    rows_out.append({
        "source_position": pos,
        "item_code": r["item_code"],
        "uom": r["uom"],
        "official_product_page": pg,
        "official_image_url": img,
        "researcher_decision": dec,
        "match_confidence": conf,
        "finish_exact": info["fe"],
        "model_exact": info["me"],
        "uom_assessment": info["uom"],
        "rights_status": info["rights"] or "unknown",
        "reason": reason,
        "human_action": info["hum"] if info["hum"] else ("none - official OEM asset exact model+finish" if dec == "candidate" else ""),
    })

with open(OUT, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=["source_position","item_code","uom","official_product_page",
        "official_image_url","researcher_decision","match_confidence","finish_exact","model_exact",
        "uom_assessment","rights_status","reason","human_action"])
    w.writeheader()
    w.writerows(rows_out)

from collections import Counter
c = Counter(x["researcher_decision"] for x in rows_out)
print("wrote", OUT, len(rows_out), "rows:", dict(c))
