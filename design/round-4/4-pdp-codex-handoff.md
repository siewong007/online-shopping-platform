# ProductDetailView — Codex handoff (reconstruction spec + integration rules + prompt)

Visual authority, in order: `design/round-4/01-pdp-desktop-1440x900.png` →
`design/round-4/02-pdp-mobile-390x844.png` → `design/round-4/4-pdp-reference.html` →
this document. The reference HTML is the token source; every value below is extracted from it.
Do not restyle.

The listing (`design/round-3/3a-worklist-reference.html`) is **frozen**. This page inherits its
colour, type, hairlines and card component verbatim and changes none of them.

**Owner decisions locked into this revision (6 Aug 2026):**

1. Stock is banded only — `In stock` / `Low stock — N left` / `Out of stock`. A normal in-stock
   product never displays a quantity. No alternative stock presentation exists.
2. No customer-facing copy explains, apologises for or substitutes missing product information.
   Absent optional data removes its element and its verified cell; the strip rebalances to three.
3. The Job Band is not repeated. Only a restrained, translated `Still working on: <job>` line,
   and only under an active verified lens.
4. Out of stock disables Add to Cart, labels the state plainly, and lets the contact action become
   the next available action — promising nothing.
5. The mobile decision block owns name, price, stock, quantity and Add to Cart; the condensed bar
   is a scroll-away replacement, never a duplicate.

---

## A. Thesis

The listing states the job; the detail view **settles the decision**. Everything the customer
needs to commit — department, exact name, exact RM price, stock, quantity, Add to Cart, and a
route to a human — sits above the 900px fold with no scrolling and no invented content.

The page carries no second navigation, no job band (that belongs to the listing), no tabs, no
accordions and no marketing sections. **The Job Band is never repeated here.** Its *state* survives
only as one restrained line — `Still working on: <job>` — and only when the customer arrived
through a verified job lens that is still present in navigation state. Translated wording, no
count, no chips, no second category system. With no verified job context the line is omitted and
reserves no space.

**Content honesty is the design.** The catalogue holds seven customer-facing fields. The page
shows those seven and stops. Every absent field removes its element rather than filling it.

---

## B. Page anatomy, top to bottom (desktop 1440)

Page column `1440px`, ground `#F5F2EC`, gutter `36px` left/right for every region.

| # | Region | Metrics | Surface / border | Layout |
|---|---|---|---|---|
| 1 | Public header | height `66px`, inner gap `28px` | `#FFFEFB`, bottom `1px #E4DFD5` | **Unchanged from the listing.** Logo → search (`flex:1`, `max-width:520px`, `38px`) → utils (`margin-left:auto`, gap `20px`) |
| 2 | Department nav | height `46px`, item gap `26px` | `#FFFEFB`, bottom `1px #E4DFD5` | **Unchanged.** Active item = the product's own department, `aria-current="page"`. WhatsApp link `margin-left:auto` |
| 3 | Context bar (new) | height `44px`, gap `18px`, divider `1px×15px #DDD7CB` | ground, bottom `1px #DDD7CB` | flex: Back to products → divider → breadcrumb → optional job context line `margin-left:auto` (omitted entirely when no lens) |
| 4 | Product region | `display:grid; grid-template-columns:1fr 456px; gap:32px; padding:26px 36px 0; align-items:start` | ground | image column + buy panel |
| 5 | Image viewer | height `500px`, `overflow:hidden` | `#FFFEFB` + `1px #E4DFD5` | reserved frame, three states (§G) |
| 6 | Buy panel | width `456px`, padding `24px 24px 22px` | `#FFFEFB` + `1px #E4DFD5` | §F |
| 7 | Verified information | `margin:22px 36px 0`, padding `16px 22px 18px`; cells `padding:0 26px`, `border-left:1px #EFEBE3` (first cell no border, no left padding) | `#FFFEFB` + `1px #E4DFD5` | full-width strip; `display:flex`, each cell `flex:1 1 0; min-width:0` so 3 or 4 cells always balance |
| 8 | Continuation | `padding:26px 36px 40px`; head `padding-bottom:13px`, `border-bottom:1px #DDD7CB`; grid `repeat(4,1fr)`, gap `20px`, `padding-top:20px` | ground | frozen listing cards, unchanged |

