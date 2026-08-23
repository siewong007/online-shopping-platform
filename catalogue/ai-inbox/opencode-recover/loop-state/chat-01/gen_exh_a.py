import csv, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "exhaust-batch-A.csv")
OUT = os.path.join(HERE, "exh-A.csv")

# class -> (confirmatory query run via websearch, t3 verdict)
CLASSES = {
    "nails": ('paku besi galvani 2 1/2 inci Malaysia',
              'n/a-commodity-no-brand; marketplace listings only (Lazada/Shopee/Tokopedia), no OEM page'),
    "screws_generic": ('skru self drilling 8 x 1 inci plasterboard Malaysia',
                       'n/a-commodity-no-brand; MY trade-supplier pages (IMITEX/MK Hardware) only, no retail OEM for house-label pack'),
    "drywall_hunter": ('Hunter drywall screw black Malaysia',
                       'Hunter name on Shopee seller listing/reseller pages only; no Hunter brand site found; dead end'),
    "drywall_moonarrow": ('"Moon Arrow" drywall screw',
                          'Moon Arrow appears on one Lazada KSW listing only; no brand site found; dead end'),
    "sandpaper": ('kertas pasir tangan G120 Malaysia',
                  'n/a-commodity-no-brand; generic grit sheets on marketplaces (Bosch-branded sheets are not this house item)'),
    "sandex": ('Sandex velcro backing pad M10',
               '"Sandex" resolves to Sankyo indexers/waterproofing cos, not abrasive-pad OEM; generic pads only; dead end'),
    "hoseclips": ('hose clip stainless steel 13-23mm Malaysia',
                  'n/a-commodity-no-brand; distributor pages list Brand "-" confirming unbranded commodity'),
    "hosejoints": ('power hose joint 13-16mm Malaysia',
                   'Wiraplas H22 seen only via Banli Hardware distributor page; no Wiraplas official site; dead end'),
    "fishweights": ('pemberat pancing no 1 loceng Malaysia',
                    'n/a-commodity-no-brand; marketplace/agro listings only'),
    "fishline": ('benang pancing putih no 15 Malaysia',
                 'n/a-commodity-no-brand; tag/marketplace pages only, no M.L No.15 OEM'),
    "lbracket": ('stainless steel L bracket 85x85mm Malaysia',
                 'n/a-commodity-no-brand; resellers + Chee Kuan mfr of brackets generally; BC185K/85383 codes unresolved to any OEM'),
    "wallplugs": ('K103 stainless steel wall plug M10 Malaysia',
                  'K103-304 code unresolved to OEM; sleeve-anchor resellers only; dead end'),
    "pipes": ('paip UPVC BS5255 HDPE PN12.5 32mm Malaysia',
              'n/a-commodity-no-brand; SIRIM/BBB listing is a different brand; Unitrade supplier page only'),
    "fittings": ('PVC tee reducer elbow 32mm fitting Malaysia',
                 'n/a-commodity-no-brand; MS628-standard fittings sold as No-Brand; dead end'),
    "capacitor": ('kapasitor CBB61 450V kipas',
                  'n/a-commodity-no-brand; CN/ID marketplace components, no OEM for this house item'),
    "cabletie": ('cable tie hitam 8 inci Malaysia',
                 'n/a-commodity-no-brand; Delta Sama Jaya etc. trade suppliers; no OEM asset rights-cleared'),
    "doorstopper": ('door stopper getah merah transparent Malaysia',
                    'Rugaval/Rubber-KU make similar red rubber stoppers but sizes/packaging differ from house item; not a confirmed match'),
    "hinge_softclose": ('soft close hinge 5/8 inch cabinet',
                        '5/8 overlay soft-close hinges exist as Berta/Grass US-EU brands; house item unmatched to any OEM'),
    "roller_catch": ('double roller catch stainless steel door cabinet',
                     'generic CN/US double-roller catches everywhere, all unbranded or foreign retail brands; no OEM for house pack'),
    "pleak_hook": ('"pleak hook" 8430',
                   'query returned junk (privacy tools/towing); product term yields nothing; dead end'),
    "magcatch": ('magnetic catch MC03A cabinet',
                 'MC-03A exists as generic Chinese catch (Allways/bestsuppliers); no OEM site; dead end'),
    "picturehanger": ('picture hanger golden dinding Malaysia 1 1/2 inch',
                      '"m\'sia" house-label hanger; marketplace kits and STAS rail systems only; no OEM match'),
    "stretchfilm": ('stretch film 4 inch 230g Malaysia',
                    'n/a-commodity-no-brand; MY film manufacturers exist but none matches this 4in x 230g house roll'),
    "antbait": ('racun semut bait 35g Malaysia',
                'n/a-commodity-no-brand; unbranded gels/powders on marketplaces; pesticide imagery needs owner shot anyway'),
    "yellowpowder": ('serbuk kuning pewarna 500g tin',
                     'n/a-commodity-no-brand; food-grade colouring powders on ID/MY marketplaces; house tin unmatched'),
    "gisocketbox": ('GI socket box 28 13A Malaysia',
                    'COT (UAE) GI boxes and CROWN sockets surfaced; neither matches house GI 28x13A box; dead end'),
    "nikoswitch": ('Niko S switch 1 gang 1 way white Malaysia',
                   'only Belgian niko.com and MK/Schneider equivalents found; local "Niko S" OEM unresolved; dead end'),
    "ktkcable": ('KTK PVC cable 4mm black 100m Malaysia',
                 'KTK sold via distributors (SMJ Electrical, Modernvest/Lekima) only; no KTK manufacturer official site found'),
    "hmsdownlight": ('HMS downlight HGD603 18W 6500K',
                     'zero relevant results for HGD603 model; HMS brand site not findable; dead end'),
    "threempad": ('3M 213 scouring sponge pad 3pcs',
                  '3M official Scotch-Brite catalogue pages exist for pad family but exact "213 w/ab sponge" variant not confirmed on 3M MY; rights not cleared via contacts.csv'),
    "steelkeel_list": ('steel keel ceiling 35mm kayu list S4S Malaysia',
                       'n/a-commodity-no-brand; CN keel manufacturers and local timber sellers; no OEM image rights-cleared'),
    "pvcchain": ('rantai pvc hijau 6mm Malaysia',
                 'n/a-commodity-no-brand; Shopee/TikTok rolls and Man Kian distributor page; no OEM'),
    "c7bulb": ('C7 E12 mini candle bulb clear',
               'Philips/Simba US-market C7 E12 bulbs exist; house clear mini candle bulb unmatched locally; dead end'),
    "washitape": ('polibag 8x12 putih 500g washi tape 24mm',
                  'washi tape 24mm exists as Rinrei/Dulux/fk-silicone brands; house roll unmatched; dead end'),
    "polibag": ('polibag 8x12 putih 500g washi tape 24mm',
                'n/a-commodity-no-brand; ID/MY marketplace polybags only'),
    "machine_thread": ('SS304 nut bolt washer threaded rod expansion eye bolt Malaysia',
                       'n/a-commodity-no-brand; MY fastener traders (Fuji/Pertama/Yew Siong) sell generic stock; TRAC/OAC codes unresolved'),
    "glofoil": ('Glofoil aluminium foil double side GT120',
                'GT-120 double-sided foil listed by Sonic Hardware Sarawak distributor; "Glofoil" brand site not findable; dead end'),
    "grindingwheel": ('grinding wheel 4 inch 100x6x16mm Malaysia',
                      'Tailin/PTN/VISTA/Tactix discs sold via distributors only; house wheel unmatched to rights-cleared OEM'),
    "brooms": ('penyapu plastik 260g Malaysia',
               'n/a-commodity-no-brand; marketplaces + CN OEM factories (custom-brand brooms); SB200/SB9226/LD-1803S codes unresolved'),
}

