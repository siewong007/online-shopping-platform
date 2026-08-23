# Priority-300 shard 0001–0050 research findings

## Joven official Malaysia evidence

The official Joven Malaysia pages confirm the exact model pages and variant differentiators.

- `SL30iP` official page: https://www.joven-electric.com/my/sl30ip-instant-water-heater-5101401.html. SKU 5101401, 3.6 kW / 240 V, inverter DC pump, non-RS slider-bar accessories. The page exposes model-specific white and black assets, including `https://www.joven-electric.com/media/catalog/product/cache/81feca21a488f339124f3c58fa0f1a2e/s/l/sl30ip_black_2026_1.jpg` and `https://www.joven-electric.com/media/catalog/product/cache/81feca21a488f339124f3c58fa0f1a2e/s/l/sl30ip_white_2026_1.jpg`.
- `SL30iP-RS` official page: https://www.joven-electric.com/my/sl30ip-rs-instant-water-heater-5101501.html. SKU 5101501, 3.6 kW / 240 V, inverter DC pump, rotatable 8-inch rainshower plus 5-spray showerhead. The official page’s current gallery exposes white assets but not an unambiguous white RS-only casing image separate from non-RS; position 4 remains PENDING unless a distinct exact white RS image is preserved. The carry-forward black RS row uses the existing exact black RS asset.
- `SB11iP` official page: https://www.joven-electric.com/my/sb11ip-instant-water-heater-5110201.html. SKU 5110201, 3.6 kW / 240 V, inverter DC pump, 3 colour options. Gallery exposes dark-grey and white assets, but the source row omits the electrical/colour variant needed to identify position 26 exactly; keep PENDING. The `SB11iP-RS` family page also lists materially different 3.6 kW and 4.2 kW variants; position 18 remains PENDING because the row omits the electrical rating and exact colour mapping.
- `SL30iP(WB)` official page: https://www.joven-electric.com/my/sl30ip-wb-instant-water-heater.html. This confirms WB is an inclinable-wall-bracket variant, not a generic SL30iP colour variant. Position 32 remains PENDING because the worklist code `SL30IP-AWB` does not map cleanly to the official `SL30iP(WB)` code and no first-party exact code match was established.

## Other exact official pages

- Khind official SF1682SE page: https://khind.com.my/products/khind-stand-fan-sf1682se. The page title and specifications confirm 16-inch SF1682SE, Winter Grey, 50 W, 220–240 V. Exact image: `https://khind.com.my/cdn/shop/files/SF1682SE_BG_white_7fc568d3-0556-4785-a1de-68302f995233.jpg?v=1751809076&width=1946`. Position 29 is eligible for candidate after download and hash validation.
- Rubine page `https://www.rubine.com.my/product/RBO-IA6X-70SS` returns a generic shell with no model-specific image or text in the current HTML; position 49 remains PENDING.
- Official Saniware page for SWP-B-2934: https://saniware.com/product/basin-pillar-tap-mixer-swp-b-2934/. Exact SKU and official image `https://saniware.com/wp-content/uploads/2026/01/SWP-B-2934.jpg` are live, but the page does not state the row’s Gold finish; position 35 remains PENDING with `finish_exact=unresolved`.
- Saniware guessed pages for SWP-B-2924, SWP-B-2921, SWP-SS-304-3970(-MB), and SWP-HS-502 returned 404 / no exact page; those rows remain PENDING and the failed queries are recorded in the output.
- Saniware WC-2098-S300 page confirms only the S300 sibling with 250/300 mm roughing-in and a model-specific S300 image. It cannot be used for the row’s `WC2098RL-S250MM`; position 33 remains PENDING.

## Fail-closed decisions

Carry-forward candidates are copied only after live-page and live-image checks. Search rows become candidates only where the official page names the exact model/finish and the exact official image is downloadable. Family pages, sibling images, unavailable pages, colour substitutions, and omitted electrical/variant fields remain PENDING. Rights remain separate and are recorded as `needs_permission` in the new output schema.