Radii `0` everywhere. No shadows. No transitions specified — if added, `≤150ms` opacity/border
only, never layout.

**Fold behaviour (verified in the screenshot):** header + nav + context bar = `156px`; the buy
panel closes at ≈`622px`; the verified strip closes at ≈`855px`. The entire decision and all
verified facts are above `900px`; the continuation begins below it.

The dashed `900px` line, the `PRODUCT PHOTO` marker and every mono caption in the reference carry
`data-annotation` — they are concept chrome, not design.

---

## C. Visual tokens (exact — all inherited from 3a)

| Token | Value | Used for |
|---|---|---|
| ground | `#F5F2EC` | page |
| surface | `#FFFEFB` | header, nav, viewer, buy panel, verified strip, cards |
| input well | `#FBF9F4` | search field |
| ink / ink-2 / ink-3 / ink-4 / ink-5 | `#17191A` / `#4A4D47` / `#55584F` / `#6E6B63` / `#8A867D` | name + price / stock text / body / labels / mono meta |
| hairlines | `#E4DFD5` (on surface), `#DDD7CB` (on ground), `#EFEBE3` (inside panels) | borders |
| control border | `#C9C2B4` | quantity control, WhatsApp button |
| green-deep | `#14342A` | Add to Cart fill, Search button, back link, marks |
| green | `#2A6A50` | department label, in-stock dot, WhatsApp text |
| orange | `#D2542A` | **low-stock state only** |
| out-of-stock dot | `#9A938A` | stock dot |
| image-unavailable | `#F2EFE8` + `repeating-linear-gradient(90deg,rgba(20,52,42,.05) 0 1px,transparent 1px 8px)` | missing image panel |
| disabled fill | `#DDD7CB` with `#6E6B63` text | Add to Cart when out of stock |
| display face | Archivo 400–800 | wordmark, product name, price |
| text face | IBM Plex Sans 400–600 | facts, controls, breadcrumb |
| mono face | IBM Plex Mono 400–500 | labels, attribute, counts |

Type scale (size / weight / line-height / tracking):

| Role | Value |
|---|---|
| Back to products | Sans 13 / 600 / `#14342A`, arrow in mono |
| Breadcrumb | Sans 12.5 / 400 / `#6E6B63`; current item `#4A4D47`, `max-width:470px`, ellipsis |
| Job context line | Sans 12.5 / `#6E6B63`, job name `500` `#4A4D47`, `nowrap` — one line, no label chip, no count |
| Buy department | Mono 9.5 / `.18em` / `#2A6A50` |
| **Product name** | **Archivo 30 / 700 / 1.13 / `-.026em`**, `margin-top:11px`, `text-wrap:pretty`, no clamp |
| Attribute | Mono 11.5 / `#8A867D`, `margin-top:12px` |
| Divider | `1px #EFEBE3`, `margin:18px 0` |
| **Price** | **Archivo 38 / 700 / 1 / `-.03em`** |
| Stock | Sans 13.5 / `#4A4D47`, `8px` dot, gap `9px`, `margin-top:13px`, `nowrap` |
| Quantity value | Mono 14 |
| Add to Cart | Sans 14.5 / 600, height `52px` |
| WhatsApp action | Sans 13 / 500 / `#2A6A50`, height `46px`, `7px` dot |
| Panel foot | Sans 12.5 / 600 link + Mono 11 count, `padding-top:14px`, `border-top:1px #EFEBE3` |
| Verified label | Mono 9.5 / `.2em` / `#8A867D` |
| Verified dt / dd | Sans 12 `#6E6B63` (`margin-bottom:8px`) / Sans 15 `#17191A`; mono values Mono 14 |
| Verified note | Sans 12 / 1.5 / `#6E6B63`, `padding-top:14px`, `border-top:1px #EFEBE3`, `max-width:760px` |
| Continuation head | Archivo 19 / 600 + Mono 11.5 count + Sans 12.5 / 600 link |

Focus: `outline:2px solid #14342A; outline-offset:2px` on `:focus-visible`. Never removed.

---

## D. Component map

Reuse before creating. Paths are the *expected* shape, not verified — locate the real files first.

