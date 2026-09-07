# Online shopping staging

Isolated staging stack on the same AIC VPS as production (`vps-av1w`).

| | Production | Staging |
|---|---|---|
| Host path | `/opt/online-shopping` | `/opt/online-shopping-staging` |
| Compose project | `online-shopping` | `online-shopping-staging` |
| Public host | `ekowayhardware.com` | `staging.ekowayhardware.com` |
| API loopback | `127.0.0.1:4000` | `127.0.0.1:4002` |
| Frontend loopback | `127.0.0.1:8082` | `127.0.0.1:8084` |
| Caddy site file | `ekowayhardware.Caddyfile` | `ekowayhardware-staging.Caddyfile` |
| Deploy workflow | `Deploy production` | `Deploy staging` |
| GitHub Environment | `production` | `staging` |

## Access

Caddy `basic_auth` user `staging` (password in `/opt/online-shopping-staging/basic-auth.password` on the VPS).
App admin seed password: `/opt/online-shopping-staging/initial-admin-password`.

## CI behavior

After CI succeeds on `main` (push), `Deploy staging` builds amd64 images and SSH-deploys to `/opt/online-shopping-staging`.
`workflow_dispatch` can redeploy any SHA for bug hunting.

## Capacity

The VPS is 2 GiB RAM with payroll, hotel prod+staging, shopping prod, and HitPay sandbox. Staging uses tighter `mem_limit` values; watch OOM if deploys fail mid-health-check.
