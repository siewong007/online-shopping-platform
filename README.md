# Online Shopping Platform

A full-stack home-improvement storefront and operations console, built with a Rust Axum API, a React 19 SPA, and PostgreSQL 19beta1.

![Rust](https://img.shields.io/badge/Rust-1.95-orange)
![React](https://img.shields.io/badge/React-19.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-19beta1-336791)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

### Storefront
- Department navigation with categories, promotions, and seasonal tags
- Product catalog with search, price filters, sorting, product imagery, stock-aware add-to-cart, badges, and featured flags
- Services highlights (pickup, delivery, installation)
- Pro-customer landing surfaces, account auth, membership tiers, points, order lookup, and recent transactions
- Graceful offline fallback data when the API is unreachable

### Admin Console
- Overview dashboard with live metrics and a persistent audit feed
- Inventory view backed by product stock, low-stock thresholds, and supplier sync
- Fulfillment board grouped by live order stage for pickup and delivery
- Campaign planner with seasonal tags and regional cluster charts
- Catalog editor for categories, products, images, pricing, and stock
- Orders, payments, sales pipeline, invoice management, settings, customer profiles, RBAC, and admin-user management

### API
- Axum-based REST API backed by SQLx and PostgreSQL
- Health endpoint reporting target versions for Rust, React, and Postgres
- Storefront, checkout, customer account, admin dashboard, catalog, order, payment, sales, invoice, settings, permissions, audit, and customer portal endpoints
- Admin RBAC plus separate customer-account authentication
- CORS-enabled and structured request tracing via `tower-http`

## Tech stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 19.2, TypeScript 5, Vite 8.x              |
| Backend    | Rust 1.95, Axum 0.8, SQLx 0.8, Tokio            |
| Database   | PostgreSQL 19beta1                              |
| Infra      | Docker Compose for local Postgres               |

## Project structure

```
online-shopping-platform/
├── backend/            # Rust Axum API
│   ├── src/
│   │   ├── main.rs     # HTTP server bootstrap
│   │   ├── routes.rs   # Route wiring
│   │   ├── db/         # Database access by domain area
│   │   ├── modules/    # Controllers, services, repositories, DTOs
│   │   └── models.rs   # Domain types
│   ├── migrations/     # SQL schema & seed data
│   └── Cargo.toml
├── frontend/           # React SPA (storefront + admin)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── modules/    # Feature modules and typed API clients
│   │   ├── shared/     # Shared API helpers and components
│   │   ├── data/       # Fallback data
│   │   ├── lib/api.ts  # API client
│   │   └── types.ts
│   └── package.json
├── docker-compose.yml  # PostgreSQL 19beta1
└── README.md
```

## Quick start

### Prerequisites

- Rust `1.95+` (`rustup`)
- Bun
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

### 3. Apply migrations

```bash
for migration in backend/migrations/*.sql; do
  psql postgres://project_depot:project_depot@localhost:5433/project_depot -f "$migration"
done
```

### 4. Run the API

```bash
cd backend
cargo run
```

### 5. Run the frontend

```bash
cd frontend
bun install
bun run dev
```

## App URLs

| Service        | URL                                   |
| -------------- | ------------------------------------- |
| Frontend       | http://localhost:5173                 |
| API            | http://localhost:4000                 |
| Health check   | http://localhost:4000/api/health      |

## API surface

| Area | Representative endpoints |
| ---- | ------------------------ |
| Health/storefront | `GET /api/health`, `GET /api/storefront`, `POST /api/checkout` |
| Customer account | `POST /api/account/register`, `POST /api/account/login`, `GET /api/account/me`, `GET /api/customer-portal/me/membership` |
| Admin auth/RBAC | `POST /api/admin/login`, `GET /api/admin/me`, `GET /api/admin/users`, `GET /api/admin/permissions` |
| Operations | `GET /api/admin/dashboard`, `GET /api/admin/orders`, `GET /api/admin/payments`, `GET /api/admin/sales`, `GET /api/admin/invoices` |
| Merchandising | `GET /api/admin/catalog`, `POST /api/admin/categories`, `POST /api/admin/products`, `PUT /api/admin/products/{product_id}/stock` |
| Governance | `GET /api/admin/audit-events`, `GET /api/admin/settings` |

## Development notes

- The frontend ships with a fallback data set so the storefront still renders when the API is offline.
- PostgreSQL maps to `localhost:5433`; the container mounts `./postgres-data` for persistence.
- Backend list endpoints use keyset pagination where data volume can grow.
- Admin and customer bearer tokens are separate; customer tokens cannot satisfy admin routes.
- This is an original online shopping platform built for learning / portfolio purposes.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow, commit conventions, and local-dev expectations.

## License

Released under the [MIT License](./LICENSE).