| Component | Action | Responsibility | States |
|---|---|---|---|
| Existing header + department nav | reuse as restyled in pass 3 | unchanged | active department = product's category |
| `ProductBreadcrumbBar` | create | back link, breadcrumb, optional job context line | with / without an active job lens; long name truncation |
| `ProductViewer` | restyle existing image area | reserved `500px` frame | image / unavailable / loading |
| `ProductBuyPanel` | restyle existing detail panel | department, name, attribute, price, stock, quantity, Add to Cart, contact, back link | in stock / low / out; fallback; missing attribute |
| `VerifiedInformation` | create | 3 or 4 verified fact cells + the one-sentence note | 4 cells with attribute / 3 balanced cells without |
| Existing `ProductCard` + grid | reuse **unchanged** | continuation row | as on the listing |
| Existing cart, translations, routing, API/fallback layer | reuse unchanged | — | — |

Do not restructure routing, state management or data layers. Do not add a gallery, tabs, an
accordion, a sticky desktop bar, related-product carousels, or a review module.

---

## E. Action hierarchy (exactly four, in this order)

1. **Understand** — image, department, name, attribute, price, stock, verified strip. No action competes with this: the panel states the facts before it offers a button.
2. **Add to Cart** — the only filled `#14342A` element in the product region, `52px`, paired with the quantity control. Prominent, never misleading: disabled and relabelled `Out of stock` when `stockQty === 0`; never "Buy now", never a countdown, never a discount claim.
3. **Ask about this product on WhatsApp** — outlined `1px #C9C2B4`, `46px`, directly under Add to Cart. Takes the `#14342A` lead outline **only** when Add to Cart is disabled, so a dead end never occurs — it becomes the next available action, not a substitute purchase. Wording stays a question in every locale: it must never imply that contacting the store guarantees stock, a reservation, a quotation or an order. This is the page-level contact action; the store-level WhatsApp link in the nav is inherited chrome and stays as-is.
4. **Return to catalogue** — three honest exits: `← Back to products` (browser-history back to the exact listing state) in the context bar, `← All <Department>` with its real count in the panel foot, and the continuation row.

**Request quotation is NOT on this page.** No field in the contract states whether a product is
quotable. Render a quotation action only when a verified customer-facing flag exists; until then
its absence is correct, and WhatsApp is the supported route.

---

## F. Buy panel reconstruction (order is fixed)

1. Fallback strip (conditional, §G4) — `#F2EFE8`, `1px #DDD7CB`, padding `10px 12px`, `margin-bottom:16px`.
2. **Department** — Mono 9.5 / `.18em` / `#2A6A50`, uppercase. Always present.
3. **Product name** — Archivo 30/700, `<h1>`, **full exact name, never truncated or clamped** on this page. Wraps to as many lines as needed (three verified in state 3).
4. **Attribute** (optional) — Mono 11.5 / `#8A867D`. Omit the element entirely when absent.
5. Divider `1px #EFEBE3`.
6. **Price** — Archivo 38/700, `RM 2,798.00` (`en-MY`, space after RM, always 2 decimals, thousands separator).
7. **Stock** — `8px` dot + text, meaning never carried by colour alone: `In stock` `#2A6A50` · `Low stock — N left` `#D2542A` · `Out of stock` `#9A938A`. Exact quantity **only** in the low band — the normal band reads `In stock` and never carries a number, an "available" count or a threshold.
8. **Quantity + Add to Cart** — one flex row, gap `12px`, both `52px` tall. Quantity `132px`: `−` `41px` / value `48px` (Mono 14, `1px #EFEBE3` side borders) / `+` `41px`, outer border `1px #C9C2B4`. Disabled together with Add to Cart when out of stock.
9. **WhatsApp contact** — full width, `46px`, `margin-top:10px`.
10. **Panel foot** — `← All <Department>` + `<n> products`, `nowrap`, on a `1px #EFEBE3` rule.

Forbidden in the panel: descriptions, brands, specifications, `tone`, ratings, reviews, variants,
warranties, delivery or pickup promises, promotions, urgency copy, wishlist, compare, share,
"customers also bought", or any invented field.

**Quantity control:** render only if the existing cart already accepts a quantity. If it does not,
drop the control and let Add to Cart span the full `456px` at the same `52px` height — do not
build new cart capability for a design pass.

---

## G. Image and data states

**1. Real image** — `<img>` in the reserved `500px` frame: `width/height:100%`,
`object-fit:contain`, `object-position:center`, `padding:28px`, background `#FFFEFB`,
`alt` = product name. The frame is reserved before load, so nothing reflows.

