# Ekoway Hardware — P4 public-surfaces status

**Date:** 18 August 2026  
**Repo:** `siewong007/online-shopping-platform.git` (local branch `joseph`)  
**Surfaces:** landing, storefront, admin  
**Scope of this note:** P3 optimisation plus a standalone P1–P3 status. **No deploy and no push were performed.**

This document is meant to be read on its own. It does not assume you have the P3 task list open.

---

## 1. Verdict

| Surface | JS on | JS off | i18n EN/BM/ZH | WCAG 2.2 AA | Ship note |
|---|---|---|---|---|---|
| Landing (production SPA at `/`) | Renders the cinematic landing | Renders a full static landing from `<noscript>` | UI strings complete | Partial — not AA-certified | Ready as a marketing surface |
| Storefront (`/shop`) | React catalogue, cart, checkout | Departments, contact, policies; **no live SKUs** | UI strings complete | Partial — not AA-certified | Live catalogue and checkout need JS and the API |
| Admin (`/admin`) | Lazy-loaded operations console | Not required; login screen needs JS | English only (by design) | Partial — staff tool | Not a public surface |

P3 (compress / dedupe / trim / bundle check) is **done**.  
P4 (this report) is **done**. Nothing was deployed or pushed.

---

## 2. Build health

Verified locally on 18 August 2026 with `bun run build` and `bun test` in `frontend/`.

| Check | Result |
|---|---|
| `frontend` TypeScript + Vite production build | Pass |
| `frontend` unit tests | **67 pass / 0 fail** across 14 files |
| Deploy / push | **Not performed** |
| Backend `cargo` gates | Not re-run this pass (no Rust changes) |

### Production JS/CSS bundle (`frontend/dist`)

Admin panels are already code-split. A shopper still downloads one large main chunk because landing, storefront, cart, checkout and account live in `App.tsx`.

| File | Raw | gzip | Who downloads it |
|---|---:|---:|---|
| `index-CsNXP0ri.js` | 435.70 KB | 129.61 KB | Every visitor (landing + storefront + checkout) |
| `index-o_yy52Qg.css` | 170.90 KB | 30.05 KB | Every visitor (storefront + admin CSS in one file) |
| `index.html` (includes `<noscript>` fallback) | 26.20 KB | 5.56 KB | Every visitor |
| Admin panel chunks (13 files) | 1.77–22.96 KB each | 0.78–5.72 KB | Only after `/admin` |

That 436 KB main chunk is the largest remaining front-end cost. Splitting landing away from checkout would shrink first paint for `/`, but it is an `App.tsx` extract, not a safe unused-file delete. It is flagged, not done.

---

## 3. P3 optimisation

### 3.1 Images and video (`frontend/public/ekoway/`)

Production public media went from about **9.3 MB to about 4.0 MB** (≈ **56%** smaller).

| Change | Before | After |
|---|---:|---:|
| `hero.mp4` (10s, 1280×720; audio removed — the player is muted) | 2,342 KB | 686 KB |
| Four feature photographs (`img/*.jpg`) | 1,558 KB | 611 KB |
| Ten store photographs | 3,334 KB | 1,725 KB |
| `feat-power.png` → `img/power-tools.jpg` | 667 KB PNG | 61 KB JPEG |
| `cat-power-tools.png` → `categories/power-tools-v1.jpg` | 131 KB PNG | 15 KB JPEG |
| `favicon.png` resized 225→64 | 59 KB | 7 KB |
| New `og-image.jpg` 1200×630 | missing / wrong ratio | 180 KB |
| Five unused `slots/cat-*.png` | 603 KB | removed |

Category tiles that were already 1200×900 JPEGs barely moved (already near the 180 KB target). Logo and hero poster were left alone.

### 3.2 Unused CSS / JS trimmed

**Removed from the served path**

