# Cloudflare Turnstile bot prevention — design

**Date:** 2026-09-12
**Status:** approved approach (Approach A), pending spec review

## Goal

Protect the unauthenticated POST surfaces against bots with Cloudflare
Turnstile: a widget token issued in the browser, verified server-side against
Cloudflare's `siteverify` API. Fail-open when no secret is configured so local
development needs zero Cloudflare setup.

## Credentials

| Variable | Location | Purpose |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | `backend/.env` | Server-side verification (private) |
| `VITE_TURNSTILE_SITE_KEY` | `frontend/.env` | Widget rendering (public) |
| `TURNSTILE_SITEVERIFY_URL` | `backend/.env` (optional) | Overrides the default `https://challenges.cloudflare.com/turnstile/v0/siteverify`; exists so tests can point at a stub server |

Keys are created in Cloudflare dashboard → Turnstile → Add widget, with
`localhost` + the production hostname registered. Cloudflare's published dummy
keys work for manual staging tests (`1x0000...AA` always passes).

## Backend

New `backend/src/turnstile.rs`, mirroring `rate_limit.rs`/`emailer.rs`
conventions:

- `TurnstileConfig { secret: Option<String>, client: reqwest::Client, siteverify_url: String }`
  - `disabled()` — no secret, used as the `AppState` default
  - `from_environment()` — `TURNSTILE_SECRET_KEY` absent or blank → disabled
  - `is_enabled()`
  - `verify_token(token, remote_ip)` — POSTs `{secret, response, remoteip}` to
    the siteverify URL (`reqwest` is already a dependency), returns the parsed
    `success` flag
- `verify` Axum middleware, same shape as `rate_limit::limit`
  (`State<AppState>`, `ConnectInfo<SocketAddr>`, `HeaderMap`, `Request`, `Next`):
  1. Pass through when the request method is not POST (shared routes like
     `/api/support/messages` carry GET too) or when the config is disabled.
  2. Read the `cf-turnstile-token` header; missing/empty →
     `400 {"error": ..., "code": "TURNSTILE_REQUIRED"}`.
  3. Call `verify_token` with the client IP resolved via `client_ip::client_ip`
     (respects `TRUST_PROXY`).
  4. `success: true` → `next.run(request)`; `false` →
     `403 {"error": ..., "code": "TURNSTILE_FAILED"}`.
  5. Siteverify unreachable/unparseable → `503 {"error": ..., "code": "TURNSTILE_UNAVAILABLE"}`
     (fail closed: an upstream outage must not silently drop protection).
- Hostname validation is deliberately skipped — Cloudflare already binds tokens
  to the widget's registered hostnames.
- `AppState`: `turnstile: TurnstileConfig` field, `disabled()` in both
  constructors, `with_turnstile` builder. `main.rs` resolves it via
  `from_environment()`, wires `.with_turnstile(...)`, and logs
  `enabled = turnstile.is_enabled()` like the other feature lines.
- CORS: `cf-turnstile-token` is a custom header and must be added to
  `allow_headers` in `routes.rs`, or browser preflights fail.

### Protected routes (middleware via `route_layer`)

Inside the `public` router (alongside the existing rate-limit layer):
- `POST /api/account/register`, `POST /api/account/login`
- `POST /api/checkout`, `POST /api/checkout/payment`
- `POST /api/account/products/{product_id}/reviews`
- `POST /api/support/conversations`, `POST /api/support/messages`

`POST /api/checkout/quote` is deliberately excluded: the storefront calls it
automatically on every cart/address change (debounced `useEffect`), and
Turnstile tokens are single-use — gating it would break live price quoting.
The existing per-IP rate limiter still covers it; actual order placement is
protected.

Outside the public router (its own `route_layer`):
- `POST /api/admin/login`

Admin MFA verify, logout, and session-management routes are deliberately not
covered (authenticated or post-login steps; a token there buys nothing).

## Frontend

New `frontend/src/shared/components/TurnstileWidget.tsx` + a `useTurnstile`
hook (co-located or `shared/`):

- Loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`
  once (module-level loader promise), renders into a ref'd div via
  `turnstile.render` with the `VITE_TURNSTILE_SITE_KEY`; `callback`,
  `expired-callback`, and `error-callback` all feed the token state.
- `useTurnstile()` returns `{ containerRef, token, reset, isConfigured }`.
  `reset()` calls `turnstile.reset(widgetId)` — required after every submit
  because tokens are single-use, and after a `TURNSTILE_*` API error.
- No site key → `isConfigured: false`, widget renders nothing, token stays
  `null` — pairs with the backend fail-open.

### Wiring

- `AdminLoginScreen.tsx` — widget in the login form; token passed to `login`.
- `App.tsx` — customer login (~line 4451), customer register (~4468), and the
  checkout submit (`startPaymentCheckoutRequest`, ~1982) each get a widget and
  pass their token.
- `SupportChatWidget.tsx` — widget gates `createSupportConversation` and guest
  `sendSupportMessage`.
- Reviews — the `createProductReview` API function gains the optional token
  parameter but there is no submission UI today; the endpoint is still
  protected server-side for direct API abuse.

### API layer

The affected module API functions accept an optional `turnstileToken?: string`
argument and attach `cf-turnstile-token: <token>` to the request headers when
present: `authApi.login`, `customerAuthApi.login`/`register`,
`orderApi.checkout`/`startPaymentCheckout`, `reviewsApi.createProductReview`,
`supportApi.createSupportConversation`/`sendSupportMessage`. `requestJson`
already forwards caller-supplied headers, so `shared/api/http.ts` needs no
change.

`frontend/src/vite-env.d.ts` — add `VITE_TURNSTILE_SITE_KEY` to `ImportMetaEnv`.

## Error handling

- `TURNSTILE_REQUIRED` (400): submitted before the widget produced a token —
  disable submit until `token != null` when `isConfigured`.
- `TURNSTILE_FAILED` (403): token rejected — `reset()` and let the user retry.
- `TURNSTILE_UNAVAILABLE` (503): siteverify unreachable — `reset()`, show a
  transient-error message.
- Existing `normalizeError`/`ApiError` pipeline surfaces these; the `code`
  field is already read from error payloads.

## Testing

- Backend unit tests (in `turnstile.rs`, following the `emailer.rs` test
  style): config resolution (unset/blank/set, URL override), middleware
  pass-through when disabled and on non-POST.
- Integration test: a stub siteverify served by a local Axum router on an
  ephemeral port; assert a request without a token gets 400, a token the stub
  accepts passes through, and a rejected token gets 403. Uses the existing
  `tower`/`http-body-util` dev-deps.
- Manual: Cloudflare dummy keys in `.env` files, exercise login/register/
  checkout/support in the browser.
- Gates: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`,
  `cargo build`; `bun run build`; browser exercise of each wired form.

## Out of scope

- Cloudflare Bot Management / WAF rules (requires proxying through Cloudflare)
- Turnstile on authenticated endpoints
- Rate-limit tuning (existing limiter unchanged)
