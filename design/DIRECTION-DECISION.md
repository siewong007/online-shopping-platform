# Direction Decision — Step 2B

Date: 2026-07-31 · Branch: `joseph` · Decided after independent re-verification of both
Step 2A prototypes, not from their READMEs alone.

---

## 1. Executive decision

**Direction A — "Trade Counter" is selected.**

Direction A's information architecture (dense listing + persistent facets + spec-forward
product detail) is the one that fits the catalogue Ekoway actually has, matches the
workflow's own definition of what a top-tier hardware retailer does, and degrades
predictably as the catalogue grows. Direction B's guided-project model is a better answer
to one real customer question ("I know my problem, not the product") but pays its cost
immediately — zero products on the front door — while its main benefit (narrowing a large
catalogue) is unrealised against a real 8-product, one-item-per-category dataset.

This is a selection of **A's information architecture and visual thesis**, not an
endorsement of the prototype as built. A has a confirmed functional defect (§4) that is
mandatory to fix, and an unresolved brand question (§8) that the owner must settle.

**"Neither / redo Step 2" was considered and rejected.** Both prototypes render real data
honestly, throw zero console errors, and have zero horizontal overflow at 1440/390/320 and
at ≈200 % zoom. Both are above the quality floor that would justify redoing Step 2.

---

## 2. Final scores

Weighted /100. Scored against evidence gathered in §3, not against the READMEs' own claims.

| Category | Weight | A | B |
|---|---:|---:|---:|
| Hardware-retailer credibility | 15 | **13** | 9 |
| Product-finding effectiveness | 15 | **11** | 12 → see note |
| Desktop effectiveness | 10 | **9** | 5 |
| Mobile effectiveness | 15 | 9 | **12** |
| Real-data resilience | 10 | **9** | **9** |
| Accessibility and clarity | 10 | **7** | **7** |
| Distinctiveness and memorability | 10 | **9** | 7 |
| Implementation feasibility | 10 | **7** | 5 |
| Scalability to a larger catalogue | 5 | **4** | 2 |
| **Total** | **100** | **78** | **68** |

Note on *Product-finding effectiveness*: B scores higher **as built** (12 vs 11) because
all of its discovery paths work and A's do not (§4). A's design scores ~14 on this axis;
3 points are deducted for a defect that is real, one-line-fixable, and provably not a
design flaw (the same filtering and empty-state code renders correctly when reached from
another route). This is the only category where the two are close, and it is the only
category where B leads on the merits of its own idea rather than on A's bug.

Category winners: A takes 6, B takes 2 (mobile, product-finding-as-built), 2 are ties.

---

## 3. Decisive evidence

All items below were verified in this step by driving both prototypes in a headless
Chromium instance and by inspecting the captured screenshots — not taken from the
Step 2A documentation.

**Density, quantified.** On the landing view at 1440×900, A renders all 8 real SKUs with
price, stock, category and badge in aligned columns
(`design/direction-a/screenshots/desktop-01-listing.png`). B renders **zero** products —
a DOM probe of `#view-root` on `#/` returned 0 product-name matches for B versus 15 for A.
For a hardware retailer's front door this is the single largest functional difference
between the two directions.

**Low result counts are the common case, and B handles them poorly.** Searching "paint"
returns 1 real product. In B's three-column card grid that leaves roughly two-thirds of a
1440×900 viewport empty (`design/direction-b/screenshots/desktop-02-search-paint.png`).
Given a catalogue with exactly one product per category, near-empty result grids are not
an edge case for B — they are the default outcome.

**Comparison speed.** A's aligned price column in tabular monospace numerals lets a
contractor scan eight prices down a single axis; B requires reading a price out of each
separated card. This directly serves the workflow's "treats price and stock as typographic
elements with real hierarchy."