**2. Image unavailable** — panel `#F2EFE8` with the 1px/8px vertical rule gradient; centred
column, gap `18px`; `44px` square mark (`1px solid #14342A`, `linear-gradient(135deg,transparent
49.5%,#14342A 49.5%,#14342A 50.5%,transparent 50.5%)`, `opacity:.55`, `aria-hidden`); department
Mono 10 / `.2em` / `#14342A`, `margin-bottom:8px`; copy **"Product image is not available yet."**
Sans 14 / `#6E6B63`. This is the same component as the listing, scaled up — identical wording.

**3. Loading / runtime failure / generic placeholder URL** — resolve into state 2. A URL that is
empty, null, a known placeholder host, or fails to load is treated as absent. There is no fourth
state; the `PRODUCT PHOTO` marker in the reference is a stand-in for the real `<img>` and must
not be reproduced.

**4. Saved fallback product** — the page renders identically; nothing is hidden or degraded. One
strip above the buy panel: label `SAVED CATALOGUE` (Mono 9 / `.18em` / `#14342A`) + "Showing
saved product information because the live catalogue could not be reached. Price and availability
may not be current." Add to Cart keeps working exactly as it does today.

**5. Not found** — only when the id resolves to nothing. Header, department nav and context bar
stay; the product region is replaced by one surface panel: Archivo 24/700 "This product is not
available." + Sans 13.5 "It may have been removed from the catalogue, or the link may be out of
date." + `Back to products` (filled, `200px`) and `Ask the store on WhatsApp` (outlined). Never a
blank page, never an invented product, never a silent redirect.

---

## H. Data-field mapping

Contract in this project (`seed-catalogue.js`): `id, name, category, price, stockQty, lowStock,
imageUrl, attribute`. Nothing else is shown because nothing else is verified.

| Visible element | Source | Formatter | Missing → |
|---|---|---|---|
| Breadcrumb department + nav active state | `category` | none | required |
| Breadcrumb current item | `name` | ellipsis at `470px` | required |
| Job context line | existing job-lens UI state (not product data) | `Still working on: <job>`, translated, no count | omit the line entirely; reserve no space |
| Department label | `category` | uppercase | required |
| Product name (`h1`) | `name` | none, never truncated | if absent, treat as not-found |
| Attribute | `attribute` | none | omit line **and** its verified cell |
| Price | `price` | `RM ` + `toLocaleString('en-MY',{min/maxFractionDigits:2})` | omit price and suppress Add to Cart |
| Stock band | `stockQty`, `lowStock` | §F track 7 | omit the stock row — never guess "In stock" |
| Image | `imageUrl` | §G | state 2 |
| Verified cells | `category`, `attribute`, `price`, `stockQty` | as above | the cell is removed and the strip rebalances to 3 equal cells — never an empty `Product detail` heading, never placeholder copy |
| Panel-foot / continuation counts | count of the department in the live catalogue | integer | omit the row if 0 |
| Continuation cards | live catalogue, same department, current product excluded | frozen card | render nothing if none |
| Cart count, locale | existing state | — | — |

`tone` is never displayed, never relabelled, never used to order anything. Never ship the 13-item
concept dataset. Never invent a description, brand, spec, rating, review, variant, warranty,
delivery or pickup promise, promotion or quotation availability to balance the layout.

**Verified-information note — owner-locked, exactly one sentence:** "Only information confirmed by
Ekoway is shown." Nothing may be appended to it. Never explain what is missing, never apologise
for it, never offer a workaround in its place — no "no description has been supplied", no "N/A",
no placeholder, no invented specification. Absent optional data simply removes its cell and the
remaining verified cells redistribute. When a real description field is added to the contract,
render that description as its own verified content; until then the strip carries facts only.

---

## I. Responsive rules

**Exact** (demonstrated by the screenshots): desktop `1440×900` = §B/§C/§F; mobile `390×844` =
below.

**Mobile 390 — deliberately recomposed, not a shrunk desktop:**

