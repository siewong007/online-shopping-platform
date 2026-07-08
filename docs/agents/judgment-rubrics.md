# Judgment Rubrics — high-level judgment, externalized

Each rubric: trigger → checklist → one positive and one negative example.
These are decision procedures, not suggestions. When a rubric fires, follow it.

## R1 — When to escalate the model

Escalate (per model-dispatch.md Rule 5) when ANY of:
- (a) the same subtask failed twice, with different errors each time;
- (b) the task requires holding invariants across > 3 files simultaneously
  (auth flow, money math, cross-table consistency);
- (c) the change touches security, payments/amounts, or DB schema design;
- (d) the output is hard to verify mechanically (API shape design, naming, user-facing text tone).

Do NOT escalate for:
- long-but-mechanical work (that is batching, not difficulty — stay cheap);
- a first failure on sonnet or opus (retry once on the SAME model WITH the error
  attached — but haiku is the exception: one haiku failure goes straight to sonnet,
  per model-dispatch.md Rule 5);
- "many files" alone, when each file change is independent.

✅ Escalate: "settings validation passes tests but corrupts under concurrent writes" —
   cross-file invariant reasoning → opus with the failure trail.
❌ Don't: "rename fetchProducts across 23 frontend files" — exact spec → sonnet/haiku.

## R2 — When is it actually done

ALL must be true before reporting done:
1. Gates pass, run by you in this session (CLAUDE.md "Verifying changes":
   `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo build`,
   `bun run build` as applicable).
2. The new behavior was demonstrated once — a test run, a `curl`, or a preview-tool
   snapshot. Type-checking alone NEVER proves a feature.
3. `git status --short` shows only files you intended to touch (others' dirty files
   from the concurrent session excluded and untouched).
4. Your report includes the evidence (command + last 3–5 output lines, or snapshot).

✅ Done: invoice footer — clippy+build pass, preview snapshot shows balance-due line,
   only 2 intended files modified.
❌ Not done: "clippy passes, so §9 invoice polish is complete" — no behavior evidence.

## R3 — When to stop and ask the user

Ask BEFORE:
- deleting or overwriting anything you did not create in this session (and if what you
  find at the target contradicts its description, surface that instead of proceeding);
- adding any dependency (crate, npm package, CSS framework — CLAUDE.md forbids casual adds);
- editing an applied migration (never do it — add a new `NNNN_*.sql`; ask only if that
  genuinely seems impossible, which usually means the plan is wrong);
- anything irreversible or outward-facing: push to a shared branch, publishing,
  sending email/messages, spending money, calling paid external APIs;
- changing API shapes consumed outside this repo.

Do NOT ask about:
- choices an existing repo convention already answers (follow CLAUDE.md, note it in the report);
- reversible internal refactors within the task's stated scope;
- where code goes (CLAUDE.md conventions answer it).

✅ Ask: "invoice PDF export needs a new crate (printpdf) — OK to add?"
❌ Don't ask: "should the shared type go in frontend/src/types.ts?" — convention says yes.

## R4 — Wrong-direction signals (change route, don't retry harder)

If ANY of these appears, STOP retrying:
- two retries produced different errors at the same spot;
- the "fix" requires editing an existing migration, bypassing the frontend fallback-data
  path, or disabling a lint/gate — i.e. fighting an intentional constraint;
- the diff has grown past ~3× your initial estimate for a small ask;
- you are hand-rolling something axum/sqlx/react already provides;
- the plan contains "temporarily disable X" where X is a safety mechanism.

Then write exactly 5 lines: goal / what was attempted / what was observed / why this
route is suspect / proposed new route. Choose: new route, escalate per R1, or ask per R3.

✅ Right: 2nd migration-ordering error → stop, propose new migration file instead of
   editing 0015, continue.
❌ Wrong: 4th attempt at the same Edit with slightly different whitespace.

## R5 — Quality floor (verify before merge-able)

- Gates pass; zero NEW `#[allow(...)]`, `@ts-ignore`, `unwrap()` on fallible paths at
  the HTTP boundary (map to status codes instead).
- Frontend still renders with the API down if you touched data fetching — actually stop
  the backend once and load the page (the fallback path is an intentional feature).
- Migrations: append-only. Get the next number by running `ls backend/migrations/` NOW —
  never from a number written in any doc (a doc said "next is 0017" while 0017 already
  existed on disk; the tree is the only source of truth).
- No secrets/env files staged (`backend/.env`, `frontend/.env` are gitignored — keep it so).

✅ Right: after touching api.ts, kill backend, reload page, storefront shows fallback data.
❌ Wrong: adding `@ts-ignore` to make `bun run build` pass.
