# Direction B — "Guided Project"

Static design prototype for Step 2A of the storefront redesign. Not production code —
plain HTML/CSS/vanilla JS, zero build step, zero dependencies. Open `index.html` directly
(double-click, or serve the `design/` folder with any static file server).

## Thesis

A category/job-led storefront for a customer who **knows their problem, not the exact
product**: "my tap is leaking," "I want to paint a room this weekend," "I need to build a
deck." The home page leads with project tiles, not a product grid or a search box alone.
Narrowing happens progressively — task → relevant department(s) → the real product(s) in
stock — while every real fact (price, stock, spec) stays visible on the product card
itself, never hidden behind a "click through to see the price" pattern.

## Intended customer

First-time or infrequent shoppers, homeowners mid-project who aren't fluent in SKU names
or brand codes, and anyone who'd rather be told "here's what fixes a leaking tap" than
scan a department list. Direction A (Trade Counter) serves the opposite, already-informed
customer instead.

## Visual system

- **Palette:** warm sand/cream background (`--b-bg #f7f3ea`) with a deep forest green as
  the primary structural color (`--b-green #1d5a39`, `--b-green-deep #123c26`) and the
  same real Ekoway orange (`#f96302`) reserved for CTAs and search. Both colors are
  sampled from the actual Ekoway logo (`frontend/public/ekoway/ekoway-logo.jpeg`): the
  logo's dark green "EKO" wordmark and its orange roofline/circle border. Direction A
  leans on the orange as the single accent against dark steel; Direction B instead
  foregrounds the green as the dominant brand color with orange kept secondary — two
  different, deliberate readings of the same real brand marks, not two unrelated palettes.
- **Type:** a serif display face (Georgia/Times New Roman/Noto Serif stack) for headings
  and task-tile titles, paired with a system sans stack for body/UI text — a warmer,
  more "guide book" feel than Direction A's all-system-sans, spec-sheet tone.
- **Corner radius:** a consistent 12px (`--b-radius`) on cards, tiles, hero blocks, and
  panels; fully pill-shaped (999px) on buttons and chips. Moderate, not the "excessive
  whitespace / pastel SaaS" softness the brief asks to avoid — corners are rounded but
  colors stay fully saturated and borders stay real (1–2px), not shadow-only.
- **Borders/elevation:** thin real borders (`--b-line`, `--b-line-strong`) on cards and
  panels; no `box-shadow` used anywhere for elevation. Category color blocks are flat,
  saturated fills, never pastel tints.

## Density strategy

Deliberately lower information density *per screen* than Direction A but not lower
information *content* — task tiles are large and few (7 tiles, one deliberately
larger/"featured"), and once narrowed, the product grid still shows price and stock
directly on every card face, not hidden behind a hover or a click. The trade-off is
explicit: fewer things visible per screen, but each thing shown carries a stronger
narrative frame (why this task, why this category) rather than raw density.

## Mobile strategy

