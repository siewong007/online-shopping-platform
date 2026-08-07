# 3a Worklist — Codex handoff (reconstruction spec + integration rules + prompt)

Visual authority, in order: `design/round-3/01-first-viewport.png` → `design/round-3/3a-worklist-reference.html`
→ option `3a` in `Ekoway Directions.dc.html` → `design/round-3/assessment.md`.
The reference HTML is a verbatim extraction of 3a; every token in it is authority. Do not restyle.

---

## A. Locked thesis

- **Direction:** 3a Worklist.
- **Thesis:** the customer states the job; the real catalogue answers.
- **Signature:** the **Job Band** — a temporary discovery *lens* over the canonical department taxonomy.
- The Job Band must not become a second backend taxonomy, duplicate category navigation, a
  replacement for canonical departments, or a product-classification system.
- Departments remain the only category system in the UI.

---

## B. Page anatomy, top to bottom (desktop 1440)

Page column: `1440px`, ground `#F5F2EC`, page gutter `36px` left/right for every region.

| # | Region | Metrics | Surface / border | Layout |
|---|---|---|---|---|
| 1 | Public header | height `66px`, inner gap `28px` | `#FFFEFB`, bottom `1px #E4DFD5` | flex, centred; logo group → search (`flex:1`, `max-width:520px`, height `38px`) → utils (`margin-left:auto`, gap `20px`) |
| 2 | Department nav (canonical) | height `46px`, item gap `26px` | `#FFFEFB`, bottom `1px #E4DFD5` | flex stretch; items `white-space:nowrap; flex:0 0 auto`; WhatsApp link `margin-left:auto; padding-left:24px` |
| 3 | **Job Band** | padding `16px 36px`, gap `32px`; label column `78px`; chip gap `8px`; readout `border-left:1px solid rgba(245,242,236,.18); padding-left:28px` | `#14342A`, no border | flex centred: label → chips (`flex:1`, `flex-wrap:wrap`) → right-aligned readout |
| 4 | Content shell | padding `26px 36px 0`, gap `32px` | ground | flex, `align-items:flex-start` |
| 5 | Job-context rail | width `296px` (`flex:0 0 296px`); atmosphere block height `230px`, padding `14px`; dept list `margin-top:24px`, `border-top:1px #DDD7CB`, `padding-top:12px`, rows `padding:9px 0` + `border-bottom:1px #E4DFD5` | transparent on ground; atmosphere `repeating-linear-gradient(135deg,#E7E2D9 0 7px,#EFEBE3 7px 14px)` + `1px #DDD7CB` | block flow |
| 6 | Catalogue toolbar | `padding-bottom:14px`, `border-bottom:1px #DDD7CB`, control gap `10px`, control padding `8px 13px` | controls `#FFFEFB` + `1px #C9C2B4` | flex; count left, controls `margin-left:auto` |
| 7 | Product grid | `repeat(3,1fr)`, gap `20px`, `padding-top:20px` | — | CSS grid, equal tracks, no featured cell |
| 8 | Product card | see §F | `#FFFEFB` + `1px #E4DFD5`, radius `0` | flex column, `flex:1` body |
| 9 | Vertical continuation | grid continues to the catalogue end; row 3 is cut by the `900px` fold | — | normal page scroll. No carousel, accordion, horizontal paging or "load more" in place of scroll |

The dashed `900px` line and the `PRODUCT PHOTO` marker in the reference carry
`data-annotation`; they are not part of the design.

---

## C. Visual tokens (exact)

| Token | Value | Used for |
|---|---|---|
| ground | `#F5F2EC` | page |
| surface | `#FFFEFB` | header, nav, cards, controls |
| input well | `#FBF9F4` | search field |
| ink | `#17191A` | names, prices, active nav |
| ink-2 / ink-3 / ink-4 / ink-5 | `#4A4D47` / `#55584F` / `#6E6B63` / `#8A867D` | stock text / rail note / mono meta / placeholder + attribute |
| hairlines | `#E4DFD5` (on surface), `#DDD7CB` (on ground), `#EFEBE3` (in-card divider) | borders |
| control border / input border | `#C9C2B4` / `#D8D2C6` | toolbar, search |
| green-deep | `#14342A` | Job Band, Search button, badges, marks, View-product text |
| green | `#2A6A50` | card department label, in-stock dot, WhatsApp |
| green-on-dark | `#8FB3A2` (labels), `#CDDDD5` (inactive chip text) | Job Band |
| orange | `#D2542A` | **low-stock state only** — no other use |
| out-of-stock dot | `#9A938A` | stock dot |
| image-unavailable panel | `#F2EFE8` + `repeating-linear-gradient(90deg,rgba(20,52,42,.05) 0 1px,transparent 1px 8px)` | missing image |
| display face | `Archivo` 400–800, fallback `"Helvetica Neue",Helvetica,Arial,sans-serif` | wordmark, rail title, prices, readout |
| text face | `IBM Plex Sans` 400–600, fallback `system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif` | all product facts, controls |
| mono face | `IBM Plex Mono` 400–500, fallback `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace` | labels, counts, attribute |

