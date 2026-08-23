# P1-CAT-01 branded/model retry-pass findings

## Candidate-quality exact sources

### Position 2515 — Strongman DSHD07

Authoritative Malaysian distributor/manufacturer-owner page: https://b2b-uat.sunwaywinstar.com/my/strongman-ds-hd-ladder-dshd07-7step

The page title identifies `NIETZ ALUMINIUM LADDER HEAVY DUTY DOUBLE SIDED 7 STEPS DSHD07`, with product number `NZLAHD0207SI`, manufacturer `Strongman Local`, model `HEAVY DUTY DOUBLE SIDED`, and size `7 STEPS`. The page contains the exact signed image asset ending in `0000855_strongman-double-sided-heavy-duty-dshd07-7-step_510.jpeg`. This is eligible for VERIFIED_CANDIDATE after download and SHA-256 preservation.

### Position 2865 — Strongman DSHD08

Authoritative page: https://b2b-uat.sunwaywinstar.com/my/strongman-ds-hd-ladder-dshd08-8step

The page title identifies `NIETZ ALUMINIUM LADDER HEAVY DUTY DOUBLE SIDED 8 STEPS DSHD08`, and the embedded exact image asset ends in `0000584_strongman-double-sided-heavy-duty-dshd08-8-step_510.png`. This is eligible for VERIFIED_CANDIDATE after download and SHA-256 preservation.

### Position 2522 — KDK KB-304

Official Malaysian manufacturer page: https://www.kdk.com.my/product/kb-304/

The page identifies model `KB-304 (30cm/12-inch)` and exposes the model-specific image `https://www.kdk.com.my/wp-content/uploads/2020/09/product-mobile_Table-Fans_KB-304.png`. This is eligible for VERIFIED_CANDIDATE after download and SHA-256 preservation.

### Position 2541 — KENDE SM1212

Authorised Malaysian distributor page: https://www.suiumachinery.com.my/showproducts/productid/4797799/cid/467542/kende-sm1212-612v-portable-battery-inverter-charger-212a/

The page explicitly identifies `KENDE SM1212 6/12V Portable Battery Inverter Charger 2-12A`, with model `SM1212`, 6/12V charging and 2–12A rated current. It exposes a model-specific product image with alt text matching the exact product and additional image assets `https://cdn1.npcdn.net/userfiles/24700/file/KENDE_SM1212_Battery_Charger_02.jpg` through `_08.jpg`. The main exact product image is the CDN image whose alt text is `KENDE SM1212 6/12V Portable Battery Inverter Charger 2-12A`; this is eligible for VERIFIED_CANDIDATE after download and SHA-256 preservation.

### Position 2602 — SikaCeram-88 25 kg

Official Sika Malaysia page: https://mys.sika.com/en/construction/tile-setting/tile-adhesives/sikaceram-88.html

The page identifies SikaCeram®-88 and explicitly lists 20 kg and 25 kg packaging and grey powder colour. Exact official image URL from the page HTML: `https://sika.scene7.com/is/image/sikacs/my-SikaCeram-88-25kg-01536099:1-1?wid=480&hei=480&fit=crop%2C1`. This is eligible for VERIFIED_CANDIDATE after download and SHA-256 preservation.

### Position 3630 — Sikagard-703 GroutSeal 1 L

Official Sika Malaysia page: https://mys.sika.com/en/home-improvement/waterproofing/sikagard-703-groutseal.html

The page identifies Sikagard®-703 GroutSeal and lists packaging of 500 ml, 1 L pail, and 5 L pail. Exact official image URL from the page HTML: `https://sika.scene7.com/is/image/sikacs/my-02-en-MY-Sikagard-703-GroutSeal-1x1-00557701:1-1?wid=480&hei=480&fit=crop%2C1`. This is eligible for VERIFIED_CANDIDATE after download and SHA-256 preservation.

### Cabana exact-SKU mapping

Official Cabana detail pages and direct images were mapped for these retry rows:

| Position | SKU | Official detail page | Exact image URL |
|---:|---|---|---|
| 3772 | CB6331 | https://www.cabana.com.my/index.php/products/kitchen/kitchen-faucet/cb6331-detail | https://www.cabana.com.my/images/virtuemart/product/CB6331.jpg |
| 4096 | CB1540SS-BL | https://www.cabana.com.my/index.php/products/kitchen/kitchen-faucet/cb1540ss-bl-detail | https://www.cabana.com.my/images/virtuemart/product/CB1540SS-BL.jpg |
| 4880 | CB2805A | https://www.cabana.com.my/index.php/products/kitchen/kitchen-faucet/cb2805a-ss-cr-diy-detail | https://www.cabana.com.my/images/virtuemart/product/CB2805A3.jpg |
| 4881 | CB2806A | https://www.cabana.com.my/index.php/products/kitchen/kitchen-faucet/cb2806a-ss-cr-diy-detail | https://www.cabana.com.my/images/virtuemart/product/CB2806A8.jpg |

These four rows are eligible for VERIFIED_CANDIDATE after image download and SHA-256 preservation. Cabana CKS330BK at position 3722 remains PENDING because the source item code is `CKS330/331BK`, while the official page confirms only CKS330BK; the suffix ambiguity is material.

## Fail-closed findings

The official PENTENS T-200 page https://www.pentens.com/en/product-detail/T-200/ confirms T-200 and colours but lists 20 kg and 200 kg packaging, so the retry rows specifying 5 kg grey/white remain PENDING. The official BOSNY RAT-GLUE page https://www.bosny.com/product/rat-glue/ confirms rat glue and 400 ml packaging but does not confirm the inventory code `NO:214`; keep PENDING. NIETZ official pages confirm the brand and categories but do not expose exact model-specific image evidence for the wrench, punch, and extractor rows. Sonic Hardware Glotool pages are option-family pages; no exact size-specific image evidence was preserved, so Glotool rows remain PENDING. No marketplace image was substituted, and rights remain `needs_permission` for every retry row.
