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
  frontend `bun run build`. UI work must also be exercised in the browser.
- **Cross-agent coordination is file-based**: there is no live channel between agents
  (Claude Code, Codex, or others) working this tree — coordinate through git commits,
  and write lessons from wasted time to `docs/agents/lessons.md` in the format given
  in `docs/agents/maintenance.md`. That log is shared by all agents.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user invokes `$graphify` in Codex or asks to use Graphify, use the installed
Graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
