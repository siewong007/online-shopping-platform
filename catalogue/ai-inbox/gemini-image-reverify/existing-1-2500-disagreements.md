# Gemini 3.7 Re-verification — Disagreements Report (Products 1–2500)

**Total Records Evaluated**: 2500  
**Total Disagreements (`agree = no`)**: 21  
**Total Gemini Approved Candidates (`gemini_decision = candidate`)**: 82  
**Total Pending / Fail-Closed (`gemini_decision = pending`)**: 2418  

---

## Summary of Second-Review Audit Rules Applied

1. **Colour / Finish Mismatch**: Fails if the image or asset depicts an alternate colour (e.g. white image for black fan or light grey fan).
2. **Model / Accessory Mismatch**: Fails if the asset represents a different model code generation or maps an accessory (e.g. planer blade) to the whole machine tool.
3. **Sibling Substitution**: Fails if the cited URL maps to an adjacent sibling SKU without exact code preservation.
4. **Dealer / Marketplace Image**: Fails if the candidate asset originates from a third-party retailer/dealer (e.g. buildershardware) rather than official OEM portals.
5. **Dead / Unresponsive Official URL**: Fails if the official URL or asset is dead, inaccessible, or times out without cryptographic local preservation.
6. **Rights Protection**: All rights statuses remain strictly `needs_permission`. No assets are approved or published.

---

## Disagreements Table

| Pos | Item Code | Product Name | Prior Status | Gemini Decision | Defect Category | What Prior File Got Wrong & Human Action |
|---|---|---|---|---|---|---|
| 82 | `SIN-SOR-SRTKS2431` | Sorento Nanograin Texture Kitchen Sink | `candidate` | `pending` | **Dealer / Marketplace Source** | **Error**: Prior file accepted candidate asset from third-party retailer/dealer buildershardware.com.my rather than official Sorento OEM catalogue/portal. Fails marketplace/dealer gate.<br>**Action**: Preserve exact official Sorento catalogue page or OEM manufacturer asset for SRTKS2431. |
| 100 | `FAN-FLO-KHI-FF2005` | 20 Ind Floor Fan Black | `candidate` | `pending` | **Colour / Finish Mismatch** | **Error**: Prior file accepted asset FF2005_WH.jpg (White) for product FAN-FLO-KHI-FF2005 specified as Black (20 Ind Floor Fan Black). Colour/finish mismatch (white image for black product).<br>**Action**: Obtain official product image for FF2005 in Black finish. |
| 697 | `FAN-WAL-KHI-FW16JR` | Khind 16 Remote Control Wall Fan (light Grey) | `candidate` | `pending` | **Colour / Finish Mismatch** | **Error**: Prior file accepted asset WF16JR_KOL_WH.jpg (White) for product FAN-WAL-KHI-FW16JR specified as Light Grey (Khind 16 Remote Control Wall Fan (light Grey)). Colour/finish mismatch.<br>**Action**: Obtain official product image for WF16JR in Light Grey finish. |
| 1202 | `TAP-SAN-SWS-304-3977` | Saniware Sliver Wall Bib Tap With Hose Connect | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://saniware.com/product/sws-304-3977/ is dead/unresponsive and asset was not locally preserved in Track B. Fails live URL gate.<br>**Action**: Re-verify Saniware official domain or harvest from official catalogue PDF. |
| 1226 | `TAP-SAN-SWS-304-3978` | Saniware Sliver Two Way Tap | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://saniware.com/product/sws-304-3978/ is dead/unresponsive and asset was not locally preserved in Track B. Fails live URL gate.<br>**Action**: Re-verify Saniware official domain or harvest from official catalogue PDF. |
| 1440 | `VAL-SAN-SW-SS-AV-80` | Saniware Angle Valve SW-SS-AV-80 | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://saniware.com/product/sw-ss-av-80/ is dead/unresponsive and asset was not locally preserved in Track B. Fails live URL gate.<br>**Action**: Re-verify Saniware official domain or harvest from official catalogue PDF. |
| 1468 | `BOS-0601-072-5K0` | Glm 30 Laser Rangefinder | `candidate` | `pending` | **Model / Accessory Mismatch** | **Error**: Prior file mapped item GLM 30 (06010725K0) to GLM 30-23 which is a different model/generation. Model code mismatch.<br>**Action**: Source exact asset for GLM 30 (part number 06010725K0). |
| 1469 | `BOS-2609-110-357` | Planning Knife Gho 6500 | `candidate` | `pending` | **Model / Accessory Mismatch** | **Error**: Prior file mapped accessory blade BOS-2609-110-357 (Planer Knife for GHO 6500) to the full power tool machine GHO 6500. Image shows the whole planer, not the blade accessory.<br>**Action**: Obtain exact product packaging/accessory image for Bosch 2609110357 planing knife. |
| 1903 | `DC-DZC04-28` | Hammer Drill / DZC04-28 | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dzc04-28/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 1933 | `DC-DCJZ03-13EK-20V` | Cordless Brushless Driver/hammer Drill 20V (4.0AH X2/4A) / DCJZ03-13EK | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dcjz03-13ek/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 1934 | `DC-DSM21-100` | 4 Angle Grinder (900W) Slim Body | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dsm21-100/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 1935 | `DCPB488EK` | Cordless Brushless Impact Wrench 20V (4.0AH X2/4A) | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dcpb488ek/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 1996 | `BID-CAB-CB91SS-BL-DIY` | Cabana Hand Bidet (matt Blk) | `candidate` | `pending` | **Sibling Model Substitution** | **Error**: Prior file cited page URL for sibling model cb90ss-bl-diy instead of exact model CB91SS-BL-DIY. Sibling substitution.<br>**Action**: Verify exact product URL and specification for Cabana CB91SS-BL-DIY. |
| 2127 | `DC-SIM-FF10-100` | Angle Grinder / DSM10-100 | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/s1m-ff10-100/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 2142 | `DCJZ1202ITD` | Cordless Driver Drill Combo Kit /DCJZ1202ITD | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dcjz1202itd/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 2193 | `DC-ZIJ-FF04-13(SET)` | Electric Impact Drill / DZJ04-13 | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/z1j-ff04-13/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 2280 | `DC-DSM17-100B` | Angle Grinder / DSM17-100B | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dsm17-100b/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 2281 | `DC-DVC12` | 12L Vacuum Cleaner (1200W) | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dvc12/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 2375 | `DC-DQU08-160` | Electric Mixer (1400W) | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dqu08-160/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 2396 | `DC-DZC03-28` | 28MM Electric Rotary Hammer | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dzc03-28/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.<br>**Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset. |
| 2450 | `DC-J1G-FF02-355` | Electric Cut Off Machine | `candidate` | `pending` | **Dead / Unresponsive URL** | **Error**: Prior file candidate asset is an unverified manual desktop screenshot (Screenshot-2024-11-01-152058-1.png) and Dongcheng Malaysia host is dead/unresponsive.<br>**Action**: Extract clean official product image from manufacturer datasheet or catalogue. |