The category/task chip row scrolls horizontally under the header (same mechanism as
Direction A's dept bar), but the primary mobile navigation is a **full-screen task
launcher** (`.b-mobile-menu`, triggered by "☰ Projects") that takes over the entire
viewport with large tappable task tiles — a distinctly different pattern from Direction
A's left-sliding narrow drawer. This mirrors the home page's task-first framing instead of
just re-listing departments.

## Discovery method

Primary path: **pick a project tile on the home page** (`Build a deck or patio`, `Fix a
leak or refresh a bathroom`, etc.), each of which maps to one or more real
`category_slug` values from `catalogue.json` and explains in one sentence why. Search is
still available and fully functional (header search box, real client-side filtering
against name/description/tone), framed as "or search directly" rather than the sole
entry point. Category chips remain for direct department access without going through a
task tile.

## Product-detail strategy

A full-bleed color hero (category-tinted, matching the card treatment) stands in for a
product photo, captioned explicitly ("No product photo on file yet — this color panel
stands in for it") rather than pretending a photo exists. Below it, a two-column layout:
a narrative left column ("Why this fits your project," "What we know about this item,"
related-task links) and a sticky right-hand fact panel with price, availability, low-
stock threshold, category, and an honest "Detailed specs: Not in catalogue yet" line —
so the guidance framing never obscures the same hard facts Direction A shows in its spec
table, just presents them in a different order and voice.

## Hard-state treatment

- **Empty results** — reachable for real via typing "hammer" into search. Instead of a
  bare "0 results" line, the empty state repeats the same honest framing ("that's a real,
  expected outcome for a small catalogue, not a broken page") and offers four project
  tiles plus "see everything" as recovery — narrative recovery instead of Direction A's
  terser filter-chip recovery.
- **Missing image** — the default for every product (all 8 real products have
  `image_url: ""`); the bold category-color block with a two-letter "brand initial" and a
  "no photo yet" tag is the default rendering everywhere, not an exception path.
- **Low stock** — real data (Glacier Bay Shaila Vanity Combo, qty 3 / threshold 5) shown
  automatically on its card and detail fact panel.
- **Out of stock** — no real product qualifies today. Shown only on the dedicated
  `#/states` ("Hard States Demo") page, visibly captioned **"SIMULATED — no real
  out-of-stock product exists yet,"** reusing SKU-0008's real name/price with only the
  stock label overridden.
- **Offline/fallback** — also only on `#/states`, captioned **"SIMULATED — mockup of the
  fallback-data path, not a captured live API outage,"** proposing a warm, reassuring
  banner ("We're showing your last-known catalogue while we reconnect") consistent with
  this direction's guidance-forward voice, where the live storefront today shows no
  indicator at all (baseline audit §6, defect #3).
- The "Top Rated" badge / zero-review contradiction (BEHR paint, id 3) is called out
  explicitly on its detail page rather than hidden.
- The catalogue's "Online Shopping" mis-branding (category `all` teaser) is flagged
  inline in the "Everything in stock" view rather than silently corrected, matching the
  audit's finding.

## The one memorable differentiator

**The home page asks a question instead of showing a shelf.** "Tell us what you're
working on" plus seven asymmetric, saturated project tiles is the single biggest
structural break from both the current live site and from Direction A — there is no
product grid, no hero banner, no department list as the first thing a visitor sees.

## Implementation feasibility notes (porting into the existing plain-CSS app)

- **New storefront-scoped classes needed:** everything here uses a `b-` prefix for the
  same reason Direction A uses `a-` — to avoid any collision with
  `frontend/src/styles.css`. A real port needs its own scoped prefix (e.g. `.shop-task-*`,
  `.shop-guided-*`) following the existing `.shop-`/`.product-`/`.dept-` conventions.
- **The task-tile taxonomy is new business logic, not just markup** — `TASKS` in
  `interactions.js` is a hand-authored mapping from 7 invented "jobs" to the 8 real
  `category_slug` values. This mapping does not exist anywhere in the current schema or
  API (`catalogue.json` has no task/job concept at all) — porting this idea for real
  would need either a new backend field, a new static config file, or hardcoded frontend
  logic mirroring what's here; it is not close to any existing `App.tsx` structure.
- **Higher-risk to port:** the sticky fact panel on product detail
  (`.b-fact-panel { position: sticky; }`) and the two-column detail grid are a real
  layout departure from the current single-column `ProductDetailView`
  (`App.tsx:3155-3333`) and would need new JSX structure, not just CSS.
- **Lower-risk to port immediately:** the honest "no photo yet" color-block treatment for
  missing images, and the guided empty-state recovery pattern, are both self-contained
  and could be adapted into the current `product-grid`/`ProductDetailView` without
  adopting the rest of this direction's IA.
- **Risk:** as with Direction A, none of this prototype's CSS should be merged wholesale
  into the shared `styles.css` — bare/shared class names there (`.solid-button`,
  `.eyebrow`, `.status-pill`, `.app-shell`) are used by admin and checkout too; any real
  port needs newly scoped rules referencing this prototype only as a spec.

## Known weaknesses / trade-offs (honest)

- With exactly one real product per category today, the "progressive narrowing" payoff is
  muted — a task tile currently leads to a list of exactly one item, which is the correct,
  honest behavior for the real catalogue but doesn't yet demonstrate this direction's real
  strength (narrowing a *large* catalogue). The design will look more justified once the
  catalogue has more than 8 products.
- The task taxonomy (7 hand-picked "jobs") is editorial and invented for this prototype —
  it is a plausible mapping onto the real categories, not something backed by real
  customer research, and would need validation before being treated as final IA.
- The serif display face plus warm sand palette risks reading as "lifestyle blog" rather
  than "hardware store" if the visual weight of category colors and real fact panels isn't
  kept strong — this prototype leans on saturated, non-pastel category colors and visible
  price/stock facts specifically to avoid that, but it is a real tension, not a solved
  problem.
- The home page's task grid, while distinctive, pushes the full category list and direct
  "browse everything" option below the fold on first load — someone who wants a plain
  department list has to scroll past the guided framing first (a toolbar link exists, but
  it is secondary by design).
- A sticky fact panel on desktop product pages is a nice-to-have that adds real
  implementation complexity (see above) relative to the value it provides over a
  non-sticky panel.
