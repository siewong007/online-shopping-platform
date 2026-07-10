# CLAUDE.md

Guidance for Claude Code in this repository. This file is an index plus the always-needed
basics — details live in the linked files. Load a linked file only when its trigger matches.

## Read this first (every session)

- **Concurrent editing**: other sessions/editors are often active on this same working
  tree. Re-`Read` a file immediately before every `Edit`; stage named files only
  (never `git add -A`); dirty files you didn't touch are normal — leave them.
- **Path quoting**: the repo path has a trailing space after "SSD"
  (`/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform`) —
  always double-quote it in shell commands.
- **Delegation is standing-authorized** (user, 2026-07-07): for volume work — repo-wide
  scans, bulk reading, batch edits, verification — spawn subagents per
  [docs/agents/model-dispatch.md](docs/agents/model-dispatch.md); this rule is the
  "user ask" the Agent tool requires. Surgical edits stay in the main conversation.

## On-demand index

| When you are…                                                    | Read                              |
|------------------------------------------------------------------|-----------------------------------|
| Delegating to subagents / picking a model                         | [docs/agents/model-dispatch.md](docs/agents/model-dispatch.md) + [task-templates.md](docs/agents/task-templates.md) |
| Deciding: escalate? actually done? ask user? stuck on retries?    | [docs/agents/judgment-rubrics.md](docs/agents/judgment-rubrics.md) |
| Starting a session / hitting harness friction                     | [docs/agents/diagnosis.md](docs/agents/diagnosis.md) |
| Editing anything under docs/agents/                               | [docs/agents/maintenance.md](docs/agents/maintenance.md) |
| You just wasted time on something avoidable                       | append to [docs/agents/lessons.md](docs/agents/lessons.md) |
| Planning roadmap work ("task N" = the literal `## N.` header)     | [docs/enhancement-roadmap.md](docs/enhancement-roadmap.md) |
| AutoCount / accounting / e-invoice integration                    | [docs/autocount/integration-plan.md](docs/autocount/integration-plan.md) |
| Branch/PR workflow questions                                      | [CONTRIBUTING.md](CONTRIBUTING.md) |

## Project

Online Shopping Platform — a Home Depot-style storefront + admin console.

- `backend/` — Rust 1.95, Axum 0.8, SQLx 0.8, PostgreSQL
- `frontend/` — React 19.2.7, TypeScript, Vite 8.x
- `docker-compose.yml` — PostgreSQL 19beta1 (exposed on `localhost:5433`)

## Graphify knowledge graph

Graphify writes generated output to `graphify-out/`. Before repo-wide analysis,
dependency tracing, architecture analysis, or impact analysis, consult
`graphify query "<question>"` or `graphify-out/GRAPH_REPORT.md`. Treat the graph as
an index that may be stale, and verify critical findings against the current source.
After significant structural changes, regenerate with `graphify extract . --code-only`,
then run `graphify cluster-only . --no-label` to refresh the report and visualization
without an LLM call. Cargo dependency introspection is unavailable because this
repository's `Cargo.toml` is under `backend/`, not at the repository root.

Indexed scopes are `backend/src/`, `backend/tests/`, `backend/migrations/`,
`frontend/src/`, selected frontend package/TypeScript/Vite configuration, root
`src/`, and top-level JavaScript/JSX in `ekoway-landing/ekoway/`. The canonical
exclusions are in `.graphifyignore`: documentation, other configuration, media,
secrets, dependencies, and generated outputs are excluded, so the initial build is
local code-only.

## Running locally

```bash
docker compose up -d db
psql postgres://project_depot:project_depot@localhost:5433/project_depot \
  -f backend/migrations/0001_initial.sql

# API
cd backend && cargo run        # http://localhost:4000

# SPA
cd frontend && bun install && bun run dev   # http://localhost:5173
```

`.claude/launch.json` defines `api` and `web` preview configs. The `web` config has
`autoPort: true`, but the backend only allows the CORS origin from the `FRONTEND_ORIGIN`
env var (default `http://localhost:5173`) — if the SPA comes up on a different port,
free port 5173 or set `FRONTEND_ORIGIN` to match, or API calls fail with CORS errors.
A `Makefile` wraps the same commands.

## Verifying changes

- Backend: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo build`
- Frontend: `bun run build` (runs `tsc -b && vite build`)
- For UI work, exercise the flow in the browser — type-checking verifies code, not features.
- Backend integration tests need the docker db up and
  `DATABASE_URL=postgres://project_depot:project_depot@localhost:5433/project_depot cargo test`.

## Conventions

### Rust

- Domain types live in `backend/src/models.rs`.
- DB access lives under `backend/src/db/` (one module per area, e.g. `db/invoices.rs`,
  `db/settings.rs`) — do not create a `backend/src/db.rs` file.
- HTTP wiring lives in `backend/src/main.rs` plus feature modules under
  `backend/src/modules/` — keep handlers thin.
- Use `anyhow::Result` internally; map to HTTP status at the boundary.
- Migrations are append-only. Never edit an applied migration — add the next
  `NNNN_<description>.sql` (check `ls backend/migrations/` for the current highest number).

### React / TypeScript

- Functional components + hooks only.
- Shared types in `frontend/src/types.ts`; API client in `frontend/src/lib/api.ts`.
- Fallback/demo data in `frontend/src/data/fallback.ts` — the storefront must still
  render if the API is down. Never bypass this path.
- Tailwind is **not** installed; styling is in `frontend/src/styles.css`.
  Do not introduce a CSS framework without asking.

### Commits

Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
Short, imperative subject; explain the *why* in the body when non-obvious.

## What not to do

- Do not add dependencies casually — prefer the standard lib / existing deps first.
- Do not add tests, comments, or docs that weren't asked for.
- Do not commit `backend/.env`, `frontend/.env`, `postgres-data/`, or build artifacts
  (`target/`, `dist/`, `node_modules/`) — all are in `.gitignore`.

## External dependencies

- PostgreSQL runs in Docker at `localhost:5433`, user/pass/db all `project_depot`.
- The health endpoint at `/api/health` reports the expected stack versions
  (`backend/src/modules/health/controller.rs`) — keep it accurate if versions change.