| Region | Metrics |
|---|---|
| Header row 1 | `52px`: logo (Archivo 18) + EN/BM/中文 + account + cart, padding `0 12px`, `9px` internal gaps (tightened conservatively so Account is never dropped) |
| Header row 2 | `46px`: full-width visible search, field `34px` |
| Department nav | `40px`, horizontally scrollable, active department first, `nowrap` |
| Context bar | `38px`: `← All <Department>` + mono count right |
| Viewer | `258px`, full-bleed, `border-bottom:1px #E4DFD5` |
| Decision block | one surface block, padding `16px 14px 18px`: department → name (Archivo 23/1.16) → attribute → rule → price (Archivo 31) → stock → quantity (`118px`) + Add to Cart, both `52px` → WhatsApp `46px` |
| Verified information | single column; each cell a `label / value` row on a `1px #EFEBE3` top rule |
| Continuation | single column, full card anatomy, head stacked |
| Condensed action bar | `70px`, pinned bottom, `border-top:1px #C9C2B4`: price (Archivo 19) + stock micro-line + quantity + Add to Cart (`48px`); page reserves `70px + env(safe-area-inset-bottom)` of bottom padding |

Mobile rules. The main product block must carry **product name, RM price, stock, quantity (when
the cart supports it) and Add to Cart** as **one uninterrupted block on one surface** — never
split by a section boundary, never separated by an inserted module. The condensed bar appears
**only after that block has scrolled out of view**: never two visible prices and never two Add to
Cart controls at the same time. The bar must not cover content, browser controls or accessibility
focus — reserve bottom padding equal to its height plus `env(safe-area-inset-bottom)`, set a
matching `scroll-padding-bottom`, and ensure a focused control is never obscured by it. Nothing
from desktop is dropped. Touch targets ≥`44px`. No horizontal overflow at `320px`.

**Derived (not owner-approved as pixels):** 1024–1439 — same two columns, viewer height fluid
`440–500px`, buy panel stays `456px`; 768–1023 — single column, viewer `380px`, buy panel
full-width directly beneath, verified strip wraps to two columns, continuation `repeat(2,1fr)`;
below 768 — mobile composition above.

**Unresolved (owner):** whether the condensed action bar also appears on tablet widths; whether
the job context line survives at 390 (currently dropped in favour of the department back link).

---

## J. Accessibility

- Landmarks: `header`, `nav[aria-label="Departments"]`, `nav[aria-label="Breadcrumb"]`, `main`, `aside[aria-label="Purchase"]`.
- Heading order: product name is the page `h1`; `VERIFIED INFORMATION` and `More in <Department>` are `h2`; continuation card names `h3`. No skips.
- Keyboard order: search → locale → account → cart → department nav → back → breadcrumb → quantity → Add to Cart → WhatsApp → verified note link → continuation cards.
- Quantity is a `role="group"` with labelled `−`/`+` buttons and a labelled numeric input; all three disable together when out of stock.
- Add to Cart is a real `<button>`; `disabled` plus visible label change (never colour alone). Announce the cart result in a live region if one already exists.
- Stock meaning = dot **plus** text. Body copy contrast ≥4.5:1, dots ≥3:1.
- `alt` = product name on real images; the unavailable panel's mark is `aria-hidden` and its copy is real text.
- Active department carries `aria-current="page"`; the breadcrumb's current item is not a link.
- Respect `prefers-reduced-motion`; layout must hold at 200% zoom; touch targets ≥44px.

---

## K. Existing functionality to preserve

Live API loading, saved fallback catalogue, search, canonical departments, filters, sorting,
routing into and out of this view, quantity handling (if present), Add to Cart, cart state and
badge, translations (EN/BM/中文), loading / empty / error states, keyboard behaviour, and all
protected customer and Admin flows must keep working exactly as they do now. BM and 中文 run
longer than EN: the name has no clamp, the breadcrumb truncates, nav and chips stay `nowrap`, and
buttons must grow in height rather than clip. **No Admin entry anywhere in the public UI.**

---

## L. Protected scope

Do not modify: `backend/**`, `backend/migrations/**`, `deploy/**`, `.github/workflows/**`,
`docker-compose.yml`, `Makefile`, `.claude/launch.json`, `ekoway-landing/**`,
`frontend/src/modules/landing/**`, API routes or query formats, fallback catalogue contents, the
approved category/listing view, or Admin / Account / Login / Checkout / Payment behaviour.
No dependency additions without owner approval. No stage, commit, push, merge, reset, rebase.
Branch stays `joseph`.

---

## M. Fidelity checklist (verify at 1440×900, then 390×844)

