# Lessons Log (append-only, newest first)

Format: see [maintenance.md](maintenance.md). One entry per incident, no essays.

## 2026-07-04 — plan cited "research.md Q3/Q4" but research.md's headers are "## 3."/"## 4."
- Wrong path taken: integration-plan.md invented citation labels (Q3/Q4) that don't
  exist in the cited file; a model grepping "Q4" would find nothing and distrust the citation.
- Rule that would have prevented it: when citing another file's section, quote the
  target's literal header text/number — check the target, don't cite from memory.
- Written back to: integration-plan.md (fixed to §3/§4), lessons.

## 2026-07-04 — haiku audit invented a Rust edition/version "conflict"
- Wrong path taken: a haiku subagent fact-checking Cargo.toml claimed `edition = "2024"`
  conflicts with `rust-version = "1.95"` (false — Rust 1.85+ supports the 2024 edition).
- Rule that would have prevented it: treat subagent claims OUTSIDE their delegated scope
  (here: language-version trivia vs. "read these fields") as unverified; only facts that
  meet the acceptance criteria count.
- Written back to: lessons only.

## 2026-07-04 — CLAUDE.md said `backend/src/db.rs`; it is now the directory `backend/src/db/`
- Wrong path taken: none this time (caught by audit), but any session following the old
  path would have created a stray db.rs file.
- Rule that would have prevented it: verify a convention path exists before creating it
  (`ls` the parent dir first); if CLAUDE.md and the tree disagree, the tree wins — then
  fix CLAUDE.md (ask first) or log here.
- Written back to: CLAUDE.md (rewritten 2026-07-04).
