> 2026-08-02 — Clarified approved workflow terms, artifacts, gates, failure paths, and verification boundaries so execution remains traceable and unambiguous.

# Ekoway Storefront Redesign — Outcome-Led Workflow

Goal: produce a storefront that helps Ekoway customers find, compare, and buy real
hardware products quickly, feels unmistakably like Ekoway, and preserves every protected
flow. The workflow optimises for useful design judgment, not the number of artifacts made.

Work in order. A gate is a decision point, not a request to redo every earlier check.

---

## Hard rules

1. Do not change checkout, payment, account, login, or the admin portal.
2. Do not change `backend/**`, `backend/migrations/**`, `deploy/**`,
   `.github/workflows/**`, `docker-compose.yml`, or `Makefile`.
3. Prices, stock, and specs shown in the storefront come from the real API. Never invent
   a value to make a layout look complete. Non-shipping test fixtures may simulate a
   catalogue state with no real example only for validation; they must be labelled
   “simulated”, excluded from production data, and never cited as real-data evidence.
4. Do not change the SPA landing source: `frontend/src/modules/landing/**`.
5. Preserve the existing API calls, query parameters, fallback-data path, and cart entry.
6. Work on a feature branch. Never push or merge to `main` without the owner's explicit
   approval; a successful run on `main` deploys to production.
7. Do not add a CSS framework or another dependency without approval.

Step 1's protected-surface map makes the protected flows in rules 1 and 5 concrete before
any implementation work begins.

---

## What success means

A polished visual style is not enough. The result passes only when all six are true:

1. **Intent fit:** it reflects the agreed audience, brand character, and commercial goal.
2. **Creative distinction:** the agreed premium signals, boldness level, and memorable
   signature are visible in the result; replacing the logo would not make it fit any retailer.
3. **Task success:** search, category browsing, product comparison, product detail, and
   add-to-cart remain easy to understand and operate.
4. **Content truth:** the design survives the real catalogue, including long names,
   high prices, sparse specs, missing images, low stock, and zero results.
5. **Responsive quality:** desktop and phone each look deliberately designed; neither is
   a squeezed or enlarged version of the other.
6. **Regression safety:** protected flows, fallback behavior, accessibility, and builds
   still work.

Here, **product comparison** means scanning and comparing aligned product facts within the
listing. It does not introduce a separate compare feature unless the approved brief requests
one.

At the beginning, create a small traceability table and keep it current:

| Priority | User need / constraint | Design decision | Observable acceptance evidence | Status |
|---|---|---|---|---|
| must-have | Example: feel premium but approachable | editorial product photography, precise type hierarchy, one restrained material motif | owner rates “premium” at least 4/5 at direction and final gates | pending |

Keep this to the six most important needs. If a requested outcome has no design decision
or no observable evidence, the work is not ready to implement. Mark every row
`must-have` or `preferred`; status is `pending`, `pass`, or `fail`.

Use these canonical sets throughout the workflow:

- **Catalogue hard cases:** longest name, widest price, sparse specs, missing image, low
  stock, out of stock, and zero results.
- **UI states:** loading, empty, error, offline/fallback, missing image, low stock, out of
  stock, disabled, hover, and focus.

---

## Manual-checking policy

Manual checks are frequent but deliberately small. Review the changed surface after each
coherent pass; review the whole experience only at the end or after a change matching an
Extra-check trigger. Milestones number the three Level B visual reviews; gates number
progression decisions independently. Milestones 1 and 3 coincide with Gates 1 and 3;
Milestone 2 occurs after Gate 2.

### Level A — targeted smoke check (after every implementation pass)

Timebox: 3–5 minutes. No screenshots unless a defect needs documenting.

- Open only the route changed by the pass at 1440px and 390px.
- Exercise one primary action affected by the change.
- Look for overflow, clipping, unreadable hierarchy, lost focus, and console errors.
- Compare the result with the traceability table, not merely with the CSS specification.
- Record only a failure, a decision, or a changed assumption. Do not narrate a clean run.

### Level B — milestone review (three times)