- [ ] Region order: header `66px` → department nav `46px` → context bar `44px` → viewer + buy panel → verified strip → continuation.
- [ ] Gutters `36px`; product grid `1fr / 456px` with `32px` gap; viewer `500px`.
- [ ] Active department in the nav matches the product's category.
- [ ] Back to products, breadcrumb and the panel-foot department link all work; the job context line appears only when a verified lens is still active, is translated, carries no count, and reserves no space when absent.
- [ ] Buy panel order: department → name → attribute → rule → price → stock → quantity + Add to Cart → WhatsApp → foot.
- [ ] Add to Cart is the only filled `#14342A` control in the product region; WhatsApp is outlined beneath it.
- [ ] Price reads `RM 2,798.00`; normal stock reads `In stock` with no quantity; low stock is the only orange element and the only band showing a number.
- [ ] Out of stock: Add to Cart disabled and relabelled, quantity disabled, contact action takes the lead outline and promises nothing.
- [ ] Missing image → the exact unavailable panel with the department and "Product image is not available yet."; the frame does not collapse.
- [ ] Missing attribute → the line and its verified cell are both removed, the strip rebalances to three cells, and no empty `Product detail` heading, dash, "N/A" or explanatory copy appears.
- [ ] Long name wraps in full — never truncated, clamped or ellipsised in the buy panel.
- [ ] Saved fallback shows the disclosure strip and nothing else changes.
- [ ] Not-found panel keeps the header, nav and context bar and offers both exits.
- [ ] Verified strip shows only Department / (Product detail) / Price / Availability, and its note is exactly one sentence — no copy anywhere explains, apologises for or substitutes missing data. Closes above the `900px` fold.
- [ ] Continuation uses the frozen listing card with no anatomy changes; counts computed from the live catalogue.
- [ ] No description, brand, spec, rating, review, variant, warranty, delivery/pickup promise, promotion, quotation action, `tone`, or Admin entry anywhere.
- [ ] Mobile: name/price/stock/quantity/Add to Cart in one block; the condensed bar appears only after it scrolls away, never duplicating a visible price or Add to Cart, never covering content, browser controls or focus; no horizontal overflow at 320px.

---

## Final Codex prompt (paste as-is)

