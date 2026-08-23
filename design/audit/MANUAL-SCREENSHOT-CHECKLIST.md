# Manual Visual Check Checklist

Companion to `docs/storefront-redesign-workflow.md`. Use this checklist to preserve useful
visual judgment without recreating the same evidence after every edit.

The existing files under `design/audit/before/` are historical baseline evidence. Keep
them, but do not recapture all twelve images during a normal redesign run.

---

## Viewports

- Desktop: 1440×900
- Phone: 390×844
- Final edge checks only: 320px and 200% zoom

---

## After each coherent implementation pass

Run a 3–5 minute browser smoke check. Do not take screenshots by default.

- Open only the route changed by the pass at desktop and phone widths.
- Exercise one changed primary action.
- Check hierarchy, clipping, horizontal overflow, visible keyboard focus, and console errors.
- Compare against the design brief and intent table.
- Confirm that the approved signature and premium signals remain visible; implementation
  convenience must not flatten them into generic components.
- Record only a defect, decision, or changed assumption.

Repeat the whole site only if shared CSS, routing, data/fallback behavior, or a protected
flow changed.

---

## Baseline capture — maximum four images

Choose the fewest views that preserve the current hierarchy and responsive behavior:

1. desktop shop shell/listing;
2. desktop product detail;
3. phone shop shell/listing;
4. phone product detail.

Verify search, category navigation, empty results, offline fallback, missing images, and
stock states interactively. Record those in the baseline state matrix instead of taking a
separate screenshot for each state. Add a state screenshot only when the visual defect
cannot be described accurately in text.

---

## Direction milestone — three images

1. Direction A, representative desktop listing;
2. Direction B, the same desktop listing and real content;
3. selected direction, phone listing.

Do not capture every route for both directions. A direction is rejected or selected from
its thesis, hierarchy, primary journey, and hard-case resilience—not from artifact volume.

At this milestone, ask the owner to rate every agreed target feeling plus “premium”,
“professional”, and “interesting” from 1–5. Any must-have below 4 returns to concept revision.

---

## Discovery milestone — two images

1. implemented listing at desktop;
2. implemented listing at phone.

Before continuing, manually exercise:

- search with matches and zero results;
- one category and one filter reset;
- keyboard focus through search, filter, product, and add-to-cart;
- longest product name and widest real price;
- missing-image and low-stock presentation.

Capture an additional image only for a defect that blocks the next pass.

---

## Final evidence — six images

Save one desktop and one phone image for each:

1. listing/discovery;
2. product detail/cart handoff;
3. hard-state view.

The hard-state view may be a composite showing empty results, offline, missing-image,
and stock variants. Label simulated data clearly; never present it as a real catalogue fact.

Use descriptive filenames under `design/implementation/final/`, for example:

```text
desktop-listing.png
desktop-detail.png
desktop-hard-states.png
mobile-listing.png
mobile-detail.png
mobile-hard-states.png
```

---

## Final manual acceptance

- The result still expresses the approved design thesis and brand attributes.
- The owner repeats the direction-gate ratings; every must-have creative quality remains
  at least 4/5 and no score fell because production diluted the concept.
- A five-second view communicates the intended feeling and contains one memorable, ownable
  signature; replacing the logo would not make it suitable for any retailer.
- Premium is carried by art direction, typography, material/detail treatment, precision,
  and restraint—not merely black, gold, empty space, or familiar luxury clichés.
- Professional quality is visible in both the ideal view and empty, offline, loading,
  error, missing-image, and low/out-of-stock states.
- Search, browse, comparison, detail, and add-to-cart entry work without explanation.
- Real names, prices, stock, and specs match the catalogue sample.
- Empty, offline/fallback, missing-image, low/out-of-stock, loading, and error states are
  understandable and recoverable.
- There is no clipping or horizontal scroll at 1440px, 390px, 320px, or 200% zoom.
- Keyboard order is logical and focus is always visible.
- Landing, admin, checkout, account, and login remain visually unchanged when shared styles
  could reach them.
- Console is clean and images do not cause visible layout shift.

If a check fails, fix the smallest responsible layer and re-run the failed check plus its
adjacent interaction. Do not repeat the entire capture set unless the fix changes the global
layout or selected design direction.

---

## Offline check

Stop only the backend API process, never the database. Reload `/shop`, confirm the bundled
fallback storefront still renders and the intended offline treatment is visible, then restart
the API using the same local run configuration. A screenshot is required only in the final
hard-state evidence view or when documenting a defect.