Type scale (size / weight / line-height / tracking):

| Role | Value |
|---|---|
| Wordmark | Archivo 21 / 800 / — / `-.035em` |
| `HARDWARE` | Mono 9.5 / 400 / — / `.18em` |
| Nav item | Sans 13.5 / 400 (active 600) |
| Job chip | Sans 13.5 / 400 (active 600) |
| Job Band labels | Mono 9.5 / 400 / 1.5 / `.2em` |
| Job Band readout | Archivo 16 / 600 / — / `-.01em` |
| Rail title | Archivo 31 / 700 / 1.06 / `-.028em` |
| Rail note | Sans 13.5 / 400 / 1.55 |
| Rail dept row | Sans 13.5 / 400 · count Mono 12 |
| Toolbar count | Mono 12 |
| Control label | Sans 12.5 (Filters 500) |
| Card department | Mono 9 / 400 / — / `.16em` |
| Card name | Sans 14.5 / 500 / 1.34, fixed box `height:39px; overflow:hidden` (2 lines) |
| Card attribute | Mono 11 |
| Card price | Archivo 20 / 700 / — / `-.02em` |
| Card stock | Sans 12 |
| View product | Sans 12.5 / 600 |
| Add to Cart | Sans 12 / 500 |

Controls: search field `38px`; search button padding `0 16px`; toolbar controls padding `8px 13px`;
Add to Cart padding `7px 12px` with `1px solid #17191A`. Radii `0` everywhere. No shadows inside
the page (the canvas drop-shadow in the concept is frame chrome, not design). No transitions were
specified — if any are added, `≤150ms` opacity/border only, and none on layout.
Focus: `outline:2px solid #14342A; outline-offset:2px` on `:focus-visible`.

---

## D. Component map (smallest coherent plan)

Codex must locate the real files in the storefront; the paths below are the *expected* shape, not
verified (see §Unresolved). Reuse before creating.

| Component | Action | Responsibility | Data in | States |
|---|---|---|---|---|
| Existing header | restyle | logo, search, EN/BM/中文, account, cart, department nav | cart count, active department, locale | active department, locale, cart count 0/n |
| `JobBand` | create | job chips + resolves-to readout | job list (config), department counts from catalogue | active job, hover, focus, keyboard |
| `JobContextRail` | create | job title, note, atmosphere slot, departments-in-job list | active job, department counts | active job; atmosphere image present/absent |
| Existing catalogue toolbar | reuse + restyle | result count, Filters disclosure, Sort | result count, filter count, sort key | filter panel open/closed, sort selected |
| Existing product grid | restyle | 3-up equal-track grid | product list | loading, empty, error, results |
| `ProductCard` | restyle existing card | the eight tracks in §F | one product | image ok / unavailable / loading, in stock / low / out, long name, missing attribute |
| Existing filter panel, search, cart, ProductDetailView | reuse unchanged | — | — | — |

Do not restructure routing, state management or data layers.

---

## E. Job Band rule

- Jobs are UI-level lenses defined in one front-end config: `{ id, name, note, atmos, departmentIds[] }`.
- `departmentIds` reference existing canonical department IDs/slugs. No product-level mapping, no
  new taxonomy, no schema or backend change.
- Selecting a job = filter/order the existing catalogue query by those department IDs; the
  department nav stays canonical and independently selectable; **All departments** clears the lens
  and returns the full catalogue.
- Readout is computed at render time: `<count of job departments with ≥1 product> departments · <product count> products`.
  Rail list shows each of those departments with its own count. Never hardcode a number.
- A job whose departments resolve to zero products must not be shown.
- Job names, notes and atmosphere labels are **editorial** — owner approval required before production.

---

## F. Product card reconstruction (eight tracks)

Body padding `14px 15px 15px`; tracks in order, flex column, `flex:1`:

