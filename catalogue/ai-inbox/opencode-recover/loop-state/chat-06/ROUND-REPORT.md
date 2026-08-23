# CHAT 06 ROUND 1 STATUS (in progress)

assigned_rows: 839 (assignment file chat-06.csv; ordinals 4196-5034)
states: {'open': 825, 'verified_pass': 14}
rows with tier-1 consumed: 561
researcher workers persisted: 58 (w01, w03, w04, w05, w06, w07, w08, w09, w10, w11, w12, w13, w14, w15, w16, w17, w18, w19, w20, w21, w22, w23, w24, w25, w26, w27, w28, w29, w30, w31, w32, w33, w34, w35, w36, w37, w38, w39, w40, w41, w42, w43, w44, w45, w46, w47, w48, w49, w50, w51, w52, w53, w54, w55, w56, w57, w58, w59)
verifier batches persisted: 12 (v01, v02, v03, v04, v05, v06, v07, v08, v09, v10, v11, v12)

## verified_pass (14)
- 2671 WEL-MAC-FIG-MMA160 | https://www.cmw.com.my/product-page/mma-160nd | 700x700 190796B sha=2165b9ca94c6
- 3418 X-TOO-WOR-5503-12V | https://www.suiumachinery.com.my/showproducts/productid/4489026/cid/467231/worker-wkpwt550312v30pcs-cordless-drill-with-tools-kit-set-tool-box | 1200x1200 794042B sha=54df417b446c
- 4466 ADH-ALT-110 | https://alteco.com.sg/products/adhesive/super-glue/ | 381x740 411610B sha=8cea5610d844
- 4794 IND-COO-MID-C20-RT2002 | https://www.midea.com/my/kitchen-appliances/cooking-appliances/induction-cooker/midea-induction-cooker-c20-rt2002.c20-rt2002 | 1040x1040 153309B sha=67ef81a4fcaf
- 6132 TOO-CUT-STA-992014564 | https://theleedenstore.com.my/product/stanley-14-564-22-maxsteel-aviation-snips-right-curve/ | 1000x1000 84840B sha=03e35f83a18a
- 6180 TOO-CUT-STA-992014562 | https://theleedenstore.com.my/product/stanley-14-562-22-maxsteel-aviation-snips-left-curve/ | 1000x1000 114987B sha=3baf32a89135
- 6387 TOO-PLI-COM-STA-150 | https://www.stanleytools.co.uk/product/stht0-74456/stanley-dynagrip-150mm-combination-plier | 2000x2000 99650B sha=f32179dcfd45
- 6438 DOR-SOC-SGD-100MMSS | https://www.stguchi.com.my/my/en/products/door-fitting-accessories/dust-socket/sgcl-106 | 1280x1280 60372B sha=10c01c10ecc6
- 6566 TOO-CHI-STA-16MM | https://www.stanleytools.co.uk/product/0-16-876/stanley-dynagrip-16mm-single-wood-chisel | 2000x2000 72115B sha=b220588b15ee
- 6793 CAR-MULT-CLEA-500ML | https://armorall.com/my/product/multi-purpose-cleaner/ | 1000x1000 480922B sha=ead4e14e93d7
- 6971 RAI-BOO-BLA-RUB-038# | https://coveitchi.com.my/product/8834-black/ | 2042x2200 469389B sha=18f3f7422768
- 7270 DOR-SOC-SGD-13MMSN | https://www.stguchi.com.my/my/en/products/door-fitting-accessories/dust-socket/sgds-13 | 1280x1280 44646B sha=a32d3cd923d2
- 7479 TOO-FIL-ORE-3/16" | https://shop.oregonproducts.com/products/oregon-70503-round-saw-chain-files-3-16-12-pack | 2048x2048 62465B sha=5045d5219f2e
- 7549 GUN-TAC-REF-TR45-10MM | https://www.arrowtoolgroup.com/arrow-t50-heavy-duty-staples-3-8-x-3-8-5000ct/ | 2000x2000 311097B sha=773babd409d2

## gate reds this round
- r4 red:content_type on 6647 Pentens Latex 108 (DO-Spaces CDN re-fetch non-image) -> back to open tier2; alternate official image needed.
- r1 verifier fail on 6030 PYE Water-Lock (gidci PH image only 256px) -> back to open tier2.

## provider outage note
Fleet-wide websearch HTTP 429 for the entire session; direct-domain fetch research used instead.
Shards r1s02 + r1s05 were wiped by 429 before any queries ran; requeued at tier 1 (not consumed).
Observed sub-worker ceiling: harness executes ~1 task result per turn; one researcher OR verifier per turn.

## tier-2+ leads queue
- 6346 Middy G100CO: exact accessory only inside >5MB catalogue PDF on middy.com.my -> tier 4 archive/PDF crop.
- 6030 PYE Water-Lock: need >=500px official image (pyeproducts.com or authorised MY distributor).
- 6647 Pentens Latex 108: need stable official/distributor image URL that survives byte-fetch.
- 3418/4794/6566/6971/7270/4466: verified_pass pending chat-01 global gate confirmation.
