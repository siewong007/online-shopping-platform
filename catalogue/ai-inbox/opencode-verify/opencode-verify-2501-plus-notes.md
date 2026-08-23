# OpenCode verify notes — 2501-plus pass queue

Date: 2026-08-21. Input: `pass-queue-unreviewed-2501-plus.csv` (22 Manus VERIFIED_CANDIDATE rows, positions 2501–7771). Every `official_product_page` and `official_image_url` was opened; every `local_asset_path` checked on disk. No row overlapped the 85 dual-agreed candidates.

## Result: 20 pass / 2 fail

### Pass (20)

All passes have model **and** finish exact, page live, and an official/authorised source. Gemini may review only these rows' pixels:

| pos | item_code | note |
|---|---|---|
| 2515 | LAD-H/D-STRO-DS07 | Sunway Winstar authorised distributor; DSHD07 7-step confirmed; image URL expired (403) but local asset preserved — review from asset |
| 2522 | FAN-TAB-KDK-KB-304 | kdk.com.my official; KB-304 in HTML |
| 2531 | IND-COO-MID-MIC222TLAGN | midea.com/my PDP; spec table Color: Gold, 2200 W |
| 2541 | BAT-CHA-KENDE-SM1212 | Sui U = self-titled authorised reseller; OEM kende.com.cn has no SM1212 page, so dealer tier is correct; CDN image byte-size matches local asset |
| 2576 | HOO-CAB-CB8003-3 | cabana.com.my official |
| 2582 | SHE-CAB-CB781-BL | cabana.kartfive.com is brand-owner site (footer: Sorento Sdn Bhd); page states Matt Black SS304 verbatim |
| 2602 | IND-CEM-GREY-25KG | mys.sika.com official; Scene7 asset name carries 25kg code |
| 2705 | SHE-CAB-CB782-BL | cabana.com.my official |
| 2830 | X-FAN-CEI-COSA-998 | alphamalaysia.com CX998/56; Cosa series confirmed; PWT sole colour |
| 2865 | LAD-H/D-STRO-DS08 | same as DS07; image URL expired but local asset preserved |
| 3243 | GRA-CAB-CB6644 | cabana.com.my official |
| 3344 | EXH-FAN-FN25A | dekka-asia.com APB25A/10" page with specs |
| 3427 | HOO-CAB-CB8003-5 | cabana.com.my official |
| 3512 | X-HOO-CAB-CB8001-3 | CB8001 satin series (distinct from polished CB8003) |
| 3630 | GROUT-SEAL-703 | mys.sika.com Sikagard-703 GroutSeal; asset carries 1x1 pack code |
| 3772 | TAP-CAB-CB6331 | cabana.com.my official; asset size matches live image |
| 4096 | TAP-CAB-CB1540SS-BL | -BL suffix consistent; asset size matches live image |
| 4880 | TAP-CAB-CB2805A | SS-chrome DIY variant; display claims no colour — no conflict |
| 4881 | TAP-CAB-CB2806A | cabana.com.my official; asset size matches live image |
| 2557 | BOS-2608-521-043 | bosch-pt.com.my; order number in HTML; image filename carries exact 2608521043 |

### Fail (2) — not sent to Gemini, appended to Job 2

1. **2645 DC-DSM09-100S** (Angle Grinder / DSM09-100S)
   - dongchengmalaysia.com intermittently unreachable (page fetch transport error; image download succeeded once, then connection refused).
   - Image `images-2.jpg` is only 3,590 bytes — thumbnail-grade.
   - No local asset preserved → dead/unstable URL with no local hash.

2. **3729 ELE-MUL-TES-UNI** (Uni-T UT33B+ Multi Meter Tester)
   - Page is the UT33+ **series** page (UT33A+/B+/C+/D+), a family-hero risk.
   - Image file named `UT33B_1.jpg` — no "+" suffix; UT33B+ vs UT33B casings near-identical, so model_exact could not be held at `yes`.

## Rights

All rows remain `needs_permission` (fails: `no_asset` / `unknown`). Nothing approved. Nothing deployed.