1. **Image state** — reserved frame `height:176px`, `border-bottom:1px #E4DFD5`, `overflow:hidden`. Opens the product.
2. **Department** — Mono 9 / `.16em` / `#2A6A50`, `margin-bottom:7px`. Always present.
3. **Product name** — Sans 14.5 / 500 / 1.34 in a fixed `39px` box, `overflow:hidden`, `text-wrap:pretty`; two lines max, clipped beyond. Opens the product. Never truncate with an ellipsis mid-word band.
4. **Verified attribute** (optional) — Mono 11 / `#8A867D`, `margin-top:7px`. Omit the element entirely when absent; never substitute other copy.
5. **RM price** — Archivo 20 / 700, `margin-top:12px`, `RM 1,299.00` (`en-MY`, space after RM, always 2 decimals).
6. **Stock** — `margin-top:7px`; `7px` dot + text, meaning never carried by colour alone. `In stock` (`#2A6A50`) · `Low stock — N left` (`#D2542A`) · `Out of stock` (`#9A938A`).
7. **View product** — Sans 12.5 / 600 / `#14342A`, text `View product →`, left of the action row. Primary.
8. **Add to Cart** — outlined `1px #17191A`, padding `7px 12px`, Sans 12 / 500. Secondary.

Action row: `margin-top:auto`, `padding-top:13px`, `border-top:1px solid #EFEBE3`,
`justify-content:space-between`, both actions `white-space:nowrap`. `margin-top:auto` is what keeps
the action row aligned across cards of unequal content — keep it.

Forbidden on the card: `tone`, "Catalogue label", inferred brands, fabricated descriptions or
specifications, ratings, reviews, compare, wishlist, variants, promotions, pickup/delivery promises,
warranties, quotation actions. Never invent content to fill space.

---

## G. Image states — exactly three

**1. Real image.** `<img>` inside the `176px` reserved frame; `width/height:100%`,
`object-fit:contain`, `object-position:center`, `padding:10px`, background `#FFFEFB`,
`loading="lazy"`, `alt` = product name. Space is reserved before load, so no reflow.

**2. Image unavailable** (no `imageUrl`): panel `#F2EFE8` with
`repeating-linear-gradient(90deg,rgba(20,52,42,.05) 0 1px,transparent 1px 8px)`; centred column,
`gap:12px`, `padding:0 18px`; `26px` square mark, `1px solid #14342A`,
`linear-gradient(135deg,transparent 49.5%,#14342A 49.5%,#14342A 50.5%,transparent 50.5%)`,
`opacity:.55`; department name Mono 9 / `.18em` / `#14342A`, `margin-bottom:5px`; copy
**“Product image is not available yet.”** Sans 11.5 / `#6E6B63` / 1.4. Contrast ≥ 4.5:1 for the copy.
Semantics: decorative panel, `alt=""` on any mark, the copy is real text.

**3. Loading / runtime failure.** Loading shows the reserved frame with the ground panel and no
copy; on `error`, or when the URL is absent or empty, resolve into state 2. There is no fourth
state — the `PRODUCT PHOTO` marker in the reference is a stand-in for the real `<img>`
(`data-annotation="photo-slot"`) and must not be reproduced in production.

---

## H. Data mapping

| Visible element | Source | Formatter | Fallback | Kind |
|---|---|---|---|---|
| Product name | catalogue `name` | none | never blank; if absent, omit the card | verified |
| Department label | catalogue `category` | uppercase | required | verified |
| Price | catalogue `price` | `RM ` + `toLocaleString('en-MY',{min/maxFractionDigits:2})` | if null, show nothing and suppress Add to Cart | verified |
| Stock band | `stockQty` | §F track 6 | if unknown, omit the stock row — never guess "In stock" | verified |
| Low-stock state | `lowStock` (or `stockQty ≤ threshold` if that is the existing rule) | `Low stock — N left` | falls back to banded | verified |
| Image | `imageUrl` | §G | state 2 | verified |
| Attribute | one existing verified field only | none | omit track | verified |
| Result count | length of the current result set | `N products · <job or department>` | `0` → existing empty state | computed |
| Department counts | group the current catalogue by department | integer | omit a zero-count department | computed |
| Job label / note / atmosphere caption | front-end job config | none | — | **editorial, approval required** |
| Cart count | existing cart state | integer | hide badge at 0 | verified |
| Language labels | existing translations (EN/BM/中文) | none | EN | verified |

Do not hardcode the 13-item concept dataset. `tone` is never displayed.

### Recorded discrepancy — stock display (owner decision required)