**Spec-readiness.** A's product detail is already a key-value spec table with an explicit
row reading *"Detailed spec sheet: Not provided for this SKU in the current catalogue
schema"* (`design/direction-a/screenshots/desktop-05-product-detail.png`). When real spec
fields arrive they become additional rows. B presents the same facts as narrative prose
plus a small fact panel, which would need restructuring to absorb tabular specs.

**Both are honest about real data — equally.** Both `#/states` pages label every state
`REAL` or `SIMULATED`, both show the "Top Rated" badge / zero-review contradiction on the
BEHR product rather than hiding it, both leave the catalogue's "Online Shopping"
mis-branding visible, and both treat the 100 %-missing-image case as a designed default
rather than an error. Neither direction invents catalogue data. This was not a
differentiator.

**Brand provenance verified.** Both directions' accent colours are genuine: the live
`frontend/src/styles.css` defines `--orange: #f96302` (line 8) and `--green: #1d5a39`
(line 3209). A uses `--a-accent: #f96302` exactly; B uses both `#1d5a39` and `#f96302`
exactly. B is the more brand-continuous of the two — see §8.

**Shared-CSS risk is identical, not a differentiator.** Both stylesheets introduce exactly
the same four unprefixed classes (`.skip-link`, `.stock-low`, `.stock-ok`, `.stock-out`)
and both style bare `body`, `html`, `a`, `button`. Neither is safer to port than the other;
both need the same rescoping work.

---

## 4. Confirmed defect in the selected direction — and a correction to the Step 2A record

**Direction A's search and department chips do not work from the listing route.**

`Router.go(path)` sets `window.location.hash` (`design/direction-a/proto-logic.js:71`) and
`render()` is only bound to `hashchange` (`:82`). The search submit handler (`:344-348`)
and every department-chip handler (`:93`, `:107`) call `Router.go("/")` — but on the
listing view the hash is *already* `#/`, so no `hashchange` fires and nothing re-renders.

Verified three ways:
- DOM probe: searching "hammer" from `#/` left the product count unchanged (15 → 15) with
  no empty state; hash stayed `#/`. **FAIL**
- The same search from `#/product/1` (where the hash does change) renders the empty state
  correctly. **PASS** — proving the filtering and empty-state code itself is sound.
- `desktop-01-listing.png` and `desktop-03-category-listing.png` are **byte-identical**
  (md5 `71b9472c…`): clicking "Tools" produced no visual change whatsoever.

Direction B passes all three equivalents (search from listing, search from product,
chip click), because its handlers route to a genuinely different hash (`#/search/hammer`).

**Correction to `design/DIRECTION-COMPARISON.md`:** its Direction A cell under
*Product-finding by search* states *"Verified: 'hammer' → real 0-match empty state."* That
claim is **not correct for the primary path**. A's empty state is reachable only from the
`#/states` demo button or from a non-listing route — not by typing in the search box on
the listing page, which is the path a real user takes. The equivalent claim for
Direction B is accurate. This document supersedes that cell. (Per this step's
instructions the prototypes and their docs were not modified here; the correction is
recorded, not applied.)

This defect is treated as a **mandatory pre-implementation fix (§7)**, not as grounds to
reject Direction A: it is a one-line router bug, not an information-architecture failure.
Choosing B because A had a routing typo would be deciding on the wrong axis. It does,
however, lower confidence in any Step 2A claim about A that was not independently
re-verified here — which is why §3 relies only on re-verified evidence.

---

## 5. Pressure tests