Run after the direction is chosen, after the discovery/listing pass, and after the final
implementation. Milestone 1 uses the three direction captures, Milestone 2 uses the two
discovery captures, and Milestone 3 uses the six final captures defined under Screenshot
budget. Review hierarchy, brand fit, task clarity, real-data hard cases, creative ambition,
and the traceability table. At the direction and final milestones, the owner rates the
agreed emotional and creative qualities; internal review cannot approve subjective brand fit
on the owner's behalf unless that choice was explicitly delegated.

### Level C — full regression (once)

Run at final acceptance. Repeat it earlier only if shared CSS, routing, data fetching, or a
protected flow changed. This is the only routine check of every state and protected surface.

### Extra-check triggers

Add a focused manual check immediately when a change affects:

- shared/global CSS;
- router or URL behavior;
- API/fallback behavior;
- keyboard focus or a drawer/dialog;
- a breakpoint or layout primitive used across several surfaces;
- product imagery that could imply an unsupported feature or specification.

A copy correction, isolated token change, or equivalent low-risk edit does not trigger a
whole-site review.

### Screenshot budget

The normal workflow has a routine cap of 15 screenshots:

- baseline: up to four (representative desktop and phone views);
- direction choice: three (both directions on desktop, winner on phone);
- discovery milestone: two (desktop and phone);
- final evidence: six (listing, detail, and hard-state view at desktop and phone).

A hard-state view may be a single state board containing empty, offline, missing-image,
and stock variants. Any additional defect or exception capture is logged with its reason and
is separate from the routine cap. Do not capture every surface at every pass.

When Level A, B, or C checks coincide, one browser session and evidence set may satisfy all
overlapping checks; do not run duplicate passes.

### Stop rule

Pause and correct the route when either happens:

- the design misses a must-have row in the traceability table; or
- one milestone reveals two related hierarchy, navigation, or responsive defects.

Do not polish around a wrong direction. Update the brief or system, then continue from the
nearest affected pass rather than restarting everything.

---

## Project facts

| | |
|---|---|
| Stack | React 19 + TypeScript + Vite, plain CSS; Tailwind is not installed |
| Local DB | Postgres on `localhost:5433`, user/password/database `project_depot` |
| API | `http://localhost:4000`; storefront catalogue is `GET /api/storefront` |
| SPA | Port 5173; another port can cause CORS failures unless `FRONTEND_ORIGIN` matches |
| Verification | `cd frontend && bun run test && bun run build` |
| Fallback | The storefront must render from bundled fallback data when the API is down |

---

## Step 0 — Confirm reality and lock intent

Before designing, confirm the repository, branch, current dirty files, and storefront entry
points. Preserve unrelated work in the shared tree.

If the current branch is `main`, create a new feature branch named for the redesign before
editing and record its name in `design/BRIEF.md`.

### Required records

Use these locations for workflow artifacts:

- `design/BRIEF.md`: brief, traceability table, approvals/delegations, ratings, risks,
  accepted limitations, and deferred decisions.
- `design/audit/existing-baseline.md`: baseline notes, state matrix, and protected-surface
  map.
- `design/audit/catalogue-hard-cases.md`: real catalogue hard cases.
- `design/DIRECTION-DECISION.md`: scoring, provisional winner, rejected direction, and
  decision rationale.
- `design/SYSTEM.md` and `design/SYSTEM-IMPLEMENTATION-MAP.md`: build contract and source
  mapping.
- `design/implementation/final/`: six final evidence screenshots.

“Owner” means the request author or a delegate named by them. Approval, delegation, and
ratings occur in the current task before the referenced gate and are recorded in
`design/BRIEF.md` with date, approver, response, scores, and reasons. No response leaves the
gate closed.

### Mandatory creative discovery

Ask one concise group of the following three questions before making a direction. If the
conversation already contains an answer, summarise it for confirmation instead of asking
again.

1. **Feeling and quality:** “In the first five seconds, what should customers feel? Give
   three words for the result—such as premium, authoritative, crafted, energetic, or
   welcoming—and tell me what would make it feel cheap, generic, or unprofessional.”
2. **Reference and distinction:** “Which two or three sites, brands, stores, materials, or
   visual worlds represent the quality you want? For each, what should we learn from—type,
   imagery, layout rhythm, motion, product storytelling, or something else—and what must
   we avoid copying?”