```
You are implementing an approved storefront design in the Ekoway repository.
Work on branch `joseph` only — confirm you are on it before editing anything.

Read these first and treat them as the design authority:
1. design/round-4/4-pdp-reference.html        (standalone visual reference, exact tokens)
2. design/round-4/4-pdp-codex-handoff.md      (this spec, sections A-M)
3. design/round-4/01-pdp-desktop-1440x900.png (approved desktop appearance)
4. design/round-4/02-pdp-mobile-390x844.png   (approved mobile appearance)
Context only: design/round-3/3a-worklist-reference.html is the already-approved listing. Do not
change it. This page inherits its colours, type, hairlines and product card verbatim.

Task: implement the ProductDetailView in the existing customer storefront. Reproduce the desktop
appearance at 1440x900 and the mobile appearance at 390x844 with high fidelity. Do not redesign,
simplify or "improve" it. Where a production constraint forces a change, record it as a deviation
in your report instead of silently altering the design.

Scope of work:
- Inspect only what you need: the product detail view, its route, the product type/data contract,
  the product card, the header and department navigation, and the catalogue data/API and fallback
  layer that feed them. Do not audit unrelated areas.
- Reuse existing behaviour: live API loading, saved fallback catalogue, routing, translations
  (EN/BM/中文), cart state, quantity handling if it already exists, loading/empty/error states,
  keyboard handling. Add nothing unsupported.
- Build the page exactly as section B: header (66px, unchanged) -> department nav (46px,
  unchanged, active item = the product's department) -> context bar (44px: "Back to products",
  breadcrumb, optional one-line job context) -> product region (grid 1fr / 456px, gap 32px, gutter
  36px) with a 500px reserved image frame and the buy panel -> full-width verified information
  strip -> continuation row of existing product cards from the same department.
- Buy panel order is fixed (section F): department, exact product name (Archivo 30/700, NEVER
  truncated or clamped), optional attribute, rule, RM price (Archivo 38/700), stock band,
  quantity + Add to Cart (both 52px), WhatsApp contact (46px), foot link back to the department.
- Show ONLY fields that genuinely exist in the product contract: name, category, price, stockQty,
  lowStock, imageUrl, attribute. Do not invent or infer descriptions, brands, specifications,
  ratings, reviews, variants, warranties, delivery or pickup promises, promotions, technical
  attributes or quotation availability. Never display or relabel `tone`. When a field is missing,
  remove its element - no dashes, no "N/A", no substituted copy.
- Missing optional data collapses silently. If a product has no verified attribute, omit the
  attribute line AND its verified-information cell, and let the strip rebalance to three equal
  cells - never keep a four-cell layout, never render an empty "Product detail" heading. Do NOT
  add any customer-facing sentence explaining, apologising for or working around missing data.
  The verified-information note is exactly one sentence: "Only information confirmed by Ekoway is
  shown." Nothing may be appended to it.
- Do not repeat the Job Band on this page. A single restrained "Still working on: <job>" line may
  appear in the context bar ONLY when the customer arrived through a verified job lens that is
  still present in navigation state; it must be a translated string, must carry no product count
  or chips, and must not create a second category system. With no verified job context, omit the
  line and reserve no space for it.
- Do not add a quotation action. It is not supported by any verified field.
- Prices in MYR formatted "RM 1,299.00" via the existing formatter. Stock is exactly three bands:
  "In stock", "Low stock — N left" (the only place a quantity is shown, and the only orange on
  the page), "Out of stock". Never show a quantity, an "available" count or a threshold for a
  normal in-stock product.
- Add to Cart is the only filled #14342A control in the product region. When stockQty is 0 it is
  disabled and clearly relabelled "Out of stock", the quantity control is disabled with it, and
  the restrained contact action takes the lead outline as the next available action. Its wording
  stays a question in every locale and must never imply that contacting the store guarantees
  stock, a reservation, a quotation or an order. Never promise a restock date.
- Images: exactly three states (section G) - real image in the reserved 500px frame; the approved
  "Product image is not available yet." panel when the URL is empty, a generic placeholder or
  fails to load; loading resolves into that same panel. The PRODUCT PHOTO marker in the reference
  is a stand-in for a real <img> and must not be reproduced.
- Saved fallback products must keep working and render the identical page plus the SAVED
  CATALOGUE disclosure strip. Not-found renders the documented panel with both exits, never a
  blank page and never an invented product.
- Compute every count (department product counts, continuation cards) from the live catalogue at
  render time. Never hardcode counts. Never ship the 13-item concept dataset.
- Responsive: follow section I. Mobile is a deliberate recomposition, not a shrunk desktop. The
  main product block carries product name, RM price, stock, quantity (when the cart supports it)
  and Add to Cart as one uninterrupted block. The condensed bottom action bar appears only after
  that block has scrolled out of view - never two visible prices and never two Add to Cart
  controls at once - and must not cover content, browser controls or accessibility focus (reserve
  bottom padding of its height plus env(safe-area-inset-bottom) and a matching
  scroll-padding-bottom). No horizontal overflow at 320px.
- Accessibility: follow section J. Product name is the page h1.

Do not modify: backend/**, backend/migrations/**, deploy/**, .github/workflows/**,
docker-compose.yml, Makefile, .claude/launch.json, ekoway-landing/**,
frontend/src/modules/landing/**, API routes or query formats, fallback catalogue contents, the
approved category/listing view, or Admin, Account, Login, Checkout and Payment behaviour. Do not
add dependencies without owner approval. Do not stage, commit, push, merge, reset or rebase.

When implementation is complete:
1. Run only targeted checks on the files you changed (lint/typecheck for those files). Do not run
   the full test suite or a production build.
2. Capture one desktop screenshot at 1440x900 and one mobile screenshot at 390x844.
3. Verify every state in section M against real catalogue data: real image, image unavailable,
   long name, high price, low stock, normal stock (no quantity shown), out of stock, missing
   attribute (three-cell strip), saved fallback, not found.
4. Compare against the two approved screenshots and fix material differences in structure,
   proportion, type, colour, price/stock formatting or action hierarchy.
5. Report: files changed, checks run, checklist results, deviations and why, and anything the
   owner must decide (currently: whether the condensed action bar also applies at tablet widths,
   and whether the job context line should survive at 390).
6. Stop for owner review. Do not commit, push, merge, or start any further pass.
```
