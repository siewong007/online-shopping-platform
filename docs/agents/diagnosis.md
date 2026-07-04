# Harness Diagnosis — top 3 failure modes and their mechanical fixes

Written 2026-07-04 by a Fable 5 session for weaker models running later sessions.
These are the three most expensive failure modes in THIS harness + repo. Each fix is
mechanical: follow it literally, no judgment required.

## 1. Token leak: bulk reading in the main conversation

Symptom: the main conversation Reads whole files, dumps `git diff` / build logs /
migration files into context, and runs out of budget before finishing the task.

Fix (mechanical rules):
- Before Read: if you don't know which lines you need, Grep first, then Read only
  that range (use offset/limit). A "whole file" is anything > 150 lines.
- Main conversation budget: at most 3 whole-file Reads per task. Beyond that,
  delegate to an Explore subagent.
- Any question shaped like "where is X?", "how does Y work across the repo?",
  "list all Z" → spawn Explore (model: haiku) with report cap:
  "conclusions + file:line only, max 40 lines".
- Never read a full build/test log — pipe through `grep -E 'error|warning|FAILED' | head -30`
  or `tail -30`.

✅ Right: Grep "ensure_seed_admin" → Read backend/src/main.rs offset 40, limit 50.
❌ Wrong: Read all of backend/src/main.rs to find one handler, then Read it again after editing.

## 2. Errors from concurrent editing of this working tree

Fact (user-confirmed 2026-07-04): another session/editor is often active on this same
working directory. Files change under you; the Postgres container gets restarted;
`cargo` may block on a file lock.

Fix (mechanical rules):
- Re-Read the target file immediately before EVERY Edit, even if you read it minutes ago.
- Edit error "File has been modified since read" is NORMAL here — re-read, re-apply. Not a bug.
- `git add <named files>` only. Never `git add -A` / `git add .` — you'd commit the other
  session's work.
- Run `git status --short` at task start and before any commit; files you didn't touch
  being dirty is expected — leave them alone.
- DB connection refused → `docker compose up -d db` and retry. "Blocking waiting for file
  lock on ... target" → another cargo is running; wait, don't kill it.
- Before implementing a roadmap item, grep for whether it already exists (a concurrent
  session may have done it — this actually happened with §12 product images).

✅ Right: Read → Edit fails "modified since read" → Read again → Edit succeeds.
❌ Wrong: `git add -A && git commit` — commits a half-finished file from the other session.

## 3. Claiming "done" without running the gates

Symptom: "clippy compiles so the feature works". Type-checking verifies code, not features.

Fix (mechanical rules):
- A change is done only when the gates in CLAUDE.md "Verifying changes" pass, run BY YOU
  in THIS session: backend `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`,
  `cargo build`; frontend `npm run build`.
- New behavior must be demonstrated once: a test, a `curl`, or a preview-tool snapshot.
- Report format: paste each gate command + its final 3–5 lines of output. No evidence = not done.
- If a gate fails for a reason unrelated to your change (concurrent session), say so
  explicitly with the output — do not silently skip the gate.

✅ Right: "cargo clippy … Finished. curl /api/invoices/3 → footer shows balance_due. Done."
❌ Wrong: "Implemented invoice footer, everything should work now."

## Cheap-to-avoid extras (not top-3, still real)

- Deferred tools must be loaded via ONE batched ToolSearch call
  (`select:ToolA,ToolB,ToolC`), never one call per tool, never called unloaded.
- The repo path contains spaces AND a trailing space after "SSD"
  (`/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform`) —
  always double-quote it in shell commands.
- "task N" in docs/enhancement-roadmap.md means the literal `## N.` header, not the
  sequencing table's Order column (user-confirmed; see memory `literal-section-numbering`).
