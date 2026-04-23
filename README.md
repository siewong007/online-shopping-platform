# Online Shopping Platform

A full-stack home-improvement storefront and operations console inspired by [The Home Depot](https://www.homedepot.com/), built with a Rust Axum API, a React 19 SPA, and PostgreSQL 18.

![Rust](https://img.shields.io/badge/Rust-1.95-orange)
![React](https://img.shields.io/badge/React-19.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.3-336791)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

### Storefront
- Department navigation with categories, promotions, and seasonal tags
- Product catalog with pricing, badges, and featured flags
- Services highlights (pickup, delivery, installation)
- Pro-customer landing surfaces and stats
- Graceful offline fallback data when the API is unreachable

### Admin Console
- Overview dashboard with key merchandising metrics
- Inventory view grouped by department and region status
- Fulfillment board grouped by stage (pickup / delivery / install)
- Campaign planner with seasonal tags and regional cluster charts
- Catalog editor — create categories and products from the UI

### API
- Axum-based REST API backed by SQLx and PostgreSQL
- Health endpoint reporting target versions for Rust, React, and Postgres
- Storefront and admin dashboard payload endpoints
- CORS-enabled and structured request tracing via `tower-http`

## Tech stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 19.2, TypeScript 5, Vite 7                |
| Backend    | Rust 1.95, Axum 0.8, SQLx 0.8, Tokio            |
| Database   | PostgreSQL 18.3                                 |
| Infra      | Docker Compose for local Postgres               |

## Project structure

```
online-shopping-platform/
├── backend/            # Rust Axum API
│   ├── src/
│   │   ├── main.rs     # HTTP server + routes
│   │   ├── db.rs       # Database access
│   │   └── models.rs   # Domain types
│   ├── migrations/     # SQL schema & seed data
│   └── Cargo.toml
├── frontend/           # React SPA (storefront + admin)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── data/       # Fallback data
│   │   ├── lib/api.ts  # API client
│   │   └── types.ts
│   └── package.json
├── docker-compose.yml  # PostgreSQL 18.3
└── README.md
```

## Quick start

### Prerequisites

- Rust `1.95+` (`rustup`)
- Node.js `20+` and `npm`
- Docker & Docker Compose

### 1. Start PostgreSQL

```bash
docker compose up -d db
```

Postgres is exposed on `localhost:5433` to avoid conflicts with a local `5432` instance.

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Apply the initial migration

```bash
psql postgres://project_depot:project_depot@localhost:5433/project_depot \
  -f backend/migrations/0001_initial.sql
```

### 4. Run the API

```bash
cd backend
cargo run
```

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

## App URLs

| Service        | URL                                   |
| -------------- | ------------------------------------- |
| Frontend       | http://localhost:5173                 |
| API            | http://localhost:4000                 |
| Health check   | http://localhost:4000/api/health      |

## API endpoints

| Method | Path                         | Description                      |
| ------ | ---------------------------- | -------------------------------- |
| GET    | `/api/health`                | Service health and target stack  |
| GET    | `/api/storefront`            | Storefront payload (catalog + promos) |
| GET    | `/api/admin/dashboard`       | Admin dashboard payload          |
| POST   | `/api/admin/categories`      | Create a category                |
| POST   | `/api/admin/products`        | Create a product                 |

## Development notes

- The frontend ships with a fallback data set so the storefront still renders when the API is offline.
- PostgreSQL maps to `localhost:5433`; the container mounts `./postgres-data` for persistence.
- This is a direct Home Depot-style clone for learning / portfolio purposes — not affiliated with The Home Depot.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow, commit conventions, and local-dev expectations.

## License

Released under the [MIT License](./LICENSE).