# source_position -> class
POS_CLASS = {}
def assign(cls, *positions):
    for p in positions:
        assert p not in POS_CLASS, f"duplicate {p}"
        POS_CLASS[p] = cls

assign("nails", 296, 5317, 6667, 7108, 2893)
assign("screws_generic", 2931, 3449, 5512, 3282, 3685, 3226, 3814, 5095, 6193, 3834,
       3662, 3707, 6021, 3731, 3890, 5609, 3732)
assign("drywall_hunter", 3370, 3406, 3424, 3499, 3518, 3589, 7100)
assign("drywall_moonarrow", 3889)
assign("sandpaper", 2945, 3003, 3002, 3027, 3084, 3085, 3152, 3197, 3238)
assign("sandex", 3163)
assign("hoseclips", 2856, 3311, 3398, 3069, 2962)
assign("hosejoints", 4113, 4228)
assign("fishweights", 3297, 3171, 3141, 4487, 4149, 3250)
assign("fishline", 4176, 4148, 4175, 4213)
assign("lbracket", 4189, 3858, 4156, 4858, 4604)
assign("wallplugs", 5197, 4732, 4246, 2659, 4465, 5710, 4600)
assign("pipes", 3955, 5009)
assign("fittings", 4864, 5963, 4668, 5393, 5478, 5293, 5659, 6252, 5695, 5744)
assign("capacitor", 4303, 4360)
assign("cabletie", 4272)
assign("doorstopper", 3221, 2917, 3260)
assign("hinge_softclose", 2774)
assign("roller_catch", 3658)
assign("pleak_hook", 3217)
assign("magcatch", 2708)
assign("picturehanger", 4205)
assign("stretchfilm", 2970)
assign("antbait", 3391)
assign("yellowpowder", 3060)
assign("gisocketbox", 6054)
assign("nikoswitch", 6319)
assign("ktkcable", 2629)
assign("hmsdownlight", 3683)
assign("threempad", 2727)
assign("steelkeel_list", 3492, 4019)
assign("pvcchain", 3396)
assign("c7bulb", 2730)
assign("washitape", 3306)
assign("polibag", 3410, 3483)
assign("machine_thread", 6012, 4856, 3309, 3468, 7129, 6602, 4603, 6140, 3705, 4312,
       4739, 3467, 3972, 3883)
