# Hero Image Prompts — Step 4

**No photorealistic image-generation tool is available in this session.** As with
`CATEGORY-IMAGE-PROMPTS.md`, nothing here was rendered — these are written prompts for a
future session or the owner's own generation pipeline.

Two concepts only, per this step's cap. Both must **support** the dense storefront, not
dominate it — per `SYSTEM.md` §1, the storefront thesis is density and facts, so any hero
is a header band, not a full-viewport takeover.

Existing reference reviewed and rejected as direct source: `frontend/public/ekoway/store/
store-01.jpg` through `store-10.jpg` are real store-interior photos but are visually
cluttered with third-party packaging (Stanley-branded blister packs, price stickers) — too
busy for a hero band and carrying a mild brand-representation question the owner hasn't
been asked about yet (`ASSET-AUDIT.md` §3). Used here as a *credibility/realism* reference
only — "this is what the real store actually looks like, organised" — not copied.

## Concept 1 — Organised hardware trade counter

```
Photograph of an organised hardware store trade counter, viewed at eye level or a
slightly elevated 3/4 angle.
Scene: neatly arranged shelving with hand tools, hardware bins, and clearly organised
  product rows — orderly, not empty, not staged-sparse.
Lighting: bright, even, practical retail lighting (not moody, not golden-hour, not
  dramatic).
Colour: naturally warm neutrals (wood shelving, steel racking) that read as compatible
  with a warm cream (#f4f4f0) page background and a dark green (#1d5a39) / orange
  (#f96302) brand accent — do not colour-grade toward blue or teal.
Composition: strong horizontal lines from shelving, generous negative space along the
  top third and one full side (left or right) for a text/search overlay at both desktop
  and mobile crop ratios.
Explicitly exclude: people, staff, customers, smiling faces, handshakes, text, logos,
  brand wordmarks large enough to read, watermarks, lens flare, gradient colour
  grading, HDR over-processing.
Output: photographic realism, landscape orientation, single clear focal point in the
  lower-left or lower-right third (not dead centre) so both a 16:9 desktop crop and a
  narrower mobile crop keep the subject in frame.
```

**Focal point guidance:** place the strongest visual interest (the most organised shelf
run) in the lower-third, offset left or right — this is what survives when the same source
image is cropped from 1920×1080 (desktop, 16:9) down to a narrower mobile band. Desktop
crop keeps the full horizontal shelf run; mobile crop centres on the offset focal point and
loses the far edge, not the subject itself.

## Concept 2 — Practical working workshop / jobsite prep area

```
Photograph of a workshop or jobsite preparation area mid-task — tools laid out in a
  practical, purposeful arrangement (not styled, not staged for beauty), suggesting
  real work about to happen.
Scene: a workbench or truck-bed staging area with a small selection of tools and
  materials arranged as a tradesperson would actually leave them — functional, not
  decorative.
Lighting: natural daylight, even, unfiltered — no dramatic shadow play.
Colour: same warm-neutral constraint as Concept 1 — must sit comfortably against the
  cream/charcoal/green/orange system, no blue/teal grading.
Composition: same negative-space and off-centre focal-point rules as Concept 1.
Explicitly exclude: people, hands, faces, text, logos, brand marks, safety-certification
  badges or icons, staged "lifestyle" perfection, motion blur.
Output: photographic realism, landscape orientation.
```

## Output spec (both concepts)

- ≥1920×1080, 16:9 desktop source.
- WebP, target <250 KB after optimisation.
- A single focal point that survives an independent mobile crop (roughly 4:5 or narrower)
  without losing the subject — do not rely on a full-width composition that only works at
  16:9.

## Filenames (once generated)

```
design/imagery/hero/trade-counter.webp
design/imagery/hero/jobsite-prep.webp
```

`design/imagery/hero/` does not exist yet — create it when an image is actually produced.

## Selection note

This step prepares **two concepts**, not a final choice — picking between them (or
commissioning real photography of the actual Ekoway counter instead, which would need no
generation at all and carries zero factual-risk) is an owner decision outside this step's
scope, consistent with `ASSET-MATRIX.md`'s "Recommended" / owner-sign-off approval column
for HERO-01/02.
