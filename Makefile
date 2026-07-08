.PHONY: db migrate backend frontend backend-check frontend-build

db:
	docker compose up -d db

migrate:
	psql postgres://project_depot:project_depot@localhost:5433/project_depot -f backend/migrations/0001_initial.sql

backend:
	cd backend && cargo run

frontend:
	cd frontend && bun run dev

backend-check:
	cd backend && cargo fmt --check
	cd backend && cargo clippy --all-targets -- -D warnings
	cd backend && cargo build

frontend-build:
	cd frontend && bun run build
