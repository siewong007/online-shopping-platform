# AGENTS.md

Guidance for AI coding agents (Codex, etc.) working in this repository.

**Single source of truth: [CLAUDE.md](CLAUDE.md).** Read it in full and follow it —
project layout, run/verify commands, conventions, and an on-demand index into
`docs/agents/` (operating rules) and `docs/autocount/` (integration plan) all live there.
This file intentionally duplicates nothing, so the two can't drift apart again
(they did once: this file said `backend/src/db.rs` long after it became the
directory `backend/src/db/`).

Non-negotiables, restated here only because they prevent damage before you've read anything else:

- **Concurrent editing**: other agents/editors are often active on this same working
  tree. Re-read a file immediately before every edit; stage named files only
  (never `git add -A`); dirty files you didn't touch are normal — leave them.
- **Path quoting**: the repo path has a trailing space after "SSD"
  (`/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform`) —
  always double-quote it in shell commands.
- **Migrations are append-only** (`backend/migrations/`): never edit an applied one;
  add the next `NNNN_<description>.sql`.
- **Verification gates** (a change isn't done until these pass): backend
  `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo build`;
  frontend `npm run build`. UI work must also be exercised in the browser.