---

## Detailed Disagreement Breakdowns

### Position 82 — `SIN-SOR-SRTKS2431`
- **Product Name**: Sorento Nanograin Texture Kitchen Sink
- **Source File**: `priority50_forensic_audit_input/products_51_100_forensic/products_51_100_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Prior file accepted candidate asset from third-party retailer/dealer buildershardware.com.my rather than official Sorento OEM catalogue/portal. Fails marketplace/dealer gate.
- **Required Action**: Preserve exact official Sorento catalogue page or OEM manufacturer asset for SRTKS2431.

### Position 100 — `FAN-FLO-KHI-FF2005`
- **Product Name**: 20 Ind Floor Fan Black
- **Source File**: `priority50_forensic_audit_input/products_51_100_forensic/products_51_100_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Prior file accepted asset FF2005_WH.jpg (White) for product FAN-FLO-KHI-FF2005 specified as Black (20 Ind Floor Fan Black). Colour/finish mismatch (white image for black product).
- **Required Action**: Obtain official product image for FF2005 in Black finish.

### Position 697 — `FAN-WAL-KHI-FW16JR`
- **Product Name**: Khind 16 Remote Control Wall Fan (light Grey)
- **Source File**: `priority50_forensic_audit_input/products_101_1000_forensic/manifest_records_101_1000.json`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Prior file accepted asset WF16JR_KOL_WH.jpg (White) for product FAN-WAL-KHI-FW16JR specified as Light Grey (Khind 16 Remote Control Wall Fan (light Grey)). Colour/finish mismatch.
- **Required Action**: Obtain official product image for WF16JR in Light Grey finish.

### Position 1202 — `TAP-SAN-SWS-304-3977`
- **Product Name**: Saniware Sliver Wall Bib Tap With Hose Connect
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://saniware.com/product/sws-304-3977/ is dead/unresponsive and asset was not locally preserved in Track B. Fails live URL gate.
- **Required Action**: Re-verify Saniware official domain or harvest from official catalogue PDF.