3. **Boldness and memory:** “On a 1–5 scale, how bold may the redesign be? Which existing
   Ekoway cues must remain, and what single memorable moment or signature should make the
   experience feel interesting and unmistakably yours?”

“Premium”, “professional”, “interesting”, and “innovative” are not self-defining. Convert
each requested word into visible evidence. For example:

| Quality | Evidence to agree with the owner |
|---|---|
| Premium | art-directed imagery, typographic precision, material/detail treatment, controlled spacing and restraint |
| Professional | consistent hierarchy, trustworthy product facts, complete states, precise alignment and interaction finish |
| Interesting | a recognisable composition, rhythm, interaction, or storytelling device that rewards attention |
| Innovative | a context-appropriate new way to discover or understand products—not novelty that obstructs buying |

Then write the compact design brief:

1. business outcome, priority customer, and primary task;
2. the three target feelings and their visible evidence;
3. reference principles and anti-references;
4. boldness level, retained brand cues, and one required signature idea;
5. visual/behavioral anti-goals;
6. protected flows and measurable success conditions.

Resolve only high-impact ambiguity: brand direction, primary audience, main conversion,
creative boldness, premium signals, or a requested behavior that conflicts with the current
product. If the owner delegates the choice, state the assumption in the brief. No unresolved
palette, density, navigation, boldness, or signature question may survive the direction gate.

**Gate 0:** the owner approves the brief or explicitly delegates the choice. The
traceability table has no empty “design decision” column, and every subjective quality has
agreed visual evidence rather than only an adjective. Without approval or delegation, remain
at Step 0 and resolve only the unanswered decision.

---

## Step 1 — Establish a targeted baseline

Run the existing application and inspect the live storefront with real catalogue data. Use
separate terminals for the API and SPA:

```powershell
docker compose up -d db
Get-ChildItem backend/migrations -Filter *.sql | Sort-Object Name | ForEach-Object {
  psql "postgres://project_depot:project_depot@localhost:5433/project_depot" -f $_.FullName
}
```

```powershell
Set-Location backend
cargo run
```

```powershell
Set-Location frontend
bun install
bun run dev
```

1. Capture only representative desktop and phone views of the main shopping journey.
2. Map every protected flow to its URL/route, rendering component, relevant source files,
   shared CSS selectors/files, and behavior that must remain unchanged.
3. Save `GET http://localhost:4000/api/storefront` as repository-root `catalogue.json`, then
   identify the canonical catalogue hard cases. When no real out-of-stock record exists, use
   a labelled simulated fixture under Hard rule 3 only for that validation.
4. Exercise search, category navigation, product detail, add-to-cart entry, and fallback
   once. Record behavior and existing defects in a compact state matrix.
5. Note pre-existing build, test, console, and visual problems.
6. Where shared CSS can reach a protected surface, capture or record its visual baseline
   before implementation; classify any required capture as a logged exception.

Do not screenshot every state. The state matrix is the baseline evidence; a screenshot is
needed only when text cannot preserve the relevant visual fact.

**Output:** baseline notes, hard-case matrix, at most four screenshots, and a protected-
surface list.

---

## Step 2 — Explore two directions cheaply, then choose

Produce two genuinely different visual/interaction theses using the same real content.
They may use the Trade Counter (dense and spec-led) and Guided Project (problem-led and
category-guided) ideas, but the Step 0 brief—not a preset style—decides what the directions
optimise for.

Each direction needs only enough fidelity to judge:

- header/search and product discovery;
- one listing with real hard-case content;
- price, stock, and primary action hierarchy;
- one recovery state;
- the promised premium signals and one signature idea;
- one deliberately bold move and one restraint rule;
- the intended desktop composition.

Do not build two complete responsive systems. Capture each direction once on desktop,
then test only the leading direction on phone before the decision.

Score both directions:

| Criterion | Weight |
|---|---:|
| Agreed feeling and premium evidence | 25% |
| Primary-task clarity and business outcome | 20% |
| Originality/innovation and memorable signature | 20% |
| Ekoway brand fit and professional cohesion | 15% |
| Real-data and responsive resilience | 10% |
| Accessibility and implementation feasibility | 10% |