assign("glofoil", 4477)
assign("grindingwheel", 2986)
assign("brooms", 2644, 3068, 3472)

T4_EXTRA = {
    3163: "; t4 pdf probe ('Sandex' catalogue filetype:pdf) returned unrelated Sankyo indexer catalogues",
    3683: "; t4 pdf probe ('HMS electrical downlight catalogue filetype:pdf') found no HMS MY catalogue",
}

with open(SRC, newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
assert len(rows) == 126, f"expected 126 input rows, got {len(rows)}"

header = ["source_position","item_code","uom","official_product_page","official_image_url",
          "researcher_decision","match_confidence","finish_exact","model_exact",
          "uom_assessment","rights_status","reason","human_action"]

missing = [r["source_position"] for r in rows if int(r["source_position"]) not in POS_CLASS]
assert not missing, f"rows without class: {missing}"

out_count = {"exhausted": 0, "pending": 0}
buf = []
with open(OUT, "w", newline="", encoding="utf-8") as fo:
    w = csv.writer(fo)
    w.writerow(header)
    for i, r in enumerate(rows, 1):
        pos = int(r["source_position"])
        q, t3 = CLASSES[POS_CLASS[pos]]
        reason = (
            f'q:"{q}" ; tier1:no-oem-found ; '
            f't3:{t3} ; '
            f't4:no-prior-url-to-archive{T4_EXTRA.get(pos, "")} ; '
            f't5:shoot-in-store(house-label/generic; no matching supplier in supplier-permission-contacts.csv)'
        )
        w.writerow([
            r["source_position"], r["item_code"], r["uom"], "", "",
            "exhausted", "R", "n/a", "n/a", "n/a-no-listing-found",
            "no_asset", reason, "shoot in-store",
        ])
        out_count["exhausted"] += 1
        if i % 25 == 0:
            fo.flush()
            os.fsync(fo.fileno())
    fo.flush()
    os.fsync(fo.fileno())

print(out_count)
