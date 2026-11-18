.PHONY: db migrate backend frontend backend-check frontend-build lint format format-check typecheck test build

db:
	docker compose up -d db

migrate:
	for migration in backend/migrations/*.sql; do psql postgres://project_depot:project_depot@localhost:5433/project_depot -f "$$migration"; done

backend:
	cd backend && cargo run

frontend:
	cd frontend && bun run dev

lint:
	cd backend && cargo clippy --all-targets -- -D warnings
	cd frontend && bun run lint

format:
	cd backend && cargo fmt
	cd frontend && bun run format

format-check:
	cd backend && cargo fmt --check
	cd frontend && bun run format:check

typecheck:
	cd backend && cargo check --all-targets
	cd frontend && bun run typecheck

test:
	cd backend && DATABASE_URL=postgres://project_depot:project_depot@localhost:5433/project_depot cargo test
	cd frontend && bun run test

build:
	cd backend && cargo build
	cd frontend && bun run build

backend-check:
	cd backend && cargo fmt --check
	cd backend && cargo clippy --all-targets -- -D warnings
	cd backend && cargo build

frontend-build:
	cd frontend && bun run build