| # | Scenario | Better | Why |
|---|---|:--:|---|
| 1 | Contractor compares several similar products fast | **A** | Aligned price/stock columns + tabular monospace numerals + always-visible facet counts. B forces cross-card comparison with no shared axis. |
| 2 | Homeowner knows "leaking tap", not the category | **B** | "Fix a leak or refresh a bathroom" maps the problem to the product directly; A offers only a "Bath" department chip, which assumes the user already thinks in departments. **B's clearest and most legitimate win.** |
| 3 | 320 px phone | tie (slight B) | Both: 0 px overflow, no clipped text, verified. B's tiles are more thumb-friendly; A's row-cards are denser. Neither fails. |
| 4 | Catalogue grows 8 → 2,000 products | **A** | Table + facets is the canonical pattern at that scale and facet counts get *more* useful. B's 7-task taxonomy becomes an unfunded, hand-maintained editorial layer with no schema home. |
| 5 | Specs become much richer | **A** | A's detail page is already a spec table with a row reserved for the missing spec sheet — new fields are new rows. B's narrative columns would need restructuring. |
| 6 | Many products stay imageless | **A** | A's stripe-and-tag placeholder is small and unobtrusive inside a table row. B promotes the placeholder to a full-bleed hero colour block per product, so a mostly-imageless catalogue becomes a wall of large flat panels — the treatment scales worse the more prominent it is. |
| 7 | One category holds hundreds of items | **A** | Facets + table + (to be added) sort/pagination. B's card grid gives a very long scroll with no per-option counts. |
| 8 | User lands directly on product detail from an external search | **A** | A's detail is self-contained: spec table, breadcrumb, Add to Cart. B leads with "Why this fits your project" and a "Related project" pill — a project frame for a user who never chose a project. |
| 9 | Poor eyesight, 200 % zoom | tie (slight A) | Emulated at 720×450 (≈200 % of 1440): both 0 px overflow, no clipped text. A's tabular numerals aid price legibility; B's larger base type aids body text. **Neither** defines any `:focus-visible` rule — a shared gap. |
| 10 | Shared global CSS must not break admin/cart/account/login | tie | Verified identical exposure: same four unprefixed classes, same bare element selectors. Neither direction is safer; both need full rescoping. |

**A wins 6, B wins 1 decisively, 3 are ties.** Scenario 2 is the one case where B is
plainly better, and it is a real customer Ekoway serves — which is why §6 permits
borrowing B's guided recovery pattern rather than dismissing it.

---

## 6. Why Direction B was rejected

Not on taste, and not on colour. On four substantive grounds:

1. **It pays its cost now and earns its benefit later.** B's value is narrowing a large
   catalogue. The real catalogue is 8 products, one per category, so a task tile currently
   leads to a list of exactly one item — while the cost (zero products on the landing
   view, near-empty result grids) is paid on every page load today. B is a design for a
   catalogue that does not exist yet. B's own README concedes this: *"the 'progressive
   narrowing' payoff is muted."*
2. **Its core IA is invented and unowned.** The 7-task taxonomy exists nowhere in
   `catalogue.json`, the API, or `App.tsx`. B's README calls it *"new business logic, not
   just markup."* Committing the storefront's front door to unvalidated editorial
   categories creates a permanent content-operations burden with no identified owner and
   no schema home, and the task→category mapping is already ambiguous (a leaking tap
   plausibly needs Tools, not only Bath).
3. **It contradicts the brief's density goal.** The workflow's appendix explicitly lists
   "enormous padding and four products per screen" as generic, and asks for "more product
   per screen." B shows zero products per screen on the landing view by design.
4. **It quietly changes cart-entry behaviour.** B's primary CTA reads **"Add to project
   list"** (verified), inventing a feature that does not exist. The workflow requires
   keeping cart/checkout entry behaviour exactly as-is. A's CTA is "Add to Cart".

Secondary observations, not decisive: B uses the brand orange simultaneously as a large
category fill and as the primary CTA colour, so the CTA does not stand out against its own
hero; and the oversized "Build a deck or patio" tile is roughly 615×315 px of near-empty
fill.

---

## 7. Mandatory changes to Direction A before implementation

1. **Fix the re-render defect.** `Router.go` must re-render when the target hash equals the
   current hash. Search *and* department chips must filter from the listing route.
   Re-verify all three paths before any Step 3 sign-off. (§4)