- Production no longer ships `frontend/public/ekoway/slots/*`.
- Production landing now points at the converted JPEGs, not the slot PNGs.
- Static prototype `ekoway-landing/index.html` no longer loads `image-slot.js`, React 18 UMD, Babel standalone, `tweaks-panel.jsx`, or `landing-tweaks.jsx` (those three scripts pulled development React + Babel from unpkg).

**Not deleted, and why** — see §6.

CSS: landing styles already live in `frontend/src/modules/landing/landing.css` (40 KB) and are imported only by `LandingView`. The 171 KB `styles.css` still mixes storefront and admin. Purging admin rules from the public sheet was not done; one file serves both apps.

### 3.3 JavaScript-disabled rendering

**Before this pass:** `frontend/index.html` was `<div id="root"></div>` only. With JS off, landing and storefront were blank.

**After this pass:** a `<noscript>` document renders:

- Full landing: hero (video + poster), categories with photographs, this-month cards, why-Ekoway, ten store photos, contact, footer
- Storefront substitute: six departments, WhatsApp / phone / email, policy summaries (privacy, terms, returns, delivery)
- Skip link, real image `alt` text, no demo SKUs (the Milwaukee / BEHR fallback catalogue is **not** shown)

`<noscript>` stylesheet: `/ekoway/static-public.css`. Every image it references exists in `frontend/public` and in `frontend/dist`.

Limits of the no-JS storefront (honest):

- Live prices, stock, cart, checkout, account, support chat and `/shop` client routing still need JavaScript and the API.
- Language toggle is JS-only, so the fallback is English (the HTML `lang` default).
- Policy links in the fallback are in-page anchors, not the React `/legal/*` routes.
- Admin is not offered without JS.

The static prototype at `ekoway-landing/` also works without JS: `<image-slot>` tags are now `<img>`, reveal animations are forced visible, and stat numbers no longer start at `0`.

Verification method: production build, parse of the noscript tree, and existence checks for every referenced file. **No headed browser was available in this session**, so layout was not clicked through in Chromium.

---

## 4. i18n coverage (EN / BM / ZH)

Source of truth: `frontend/src/i18n/translations.ts`. The type is `Record<string, { en; bm; zh }>`, so a missing locale is a compile error.

| Bucket | Keys | Coverage |
|---|---:|---|
| Landing (`nav`, `hero`, `tick`, `about`, `sec`, `cat`, `month`, `stat`, `why`, `proof`, `store`, `cta`, `contact`, `foot`) | 120 | EN, BM, ZH complete |
| Storefront (`shop.*`) | 205 | EN, BM, ZH complete |
| Support chat (`support.*`) | 35 | EN, BM, ZH complete |
| **Total UI strings** | **360** | **No empty locale fields** |

### Public surfaces — remaining English-only

- **Legal pages** (`frontend/src/modules/legal/content.ts`) — long-form EN drafts on purpose. Not in the translation table.
- **Account drawer** — several `aria-label`s and headings are hardcoded English (`My account`, `Close account`, `Account summary`, …).
- **Landing chrome leftovers** — menu / lightbox `aria-label`s (`Menu`, `Close`, `Previous`, `Next`); footer “Facebook” / “WhatsApp”; address block.
- **Job lenses** (`jobLenses.ts`) — English names and notes; **not shown in production** (`approvedForProduction: false`).
- **No-JS fallback** — English only.

### Admin

English only. Staff console. Not counted as a public i18n gap.

---

## 5. WCAG 2.2 AA status

**Status: not certified. Partial implementation, several AA gaps remain.**  
No axe / Lighthouse run this pass (no browser). The notes below are from source review.

### What already aims at AA

- Landing has `:focus-visible` outlines.
- Storefront stock state is text + colour, not colour alone (`In stock` / `Low stock` / `Out of stock`).
- Product cards and quantity steppers have accessible names.
- Filter drawer is a labelled dialog.
- Support chat launcher is tested as an accessible control.
- No-JS fallback adds a skip link and keeps image `alt` text.
- Design system (`design/SYSTEM.md`) documents contrast math for the 3a tokens; that work is **not** the live production landing palette.

