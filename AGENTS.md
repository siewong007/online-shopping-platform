# AGENTS.md

Guidance for Codex when working in this repository.

## Project

Online Shopping Platform — a Home Depot-style storefront + admin console.

- `backend/` — Rust 1.95, Axum 0.8, SQLx 0.8, PostgreSQL
- `frontend/` — React 19.2, TypeScript, Vite 7
- `docker-compose.yml` — PostgreSQL 18.3 (exposed on `localhost:5433`)

## Running locally

```bash
docker compose up -d db
psql postgres://project_depot:project_depot@localhost:5433/project_depot \
  -f backend/migrations/0001_initial.sql

# API
cd backend && cargo run        # http://localhost:4000

# SPA
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Verifying changes

- Backend: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo build`
- Frontend: `npm run build` (runs `tsc -b && vite build`)
- For UI work, exercise the flow in the browser — type-checking verifies code, not features.

## Conventions

### Rust

- Domain types live in `backend/src/models.rs`.
- DB access lives in `backend/src/db.rs`.
- HTTP wiring lives in `backend/src/main.rs` — keep handlers thin.
- Use `anyhow::Result` internally; map to HTTP status at the boundary.
- Migrations are append-only. Never edit an applied migration — add `NNNN_<description>.sql`.

### React / TypeScript

- Functional components + hooks only.
- Shared types in `frontend/src/types.ts`.
- API client in `frontend/src/lib/api.ts`.
- Fallback/demo data in `frontend/src/data/fallback.ts` — the storefront must still render if the API is down.
- Tailwind is **not** installed; styling is in `frontend/src/styles.css`. Do not introduce a CSS framework without asking.

### Commits

Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
Short, imperative subject; explain the *why* in the body when non-obvious.

## What not to do

- Do not add dependencies casually — prefer the standard lib / existing deps first.
- Do not edit existing migrations; always add a new file.
- Do not bypass the fallback data path in the frontend — it's intentional.
- Do not add tests, comments, or docs that weren't asked for.
- Do not commit `backend/.env`, `frontend/.env`, `postgres-data/`, or build artifacts (`target/`, `dist/`, `node_modules/`) — all are in `.gitignore`.

## External dependencies

- PostgreSQL runs in Docker at `localhost:5433`, user/pass/db all `project_depot`.
- The health endpoint at `/api/health` reports the expected stack versions — keep it accurate if versions change.