2. **Restore focus visibility.** One `<button>` in A computes `outline-style: none`, and
   **neither** direction defines a single `:focus-visible` rule. Every interactive element
   needs a visible, deliberate focus ring in the design system.
3. **Settle the dark-palette question with the owner (§8).** Either obtain explicit
   sign-off or produce a light-surface variant that preserves density, tabular numerals,
   1 px borders and the orange accent. The density thesis does not depend on darkness.
4. **Fix the mobile fold.** At 390×844 the entire first viewport is header plus eight
   category teasers; "8 results" only just reaches the bottom edge
   (`mobile-01-listing.png`). Demote or remove that grid on mobile — A's own README already
   calls it *"almost vestigial."*
5. **Plan sort + pagination now.** Unnecessary for 8 SKUs, but the table metaphor fails
   without them the moment the catalogue grows; the system doc must specify both.
6. **Run a real contrast audit.** No formal measurement exists for either direction —
   orange on charcoal and dim grey body text on near-black are both unverified.
7. **Keep "Add to Cart" wired to the existing cart entry.** No renaming, no new concepts.
8. **Rescope all CSS.** Nothing from the prototype may be pasted into `styles.css`. The
   four unprefixed classes and bare element selectors must be rewritten under a storefront
   prefix, per `design/audit/existing-baseline.md` §9.

---

## 8. Risks in the selected direction

| Risk | Severity | Note |
|---|---|---|
| **Brand discontinuity.** A's dark steel is a real departure from Ekoway's established light cream/green identity (`design/audit/before/desktop/01-home-shell.png`). | **High — unresolved** | This is the single biggest open question. If the owner rejects dark, re-skin A light; do **not** switch to B. The winning idea is density, not darkness. |
| **No answer for the problem-first shopper.** A gives the "leaking tap" customer nothing beyond a department chip. Ekoway serves these customers. | Medium | Partially mitigated by the borrowed guided empty-state (§9), but this remains A's genuine blind spot and should be revisited after Step 5. |
| **Table → JSX restructuring is more than a restyle.** Today's `product-grid` (`App.tsx:3045-3107`) becomes a table plus a row-card collapse with its own breakpoint logic. | Medium | Budget for real markup work, not CSS-only. |
| **Facet live counts don't exist today.** Requires client-side recomputation or a new API shape. | Medium | Backend changes are out of scope for this redesign — assume client-side; verify before committing. |
| **Density can read as exhausting.** A wall of mono numerals on charcoal needs typographic rhythm to stay scannable. | Low–Medium | Address with spacing/weight hierarchy in `SYSTEM.md`, not by reducing density. |

---

## 9. Permitted borrowings from Direction B

Explicitly allowed, re-rendered in A's visual system — these are the *only* sanctioned
cross-overs:

1. **Guided empty-state recovery.** B offers concrete next actions ("Build a deck or
   patio", "See everything") instead of only filter-reset chips. Adopt the
   *suggestion-based recovery pattern*; keep A's typography and layout. This is the
   partial answer to pressure-test #2.
2. **The plain-language honesty voice.** B's explanation of the zero-review situation
   (*"that is true for every product in the current catalogue, so an empty rating is the
   normal case here, not a data gap unique to this item"*) is better written than A's
   terser note. Borrow the copy approach, not the layout.
3. **The full-sentence missing-photo caption.** B states it plainly; A uses a terse tag.
   Borrow the clarity of the wording only.

### Must NOT be mixed in

- **The task/project taxonomy as a navigation layer.** This is the thing being rejected;
  adopting it halfway produces two competing navigations and the same unowned-content
  problem at half the benefit.
- **The full-bleed category-colour hero as image stand-in** — conflicts with density and
  scales badly across an imageless catalogue (pressure-test #6).
- **Serif display type and the sand/cream surface palette** — would dissolve the
  spec-sheet thesis. (Independent of the light/dark decision in §7.3, which is about
  surface brightness, not about adopting B's type and warmth.)
- **Pill-shaped controls and 12 px radii** — A's system is 0–2 px by design.
- **"Add to project list"** or any renaming of the cart entry.

---

## 10. Implementation guardrails (carry into Step 3)

- All new CSS storefront-scoped; nothing pasted into `frontend/src/styles.css`. Any edit to
  a shared file must be listed explicitly and re-verified against admin, cart, account and
  login before Step 6 sign-off.
- No new dependencies; no CSS framework. Plain CSS only.
- Existing API calls, query params, fallback-data path and cart/checkout entry behaviour
  stay exactly as they are — redesign only what surrounds them.
- Every price, stock figure and spec on screen comes from the real API. No invented values.
- The storefront must still render with the API down (`existing-baseline.md` §6). Preserve
  the `fetchStorefront → fetchJsonResult → fallbackStorefront` no-throw chain.
- Reserve image dimensions in CSS; the missing-image placeholder must not cause layout
  shift.
- Never touch `backend/**`, `deploy/**`, `.github/workflows/**`, `docker-compose.yml`,
  `Makefile`, `ekoway-landing/**`, or admin/checkout/payment/account/login code.

---

## 11. Definition of success for Step 3

Step 3 produces a one-page `design/SYSTEM.md` that an implementer can build Pass 1 from
without reopening the direction question. It succeeds when it contains:

- **Tokens** with semantic roles: surface, ink, brand, accent, price, in-stock, low-stock,
  out-of-stock, warning — and a resolved answer to the light/dark question (§7.3).
- **Type**: max two families; tabular/monospace numerals specified for price, stock and
  spec values; a scale that keeps a 39-character product name legible beside a price.
- **Density**: the listing table/grid committed at each breakpoint, including the mobile
  row-card collapse and what is dropped from the mobile fold (§7.4).
- **Components**: product row, price block, stock badge, spec row, filter control, sort
  control, category tile, pagination.
- **States**: hover, `:focus-visible` (mandatory, currently absent), disabled, loading
  skeleton, empty (with B's borrowed recovery pattern), error, offline banner, missing
  image, out of stock.
- **Scoping rule**: the storefront prefix, and an explicit list of any shared file touched.

---

## 12. Confidence and unresolved assumptions

**Confidence: moderate-to-high (~75 %).**

Grounds for confidence: A wins 6 of 10 pressure tests including every scalability and
real-data scenario; the 78–68 margin is clear; and A matches the workflow's own stated
definition of top-tier hardware retail almost line for line. Grounds for reservation: the
margin is not overwhelming, B wins one genuine customer scenario outright, and one
decisive input — the owner's appetite for a dark palette — is unresolved.

**If the owner rejects the dark palette, the correct response is to re-skin Direction A
light, not to switch to Direction B.** The selected thesis is density and spec-forwardness;
surface brightness is a separable variable.

Unresolved assumptions, stated plainly:

1. **Customer mix.** A assumes enough pro/repeat traffic to justify spec-forward density.
   Not validated against real analytics — no traffic data was available in this session.
2. **Catalogue growth.** Both directions' scaling arguments assume the catalogue grows well
   beyond 8 items. If it stays at 8, A's advantage narrows (though it still shows products
   on the landing view and B still does not).
3. **Dark palette acceptability.** Unresolved with the owner. See above.
4. **Facet counts client-side.** Assumed computable in the frontend without an API change.
   Not verified against the backend.
5. **Contrast ratios.** Unmeasured for both directions. No automated accessibility audit
   (e.g. axe) was run on either — all accessibility findings here are manual/computed-style
   observations.
6. **Task taxonomy value.** B's 7 tasks were never user-tested; the judgment that they are
   an unowned burden is reasoned, not measured.

---

*Step 2B ends here. No production storefront code was modified. Step 3 has not begun.*
