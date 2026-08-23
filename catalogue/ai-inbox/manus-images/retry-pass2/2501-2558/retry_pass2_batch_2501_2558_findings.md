# P1-CAT-01 Pass 2 findings — retry batch positions 2501–2558

## Batch scope

The Pass 1 reviewed retry queue contains 2,838 rows, of which 2,828 remain pending. The next source-order batch contains 50 rows at positions 2501–2558, excluding positions already verified in Pass 1. Generic and unbranded items were retained in the batch and treated fail-closed when no exact first-party evidence was available.

## Authoritative findings

Position 2557, Bosch screwdriver bit `2 608 521 043`, was resolved on the official Bosch Professional Malaysia page [Bosch Extra Hard Double-Ended Bit Pack](https://www.bosch-pt.com.my/my/en/extra-hard-double-ended-screwdriver-bit-packs-phillips-2868181-ocs-ac/). The page explicitly lists part number 2 608 521 043, 110 mm length, 10-piece PH2/PH2 double-ended bit set, and blister packaging. The page exposes a model-specific product image URL containing `2608521043`; this row is eligible for VERIFIED_CANDIDATE after download and SHA-256 validation.

Position 2513, Bosny No. 214 400 ml rat glue, was checked against the official [BOSNY RAT-GLUE page](https://www.bosny.com/product/rat-glue/). The official page confirms rat glue and available 400 ml size and provides an official image, but it does not state the No. 214/B-214 model code or a package-specific plastic-can image. The candidate gate therefore remains PENDING; the generic official rat-glue image is not treated as exact No. 214 evidence.

Positions 2534 and 2535, Pentens T-200 Fleseal Grey and White 5 kg, were checked against the official [PENTENS T-200 page](https://www.pentens.com/en/product-detail/T-200/). The page confirms T-200, grey and white colour options, but specifies 20 kg and 200 kg pail packaging and exposes no exact 5 kg official image. Both rows remain PENDING because the packaging quantity is a material variant.

Position 2517 Nietz 53252040 and position 2533 Nietz 50730080 were checked against the official [NIETZ catalogue page](https://nietz.com.my/product-catalogue/). The catalogue landing page confirms the Malaysian manufacturer and downloadable catalogue workflow but does not expose a model-specific page or preserved image for either exact code. Both rows remain PENDING.

Position 2542, Bosch `(508) 3 IN 1 Nozzle`, was checked against official Bosch DIY and Bosch Professional searches. Official sources identify related Trio Nozzle part numbers such as F016800583 and product-family pages, but no exact official Malaysia asset mapping for the source’s `(508)` code was preserved. It remains PENDING; a related nozzle family image was not substituted.

Position 2520 Taicon 70/0076 trailing socket, position 2516 Morries MS3233 extension socket, position 2532 Mark-X MKX-2020 angle grinder stand, position 2547 Ecogreen EG4112 quick connector, position 2555 Calvallo 3255 yellow seal tape, and position 2556 Rayaco V1034 basket were searched using exact-code and Malaysia-first manufacturer/distributor queries. No exact authoritative page plus exact downloadable image cleared the candidate gate. They remain PENDING.

The remaining generic ladders, flooring, fasteners, cables, hoses, tiles, adhesives, paint, and unbranded hardware rows remain PENDING. Marketplace imagery, family imagery, and sibling models were not substituted. Rights remain separate and are recorded as `needs_permission` for every row.