| Source | Renders |
|---|---|
| Locked screenshot `01-first-viewport.png` + `3a-worklist-reference.html` (`STOCK_MODE='banded'`) | `In stock` |
| Owner's saved tweak default on `Ekoway Directions.dc.html` (`stockStyle: "banded-with-count"`) | `In stock — 128 available` |
| `CLAUDE.md` locked decision 7 | banded, exact quantity only when low |

Two of three say banded, so the reference and §F track 6 follow banded. This is **unresolved**:
the owner must confirm before production. Switching is one line in the reference
(`STOCK_MODE`) and one branch in the card component. Low-stock and out-of-stock copy is
unaffected either way.

---

## I. Existing behaviour to preserve

Live API loading, fallback catalogue, search, canonical departments, filters, sorting,
ProductDetailView opening, Add to Cart, cart state, translations, keyboard behaviour, loading /
empty / error states, and all protected customer and Admin flows must keep working exactly as they
do now. The Job Band and the rail are additions on top of the existing query, not replacements.
BM and 中文 strings run longer than EN — nav items and chips must stay `nowrap` and the band must
wrap chips to a second line rather than clip.

---

## J. Responsive rules

**Exact** (demonstrated at 1440×900 by the reference): everything in §B, §C, §F.
Fluid down to ~1280 by letting the grid tracks shrink; rail stays `296px`, gutters stay `36px`.

**Derived** (necessary adaptation; preserves 3a, not owner-approved as pixels):
- ≥1024: grid `repeat(2,1fr)`, rail stays.
- <1024: rail collapses — job title + note move above the results, atmosphere block and
  departments-in-job list move into a collapsible block below the readout.
- 390px and 320px: header keeps logo, search (full-width row two), locale, account, cart; department
  nav becomes a horizontally scrollable single row; Job Band becomes a horizontally scrollable chip
  rail with the resolves-to line beneath it, keeping the same type roles and dark ground; grid goes
  single column at full card anatomy — image frame, department, name, attribute, price, stock, View
  product, Add to Cart all retained; touch targets ≥44px; no horizontal page overflow at 320px.
- Card name box: release the fixed `39px` height below 1024 and allow up to 3 lines.

**Unresolved** (needs owner approval): whether the atmosphere image appears at all on ≤390px;
whether the department nav gets a "More" affordance once departments exceed the row; final mobile
Job Band chip order.

---

## K. Accessibility

- Landmarks: `header`, `nav[aria-label="Departments"]`, the Job Band as `section[aria-label="Working on"]`,
  `main` for the shell, `aside[aria-label="Job context"]`.
- Heading order: rail job title `h1` (or `h2` under an existing page `h1`), card names `h2` — no skips.
- Keyboard order: search → locale → account → cart → department nav → job chips → toolbar → cards
  (image/title/View product/Add to Cart).
- Job chips are `button[aria-pressed]`; active department uses `aria-current="page"`; Filters is a
  disclosure with `aria-expanded` and `aria-controls`.
- `:focus-visible` outline `2px #14342A`, offset `2px`. Never remove focus rings.
- Stock meaning is dot **plus** text; contrast ≥4.5:1 for all body copy, ≥3:1 for the dot.
- Touch targets ≥44px on mobile; respect `prefers-reduced-motion`; layout must hold at 200% zoom.
- Product images: `alt` = product name. The unavailable panel: mark `aria-hidden`, copy as text.

---

## L. Fidelity checklist (verify at 1440×900)

- [ ] Region order: header → department nav → Job Band → rail + product field.
- [ ] Header `66px`, nav `46px`, Job Band padding `16px 36px`, gutters `36px`.
- [ ] Job Band on `#14342A`; active chip filled `#F5F2EC`; readout right-aligned behind a hairline.
- [ ] Rail `296px`: job title Archivo 31, note, `230px` atmosphere block, disclosure line, departments-in-job list with counts.
- [ ] Product field: three equal tracks, gap `20px`; toolbar above with count left, Filters + Sort right.
- [ ] Card: `176px` image frame, department, 2-line name box, attribute, Archivo 20 price, dot+text stock, action row on a `#EFEBE3` divider.
- [ ] Six products fully or partly visible above the fold; row 3 cut, page scrolls.
- [ ] RM prices formatted `RM 1,299.00`; low stock shows the exact count and is the only orange element.
- [ ] Longest name wraps to two lines without clipping mid-word or pushing the card taller than its row.
- [ ] View product reads as primary; Add to Cart is the outlined secondary.
- [ ] No Admin entry anywhere; no ratings/reviews/compare/wishlist/`tone`/promotions/delivery claims.
- [ ] No clipping, no page-level horizontal overflow, all four job lenses switch and recount.
- At 390px and 320px: verify function and identity only — do not claim pixel parity with a desktop-only design.