Score each criterion from 1–5 and multiply by its weight. The highest-scoring direction that
passes the Creative quality floor becomes the provisional winner; the owner resolves a tie.
A higher total cannot excuse a failure of a must-have traceability row, protected behavior,
or truthful data. If both directions fail, revise the weakest assumption and repeat the
direction exercise once—not the baseline. If both still fail, stop and return to Gate 0 for
owner-approved clarification of the brief, references, or boldness level.

### Creative quality floor

A direction cannot pass when any of these is true:

- it could serve another retailer after changing only the logo and colours;
- “premium” is communicated only through black, gold, large empty areas, or luxury clichés;
- “professional” has been reduced to a conservative but forgettable component layout;
- “interesting” depends on decorative gimmicks or invented functionality;
- the signature idea is absent, weak, or harms the primary shopping task;
- the owner rates any must-have quality below 4/5.

The winning direction must contain at least one ownable visual or interaction signature,
while product truth, navigation, and buying actions remain immediately understandable.

**Milestone 1 / Gate 1:** show the provisional winner in context and ask the owner to rate
each target feeling plus “premium”, “professional”, and “interesting”, and “innovative” when
it is a must-have, from 1–5, with one sentence of reasoning for any score below 5. Record
the selected thesis, why it serves the brief, what was rejected, and the three main risks.
Resolve the first 390×844 viewport and all high-impact brand or creative questions before
implementation. Any must-have score below 4 returns to concept revision, not implementation
polish.

---

## Step 3 — Turn the winner into a compact build contract

Create or update `design/SYSTEM.md`. It should be a concise implementation reference, not
a record of the exploration process. Move detailed source mapping to the existing
`design/SYSTEM-IMPLEMENTATION-MAP.md` only when it prevents a real integration mistake.

Specify:

- the one-sentence design thesis and its link to the brief;
- the premium signals, signature element, bold move, and restraint rule approved at Gate 1;
- semantic colour, type, spacing, density, radius, and focus rules;
- desktop and phone information priority;
- only the components required by the agreed journey;
- the canonical UI states;
- storefront CSS scope and protected behavior;
- numeric image/page performance limits and their measurement method;
- observable acceptance criteria copied from the traceability table.

Every rule must support an agreed outcome, creative signature, accessibility, content
resilience, or consistent implementation. Remove decorative rules with no such link. The
system must preserve the expressive choices that made the concept win, rather than sanding
them down into familiar cards and controls. Only preferred, non-protected items may be
deferred or accepted as limitations; must-haves, hard rules, failed gates, and verification
failures cannot be waived. Record any allowed deferral or limitation using the owner mechanism
in Step 0.

**Gate 2:** an implementer can build without reopening the direction, and every must-have
traceability row maps to at least one system rule and one acceptance check. If the gate
fails, revise `design/SYSTEM.md` or its implementation mapping and repeat Gate 2; do not
begin Step 4.

---

## Step 4 — Prepare imagery only after direction lock

Start with the few assets that materially determine the chosen composition. Do not generate
an entire catalogue before the hero/category treatment is approved.

- Use real or approved product imagery when factual accuracy matters.
- Keep generated imagery brand-level or category-level unless the exact product appearance
  can be verified; never imply a feature, certification, or specification absent from data.
- Lock background, lighting, angle, crop, and product-to-frame ratio before producing a set.
- Use art direction, crop, surface, light, and texture to deliver the agreed premium feeling;
  generic stock photography cannot satisfy the creative brief.
- Reserve image dimensions and compress final assets.
- Keep an honest missing-image treatment; imagery must not be required for task completion.

Check the first representative asset in its real layout against product truth, approved art
direction, and Gate 1 premium evidence; record the result in `design/BRIEF.md`. If it fails,
revise and recheck that asset before producing the remaining imagery required by
`design/SYSTEM.md`.

---

## Step 5 — Build in three coherent passes

Preserve the existing data and cart behavior. Implement a complete pass, build it once, run
the Level A smoke check, fix real issues, and then continue.

### Pass 1 — Shell and foundation

Tokens, storefront scope, header, navigation, search, responsive structure, footer, and
visible focus. Smoke-check the shell and search at desktop and phone widths. Do not create
a screenshot pack.

