# Environments Guide

This document defines the runtime environments, infrastructure topologies, environment variables, and verification workflows for the Online Shopping Platform (Ekoway Hardware).

---

## 1. Environment Matrix

| Dimension | Local Development | Staging | Production |
|---|---|---|---|
| **Host / Platform** | Local Developer Workstation | AIC VPS (`vps-av1w`) | AIC VPS (`vps-av1w`) |
| **Directory** | Workspace root | `/opt/online-shopping-staging` | `/opt/online-shopping` |
| **Compose Project** | Local Docker Compose | `online-shopping-staging` | `online-shopping` |
| **Public Hostname** | `localhost:5173` / `127.0.0.1:4000` | `staging.ekowayhardware.com` | `ekowayhardware.com` |
| **API Loopback Port** | `127.0.0.1:4000` | `127.0.0.1:4002` | `127.0.0.1:4000` |
| **Frontend Port** | `127.0.0.1:5173` (Vite dev) | `127.0.0.1:8084` (Nginx container) | `127.0.0.1:8082` (Nginx container) |
| **Database Port** | `localhost:5433` (container) | `localhost:5432` (staging postgres) | `localhost:5432` (prod postgres) |
| **Reverse Proxy** | Vite dev server proxy | Caddy (`ekowayhardware-staging.Caddyfile`) | Caddy (`ekowayhardware.Caddyfile`) |
| **Access Control** | Open local loopback | HTTP Basic Auth (`staging`) | Public access |
| **Payment Provider** | senangPay sandbox / HitPay sandbox | senangPay sandbox / HitPay sandbox | HitPay production / senangPay live |
| **Payment Activation**| `PAYMENT_ACTIVATION_MODE=public` | `PAYMENT_ACTIVATION_MODE=controlled` | `PAYMENT_ACTIVATION_MODE=public` |

---

## 2. Environment Variables Specification

All environment variables must be declared in `.env` files matching the templates in `backend/.env.example` and `frontend/.env.example`.

### 2.1 Backend Variables (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string with credentials and pool parameters |
| `APP_HOST` | No | `127.0.0.1` | Network interface to bind the Axum HTTP server |
| `APP_PORT` | No | `4000` | Port to bind the Axum HTTP server |
| `APP_ENV` | No | `development` | Runtime mode: `development` or `production`. `production` gates sensitive checkout routes |
| `FRONTEND_ORIGIN` | **Yes** | `http://localhost:5173` | Allowed CORS origin for browser requests and payment redirects |
| `ADMIN_SEED_PASSWORD` | No | Random generated | Initial password for the seeded `admin` account on first boot (minimum 12 chars) |
| `RATE_LIMIT_PER_MINUTE`| No | `120` | Maximum requests per minute per IP. Set to `0` to disable in test environments |
| `TRUST_PROXY` | No | `true` | When true, trusts `X-Forwarded-For` and `CF-Connecting-IP` proxy headers |
| `MFA_ENCRYPTION_KEY` | Recommended | — | 32-byte base64/hex key to encrypt TOTP secrets at rest |
| `PUBLIC_SITE_ORIGIN` | No | `https://ekowayhardware.com`| Origin used for sitemap generation |
| `PAYMENT_ACTIVATION_MODE` | No | `disabled` | `disabled`, `controlled` (UAT grant token required), or `public` |
| `PAYMENT_PRIMARY_PROVIDER`| No | `senangpay` | Primary gateway: `senangpay` or `hitpay` |
| `TURNSTILE_SECRET_KEY` | No | — | Cloudflare Turnstile server verification secret |
| `SMTP_HOST` | No | — | SMTP relay host for transactional email dispatch |
| `SMTP_FROM_ADDRESS` | No | — | Sender address (`orders@ekowayhardware.com`) |
| `RUST_LOG` | No | `info,online_shopping=debug` | Tracing / logging directives |

### 2.2 Frontend Variables (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:4000` | Target API backend URL when not using local Vite proxy |
| `VITE_TURNSTILE_SITE_KEY` | No | — | Cloudflare Turnstile public site key for bot verification |
| `VITE_ENABLE_PURCHASE` | No | `true` | Global toggle enabling customer cart additions |
| `VITE_ENABLE_DELIVERY` | No | `false` | Enables delivery options during checkout |
| `VITE_ENABLE_CARD_PAY` | No | `false` | Enables direct card/FPX gateway checkout |

---

## 3. Verification & Guardrail Gates

Before any deployment, changes must pass the full local CI verification pipeline:

```bash
# 1. Backend Verification
cd backend
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test

# 2. Frontend Verification
cd ../frontend
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run build

# 3. Guardrail Shell Scripts
cd ..
bash scripts/run-all-checks.sh
```

---

## 4. Staging and Production Deployment

1. **Staging**: Pushes to `main` triggering the GitHub Actions CI pipeline automatically initiate staging deployment via `.github/workflows/deploy-staging.yml` after all tests pass.
2. **Production**: Production deployments are gated via `.github/workflows/deploy.yml` with manual workflow dispatch or release promotion.