---

## M. Protected scope

Codex must not modify: `backend/**`, `backend/migrations/**`, `deploy/**`, `.github/workflows/**`,
`docker-compose.yml`, `Makefile`, `.claude/launch.json`, `ekoway-landing/**`,
`frontend/src/modules/landing/**`, API routes or query formats, fallback catalogue contents, or
Admin / Account / Login / Checkout / Payment behaviour. No stage, commit, push, merge, reset, rebase.
No dependency additions without owner approval. Branch stays `joseph`.

---

## Final Codex prompt (paste as-is)

```
You are implementing an approved storefront design direction in the Ekoway repository.
Work on branch `joseph` only — confirm you are on it before editing anything.

Read these two files first and treat them as the design authority:
1. design/round-3/3a-worklist-reference.html   (standalone visual reference, exact tokens)
2. design/round-3/3a-worklist-codex-handoff.md (reconstruction spec, sections A–M)
Also look at design/round-3/01-first-viewport.png for the approved desktop appearance.

Task: implement direction "3a Worklist" in the existing customer storefront category/listing
view. Reproduce the desktop appearance at 1440x900 with high fidelity. Do not redesign,
simplify or "improve" it. Where a production constraint forces a change, record it as a
deviation in your report instead of silently altering the design.

Scope of work:
- Inspect only the storefront files you need: the category/listing view, product card, product
  grid, catalogue toolbar (filters/sort), header and department navigation, and the catalogue
  data/API layer that feeds them. Do not audit unrelated areas.
- Reuse existing behaviour: live API loading, fallback catalogue, search, canonical departments,
  filters, sorting, ProductDetailView opening, Add to Cart, cart state, translations, keyboard
  handling, loading/empty/error states. Add nothing unsupported.
- Add the Job Band and the job-context rail as new UI-level components. Jobs are a front-end
  lens config of {id, name, note, atmos, departmentIds[]} pointing at existing canonical
  department IDs. No backend change, no schema change, no new taxonomy, no product-level
  classification.
- Departments stay canonical and independently selectable. "All departments" clears the lens.
- Compute the Job Band readout and every department count from the real catalogue at render
  time ("N departments - M products"). Never hardcode counts. Never ship the 13-item concept
  dataset.
- Prices in MYR formatted "RM 1,299.00" via the existing formatter.
- Product card: image state, department, 2-line name, one optional verified attribute, RM price,
  stock band (exact quantity only when low), "View product ->" as primary, outlined "Add to Cart"
  as secondary. Do not display tone, ratings, reviews, compare, wishlist, variants,
  specifications, promotions, delivery or pickup promises, or warranties.
- Images: exactly three states - real image in the reserved 176px frame; "Product image is not
  available yet." panel when there is no image; loading or runtime failure resolves into that
  same unavailable panel. The PRODUCT PHOTO marker in the reference is a stand-in for a real
  <img> and must not be reproduced.
- Responsive: follow section J. Desktop is authoritative; mobile uses the conservative
  adaptation described there. No horizontal page overflow at 320px. Do not invent a different
  visual direction for mobile.
- Accessibility: follow section K.

Do not modify: backend/**, backend/migrations/**, deploy/**, .github/workflows/**,
docker-compose.yml, Makefile, .claude/launch.json, ekoway-landing/**,
frontend/src/modules/landing/**, API routes or query formats, fallback catalogue contents, or
Admin, Account, Login, Checkout and Payment behaviour. Do not add dependencies without owner
approval. Do not stage, commit, push, merge, reset or rebase.

When implementation is complete:
1. Run only targeted checks on the files you changed (lint/typecheck for those files). Do not
   run the full test suite or a production build.
2. Capture one desktop screenshot at 1440x900 and one mobile screenshot at 390px.
3. Compare the desktop screenshot against design/round-3/01-first-viewport.png and the fidelity
   checklist in section L. Fix material differences in structure, proportion, type, colour,
   price/stock formatting or action hierarchy.
4. Report: files changed, checks run, checklist results, any deviations and why, and anything
   the owner must decide (job names and notes are editorial and need approval).
5. Stop for owner review. Do not commit, push, merge, or start any further pass.
```