### Pass 2 — Discovery and resilience

Categories, filters, sort, results, product rows/cards, and the canonical UI states. Use the
real hard-case matrix.

**Milestone 2:** capture the listing at desktop and phone, exercise search/category/filter
recovery and keyboard focus, and compare the result with the brief and selected direction.
This is the highest-value mid-build manual review because it covers the main shopping task.
Explicitly confirm that the approved signature and premium signals survived translation from
concept to production; if they were diluted, correct them before Pass 3.

### Pass 3 — Product decision and cart handoff

Product detail, specs, price, stock, imagery, state handling, and the unchanged add-to-cart
entry. Smoke-check one real product, one non-default canonical UI state, and cart entry at
desktop and phone.
Capture nothing unless a defect needs evidence.

After any failed check, correct the smallest responsible layer. Re-run only the failed and
adjacent checks; do not repeat the whole milestone suite.

---

## Step 6 — Final acceptance and regression

Run the complete checks once. Any new failure is a stop. Return to the smallest responsible
pass or system rule, fix it, and rerun the failed final check plus dependent checks.
Re-obtain owner ratings if the approved visual signature changed.

```bash
cd frontend && bun run test && bun run build
git diff --name-only main...HEAD
git status --short
```

Inspect the union of the two source-control outputs before scope sign-off.

### Outcome evidence

- Every traceability row has observable evidence and a passing status.
- The implementation still expresses the chosen thesis; no accidental hybrid or generic
  template styling appeared during implementation.
- The owner repeats the Gate 1 rating for each target feeling plus “premium”, “professional”,
  and “interesting”, and “innovative” when it is a must-have. Every must-have remains at
  least 4/5; a lower score is a design failure, not an accepted implementation detail.
- A five-second view reveals the intended character and at least one memorable, ownable
  signature without explanation.
- A first-time shopper can search or browse, compare facts, open a product, and reach the
  existing cart action without explanation.

### Browser and content evidence

- Real names, prices, stock, and specs match `catalogue.json` for five sampled products.
- The canonical catalogue hard cases and UI states survive. Any simulated fixture remains
  labelled and is excluded from real-data claims.
- Listing, detail, and hard-state views pass at 1440×900 and 390×844; also inspect 320px
  and 200% zoom for overflow and clipping.
- Keyboard order is logical; focus is always visible; labels and contrast meet WCAG 2.2 Level
  AA, verified through an automated audit plus the documented keyboard and zoom checks.
- Console is clean; images reserve space and remain within the agreed performance budget.

### Regression evidence

- No forbidden path or behavior changed.
- The SPA landing (`frontend/src/modules/landing/**`), admin, checkout, account, and login
  still match their Step 1 baseline when shared styling could reach them.
- Search parameters, fallback chain, and add-to-cart behavior remain intact.

**Milestone 3 / Gate 3:** create the six-image final evidence set, complete the traceability
table, and record any allowed accepted limitation. A successful build without outcome
evidence is not final acceptance.

---

## Step 7 — Handoff

Hand off only the intended files. Include:

- the approved brief and chosen thesis;
- the completed traceability table;
- the six final screenshots;
- the exact checks performed and their result;
- known limitations or deferred decisions;
- confirmation that protected flows and forbidden paths were not changed.

Use named files when staging; never stage the whole shared worktree. Do not push, merge, or
deploy without the owner's explicit approval. If no push or PR is approved, deliver the
handoff in the current task and leave files unstaged. If a PR is approved, place the same
handoff record in its description.

---

## Anti-generic quality filter

Reject a result that could belong to any retailer: generic gradient hero, uniform floating
cards, excessive empty space, vague “Shop now” copy, decorative imagery that hides product
facts, premium-by-black-and-gold clichés, or a phone layout that merely stacks desktop boxes.

For Ekoway, credibility comes from real product density, visible model/pack/unit facts,
strong price and stock hierarchy, confident but restrained brand accents, honest imagery,
and equal usefulness to a contractor buying many units and a homeowner buying one. Premium
comes from art direction and precision; professional comes from completeness and trust;
interesting comes from an ownable signature; innovation must improve the shopping experience.
