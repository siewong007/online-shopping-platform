# P1-CAT-01 Branded Retry Queue — Pass 2 Batch Report

## Batch result

Pass 2 processed the next **50 pending rows** in source order from the branded retry queue. The batch covers source positions **2501–2558**, because some source positions were already verified in Pass 1 and therefore were not selected again.

| Classification | Count |
|---|---:|
| VERIFIED_CANDIDATE | 1 |
| PENDING | 49 |
| REJECTED | 0 |
| Exact evidence assets preserved | 1 |
| Rights status | `needs_permission` for all 50 rows |

The batch was validated with exact source-order matching, schema checks, candidate-gate checks, and SHA-256 integrity verification. The original Pass 1 reviewed queue and locked campaign masters were not modified. A new non-destructive overlay version was written separately.

## Verified candidate

Position **2557**, item code `BOS-2608-521-043`, is a **Bosch Professional Extra Hard Double-Ended Bit Pack**. The official Bosch Professional Malaysia page identifies part number **2 608 521 043**, 110 mm length, 10-piece PH2/PH2 double-ended bit set, and blister packaging. Its model-specific official image URL contains `2608521043`. Sibling part numbers 2 608 521 039, 2 608 521 041, and 2 608 521 042 were excluded because their lengths or pack quantities differ.

> “Part number 2608521043 … Length, mm 110 … Set Content: 10 PH2 double ended screwdriver bits … Pack quantity 10 Pcs.” — Bosch Professional Malaysia [1]

## Fail-closed pending results

The other 49 rows remain **PENDING** because the exact model, finish, packaging, source-code mapping, or downloadable official image was not established to the candidate threshold. This includes Bosny No. 214 rat glue, Pentens T-200 5 kg grey and white, Nietz 53252040 and 50730080, Bosch 0600-8A7-508, Taicon, Morries, Mark-X, Ecogreen, Calvallo, and Rayaco rows. The official Bosny page confirms RAT-GLUE and a 400 ml size but does not state the No. 214/B-214 package code [2]. The official Pentens page confirms T-200 and colour options but lists 20 kg and 200 kg packaging, not the source rows’ 5 kg units [3].

Marketplace, sibling, generic family, and unrelated dealer images were not promoted. Rights remain a separate gate and were not inferred from identity evidence.

## Pass 2 checkpoint

The next selection rule is to take the next 50 rows whose Pass 1/Pass 2 state remains pending, in retry-queue source order, beginning after the processed batch’s last selected position.

## References

[1]: https://www.bosch-pt.com.my/my/en/extra-hard-double-ended-screwdriver-bit-packs-phillips-2868181-ocs-ac/ "Bosch Professional Malaysia — Extra Hard Double-Ended Bit Pack"
[2]: https://www.bosny.com/product/rat-glue/ "BOSNY — RAT-GLUE"
[3]: https://www.pentens.com/en/product-detail/T-200/ "PENTENS — T-200 UV Resistant Elastomeric Waterproofing Coating"
[4]: https://nietz.com.my/product-catalogue/ "NIETZ Malaysia — Product Catalogue"