### Gaps that block an AA claim

| ID | Surface | Issue |
|---|---|---|
| 1.1.1 | Storefront header | Logo is `<img alt="">` (`App.tsx`) — decorative only if the adjacent text is the name; currently weak |
| 2.4.1 | Landing + storefront (JS on) | No skip link when React is running |
| 1.4.3 | All | Contrast not re-measured on the live cream-on-black landing or the orange storefront theme |
| 3.3.2 / 4.1.2 | Account / cart | Several controls labelled in English only |
| 3.1.2 | Legal | Policy pages are English-only |
| 2.2.2 | Landing | Marquee / brand-row CSS animation has a reduced-motion cut-out, but the no-JS fallback still uses the CSS animation unless the user agent disables it |
| 1.1.1 | Landing stats (JS on) | Counters start at `0` until IntersectionObserver runs |
| 4.1.2 | Landing menu / lightbox | `aria-label`s not translated |

Admin was not scored as a public AA surface.

---

## 6. Files removed, and files flagged-not-removed

### Removed (this pass)

| Path | Why |
|---|---|
| `frontend/public/ekoway/slots/cat-bathroom.png` | Unused by the SPA (bathroom uses `categories/bathroom-v1.jpg`) |
| `frontend/public/ekoway/slots/cat-building.png` | Unused |
| `frontend/public/ekoway/slots/cat-electrical.png` | Unused |
| `frontend/public/ekoway/slots/cat-kitchen.png` | Unused |
| `frontend/public/ekoway/slots/cat-paints.png` | Unused |
| `frontend/public/ekoway/slots/cat-power-tools.png` | Replaced by `categories/power-tools-v1.jpg` |
| `frontend/public/ekoway/slots/feat-power.png` | Replaced by `img/power-tools.jpg` |
| `frontend/public/ekoway/slots/` (directory) | Empty after the deletes |

### Unreferenced, kept on disk

| Path | Why not deleted |
|---|---|
| `ekoway-landing/ekoway/image-slot.js` | Design-time custom element. No longer loaded. Kept so a future mockup can restore drop-in slots without hunting git history. |
| `ekoway-landing/ekoway/tweaks-panel.jsx` | Design tweak UI. No longer loaded. Same reason. |
| `ekoway-landing/ekoway/landing-tweaks.jsx` | Companion to the tweak panel. |
| `ekoway-landing/.image-slots.state.json` | Sidecar for the old slots. Harmless; useful if someone re-enables `image-slot.js`. |
| `src/` (repo-root Bun scaffold: `APITester.tsx`, `frontend.tsx`, …) | Dead relative to the Vite app. Not on the production path. Deleting it is a separate cleanup and may surprise other sessions. |
| `design/**` prototypes | Direction-A/B, rounds 2–4, 3a reference. Authority for the blocked redesign, not served. |
| `frontend/src/data/fallback.ts` | Still required so the **JS** storefront can render when the API is down. Not published in the no-JS tree. |
| `ekoway-landing/` image copies | Duplicate tree (often 192 KB recompresses, different hashes). Prototype only; production reads `frontend/public`. |

---

## 7. Reconciled placeholders

### 7.1 `og:image`

| Location | Before | After | Status |
|---|---|---|---|
| Production SPA `frontend/index.html` | `store-01.jpg` (750×1000 portrait — wrong OG ratio) | `https://ekowayhardware.com/ekoway/og-image.jpg` (1200×630) | **Resolved** |
| JSON-LD `image` | `store-01.jpg` | `og-image.jpg` | **Resolved** |
| Prototype `ekoway-landing/index.html` | `ekoway/og-image.jpg` **file was missing** | File now exists (copied 1200×630 JPEG) | **Resolved** |

