# Delegation Prompt Templates

Copy the matching template into the Agent call's `prompt`, fill every `{…}`, delete
lines that don't apply. NEVER drop the Acceptance criteria or Report format sections —
a delegation without them is invalid (model-dispatch.md Rule 2).

Common block — include in every prompt:
```
Repo root: "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform"
(the path has a trailing space after "SSD" — always double-quote it in shell).
This working tree is edited concurrently by other sessions: re-Read before every Edit;
"File has been modified since read" is normal — re-read and re-apply; stage named files only.
If you fail the same step twice, STOP and report the full failure trail (attempts, exact
errors). Do not improvise around the spec.
```

## 1. Search / locate — Explore, model: haiku

```
Search breadth: {medium | very thorough}.
Goal: {what to find and why the parent needs it}.
Questions, answer each exactly:
1. {…}
2. {…}
Acceptance criteria: every claim carries a file:line reference; unanswerable items
say "NOT FOUND — looked in {places}" instead of guessing.
Report format: numbered answers matching the questions, max {40} lines, no file dumps.
```

## 2. Implementation — general-purpose, model: sonnet

```
Goal + why: {feature/fix, one paragraph, user-visible effect}.
Spec: {exact behavior; files likely involved; repo conventions that apply —
e.g. types in frontend/src/types.ts, API client in frontend/src/lib/api.ts,
DB access under backend/src/db/, keep handlers thin, anyhow internally → HTTP status at boundary}.
Out of scope: {explicitly}.
Acceptance criteria: gates pass (backend: cargo fmt --check && cargo clippy --all-targets
-- -D warnings && cargo build; frontend: npm run build); behavior demonstrated once
({test | curl | preview snapshot}); no new dependencies; migrations append-only (next: {NNNN}).
Report format: files changed as path:line-range list; gate commands + last 3 lines of
each output; the behavior evidence; open issues. Max 40 lines.
```

## 3. Refactor — general-purpose, model: sonnet (opus if invariants span >3 files)

```
Goal + why: {what structure changes and what motivates it}.
Invariant: behavior must not change. {List observable behaviors that must survive.}
Mechanical spec: {old shape → new shape, e.g. "move X from a.rs to b/mod.rs, re-export"}.
Acceptance criteria: gates pass; grep proves no stragglers ({old symbol} has 0 remaining
references); diff contains no behavior changes (no new logic branches).
Report format: file:line list of moves; gate evidence; the grep-zero proof. Max 30 lines.
```

## 4. Research — general-purpose, model: sonnet

```
Question: {precise question and the decision it feeds}.
Sources: prefer {official docs/vendor}; every claim needs a source URL; anything
unconfirmable is marked "UNVERIFIED" — never guessed.
Deliverable: write findings to {absolute path}.md, max {150} lines.
Report format: reply with ONLY the file path + {N} bullet summary + list of UNVERIFIED items.
```

## 5. Review — general-purpose, model: opus for auth/money/schema diffs, else sonnet

```
Review target: {branch/diff/files}. You did NOT write this code; be adversarial.
Look for, in priority order: {correctness bugs and edge cases | security (authz on
/api/admin/*, injection, secrets) | violations of CLAUDE.md conventions | perf}.
Acceptance criteria: each finding has file:line + a concrete failure scenario
(input → wrong outcome); no style nitpicks unless they mask a bug; if nothing found,
say "no findings" — do not manufacture issues.
Report format: findings ranked by severity, max {30} lines. Verdict line at top:
{ship | fix-first | needs-rework}.
```