### Position 1226 — `TAP-SAN-SWS-304-3978`
- **Product Name**: Saniware Sliver Two Way Tap
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://saniware.com/product/sws-304-3978/ is dead/unresponsive and asset was not locally preserved in Track B. Fails live URL gate.
- **Required Action**: Re-verify Saniware official domain or harvest from official catalogue PDF.

### Position 1440 — `VAL-SAN-SW-SS-AV-80`
- **Product Name**: Saniware Angle Valve SW-SS-AV-80
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://saniware.com/product/sw-ss-av-80/ is dead/unresponsive and asset was not locally preserved in Track B. Fails live URL gate.
- **Required Action**: Re-verify Saniware official domain or harvest from official catalogue PDF.

### Position 1468 — `BOS-0601-072-5K0`
- **Product Name**: Glm 30 Laser Rangefinder
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Prior file mapped item GLM 30 (06010725K0) to GLM 30-23 which is a different model/generation. Model code mismatch.
- **Required Action**: Source exact asset for GLM 30 (part number 06010725K0).

### Position 1469 — `BOS-2609-110-357`
- **Product Name**: Planning Knife Gho 6500
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Prior file mapped accessory blade BOS-2609-110-357 (Planer Knife for GHO 6500) to the full power tool machine GHO 6500. Image shows the whole planer, not the blade accessory.
- **Required Action**: Obtain exact product packaging/accessory image for Bosch 2609110357 planing knife.

### Position 1903 — `DC-DZC04-28`
- **Product Name**: Hammer Drill / DZC04-28
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dzc04-28/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 1933 — `DC-DCJZ03-13EK-20V`
- **Product Name**: Cordless Brushless Driver/hammer Drill 20V (4.0AH X2/4A) / DCJZ03-13EK
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dcjz03-13ek/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 1934 — `DC-DSM21-100`
- **Product Name**: 4 Angle Grinder (900W) Slim Body
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dsm21-100/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 1935 — `DCPB488EK`
- **Product Name**: Cordless Brushless Impact Wrench 20V (4.0AH X2/4A)
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dcpb488ek/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 1996 — `BID-CAB-CB91SS-BL-DIY`
- **Product Name**: Cabana Hand Bidet (matt Blk)
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Prior file cited page URL for sibling model cb90ss-bl-diy instead of exact model CB91SS-BL-DIY. Sibling substitution.
- **Required Action**: Verify exact product URL and specification for Cabana CB91SS-BL-DIY.

### Position 2127 — `DC-SIM-FF10-100`
- **Product Name**: Angle Grinder / DSM10-100
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/s1m-ff10-100/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 2142 — `DCJZ1202ITD`
- **Product Name**: Cordless Driver Drill Combo Kit /DCJZ1202ITD
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dcjz1202itd/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 2193 — `DC-ZIJ-FF04-13(SET)`
- **Product Name**: Electric Impact Drill / DZJ04-13
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/z1j-ff04-13/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 2280 — `DC-DSM17-100B`
- **Product Name**: Angle Grinder / DSM17-100B
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dsm17-100b/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 2281 — `DC-DVC12`
- **Product Name**: 12L Vacuum Cleaner (1200W)
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dvc12/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 2375 — `DC-DQU08-160`
- **Product Name**: Electric Mixer (1400W)
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dqu08-160/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 2396 — `DC-DZC03-28`
- **Product Name**: 28MM Electric Rotary Hammer
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Official manufacturer URL https://www.dongchengmalaysia.com/product/dzc03-28/ is dead/unresponsive and asset is inaccessible. Fails live URL gate.
- **Required Action**: Re-verify official Dongcheng Malaysia page or preserve PDF catalogue asset.

### Position 2450 — `DC-J1G-FF02-355`
- **Product Name**: Electric Cut Off Machine
- **Source File**: `manus/P1-CAT-01_products_1001_2500_research_outputs/products_1001_2500_reviewed.csv`
- **Prior Status**: `candidate` → **Gemini Decision**: `pending` (`agree: no`)
- **Defect Identified**: Prior file candidate asset is an unverified manual desktop screenshot (Screenshot-2024-11-01-152058-1.png) and Dongcheng Malaysia host is dead/unresponsive.
- **Required Action**: Extract clean official product image from manufacturer datasheet or catalogue.