`og-image.jpg` is a centre-crop of the real Salim store photograph (`store-01`), not a branded graphic. A designed 1200×630 still is optional later; the placeholder path is no longer broken.

### 7.2 `image-slot` placeholders

| Location | Before | After | Status |
|---|---|---|---|
| Production landing | Two remaining slot PNGs (`cat-power-tools`, `feat-power`); five unused slot files still shipped | Real JPEGs; unused PNGs deleted | **Resolved on the served site** |
| Prototype landing | Eleven `<image-slot>` custom elements (empty without JS / omelette) | Ordinary `<img>` tags with real files | **Resolved** |
| `image-slot.js` | Loaded on the prototype | Script tag removed | **Unreferenced** (file flagged, see §6) |

There is no remaining `<image-slot>` in `ekoway-landing/index.html` or in the production SPA.

### 7.3 Storefront redesign (blocked on design brief)

The redesign is **not shipped as the live storefront**.

What is decided on paper:

- 31 July 2026: Direction A “Trade Counter” won on information architecture (`design/DIRECTION-DECISION.md`).
- Later: visual thesis locked to **3a Worklist** (`docs/3a-worklist-codex-handoff.md`, `docs/storefront-redesign-workflow.md`). Job Band is a discovery *lens*, not a second taxonomy. Departments stay the only category system.

What is in the code:

- `JOB_LENSES` in `frontend/src/modules/storefront/jobLenses.ts` are all `approvedForProduction: false` with **empty** `departmentSlugs`.
- 3a CSS (`worklist-*` in `styles.css`) and i18n keys (`shop.jobs.*`) exist, but the lenses must not drive live filtering until catalogue metadata verifies the mapping.
- Protected by the redesign workflow: checkout, payments, account, admin, `frontend/src/modules/landing/**`, backend, deploy.

**Blocker:** owner-approved design brief / catalogue metadata for the four jobs (Rain & Roofline, Water Supply, Wet Works, Cutting & Fixing). Until that lands, 3a stays dark. Do not invent department mappings to “finish” it.

---

## 8. P1–P3 context (so this report stands alone)

This session executed **P3** and **P4**. It did not re-litigate launch P0 (HitPay production, catalogue publish, Caddy checkout guard). Those remain as recorded in `docs/launch-readiness-2026-08-14.md`.

Relevant facts still true:

- Production checkout is fail-closed; sandbox is isolated on port 4001.
- Demo merchandise must not return. The no-JS storefront obeys that: no fallback SKUs.
- Legal copy must not invent hours, return windows, or brand guarantees. The no-JS policy blurbs follow the same rule (`bun test` legal claim test still passes).

---

## 9. Recommended next work (not done here)

1. Split `App.tsx` so `/` does not download checkout + account (main remaining bundle win).
2. Split `styles.css` so admin rules are not on the public sheet.
3. Add a JS-on skip link; give the shop logo a real `alt`.
4. Translate account-drawer chrome and legal pages, or mark legal as EN-only in the UI.
5. Run axe + keyboard + 320/390/1440 on the release candidate once a browser session is available.
6. Unblock 3a only after the owner confirms the design brief and department mappings.

---

## 10. Change list (this pass)

- Compressed production photographs and `hero.mp4`; converted the last two slot PNGs to JPEG.
- Deleted seven unused/replaced files under `frontend/public/ekoway/slots/`.
- Added `frontend/public/ekoway/og-image.jpg` and pointed SPA + JSON-LD + Twitter cards at it.
- Added a production `<noscript>` landing + storefront + policy fallback and `static-public.css`.
- Pointed `LandingView` at the new JPEGs.
- Replaced prototype `<image-slot>` elements with `<img>`, stopped loading design-tool JS, copied missing category images, and fixed the missing OG file.
- Rebuilt `frontend/dist`. Tests: 67 pass.
- **Did not** deploy, push, or change backend / payments / admin behaviour.
