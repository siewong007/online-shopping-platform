# Cloudflare Turnstile Bot Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect unauthenticated POST surfaces (login, register, checkout, reviews, support) with Cloudflare Turnstile — a browser widget token verified server-side via `siteverify`.

**Architecture:** Frontend forms render a Turnstile widget and send the resulting token in a `cf-turnstile-token` request header. A new `backend/src/turnstile.rs` middleware (same shape as `rate_limit.rs`) verifies the token against Cloudflare before the handler runs, applied per-route via `MethodRouter::route_layer`. Fail-open when `TURNSTILE_SECRET_KEY` is unset.

**Tech Stack:** Rust 1.95 / Axum 0.8 / reqwest 0.12 (already a dep), React 19 / TypeScript / Vite env vars.

## Global Constraints

- Migrations are append-only — **no migration needed for this feature** (no schema change).
- Never commit `backend/.env` or `frontend/.env` — real keys live there only; `.env.example` gets names, not values.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`). Stage named files only, never `git add -A`.
- Other agents may be editing this tree — re-read a file immediately before editing it.
- Repo path has a trailing space after "SSD" — always double-quote paths in shell commands.
- Verification gates before any task is "done": backend `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo build`; frontend `bun run build`.
- Backend integration tests (`#[sqlx::test]`) need docker db up and `DATABASE_URL=postgres://project_depot:project_depot@localhost:5433/project_depot`.
- No new dependencies. No comments unless warranted (match codebase's explanatory-comment style).
- `/api/checkout/quote` is deliberately NOT protected — the frontend calls it automatically on every cart change (debounced `useEffect`, App.tsx ~5215) and Turnstile tokens are single-use. The existing rate limiter covers it.

## File Map

| File | Responsibility |
|---|---|
| `backend/src/turnstile.rs` (new) | `TurnstileConfig` + `verify` middleware |
| `backend/src/app_state.rs` | `turnstile` field + `with_turnstile` builder |
| `backend/src/lib.rs` | `pub mod turnstile;` |
| `backend/src/main.rs` | Resolve config from env, wire into state, log |
| `backend/src/routes.rs` | `route_layer` on protected routes + CORS header |
| `backend/tests/common/mod.rs` | `app_with_turnstile` helper |
| `backend/tests/turnstile_api.rs` (new) | Stub-siteverify integration tests |
| `frontend/src/shared/api/http.ts` | `turnstileHeaders` + `postJson` optional headers |
| `frontend/src/shared/components/TurnstileSlot.tsx` (new) | `useTurnstile` hook + slot component |
| `frontend/src/modules/*/api/*.ts` | Optional `turnstileToken` param on protected calls |
| `frontend/src/shared/notifications/errors.ts` | User copy for `TURNSTILE_*` codes |
| `frontend/src/vite-env.d.ts` | `VITE_TURNSTILE_SITE_KEY` type |
| `frontend/src/modules/auth/components/AdminLoginScreen.tsx` | Widget in admin login form |
| `frontend/src/App.tsx` | Widget in AccountDrawer (login/register) + CartDrawer (checkout); token plumbing |
| `frontend/src/modules/support/components/SupportChatWidget.tsx` | Widget in support panel |

---

### Task 1: Backend `turnstile.rs` module + AppState wiring

**Files:**
- Create: `backend/src/turnstile.rs`
- Modify: `backend/src/app_state.rs`, `backend/src/lib.rs`

**Interfaces:**
- Produces: `TurnstileConfig` (`disabled()`, `from_environment()`, `resolve(secret, url)`, `is_enabled()`), `turnstile::verify` middleware, `AppState::with_turnstile`, `AppState.turnstile` field. Consumed by Tasks 2–3.

- [ ] **Step 1: Write `backend/src/turnstile.rs`**

```rust
use std::{net::SocketAddr, time::Duration};

use axum::{
    Json,
    extract::{ConnectInfo, Request, State},
    http::{HeaderMap, Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde::Deserialize;

use crate::{app_state::AppState, client_ip};

const DEFAULT_SITEVERIFY_URL: &str =
    "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TOKEN_HEADER: &str = "cf-turnstile-token";
const SITEVERIFY_TIMEOUT: Duration = Duration::from_secs(5);

/// Cloudflare Turnstile gate for the unauthenticated POST surfaces. Disabled unless a secret
/// is configured, mirroring the emailer/MFA "no configuration, no behavior" default — a
/// deployment without keys accepts every request exactly as before.
#[derive(Clone)]
pub struct TurnstileConfig {
    secret: Option<String>,
    siteverify_url: String,
    client: reqwest::Client,
}

#[derive(Deserialize)]
struct SiteverifyResponse {
    success: bool,
}

impl TurnstileConfig {
    pub fn disabled() -> Self {
        Self::resolve(None, None)
    }

    pub fn from_environment() -> Self {
        Self::resolve(
            std::env::var("TURNSTILE_SECRET_KEY").ok().as_deref(),
            std::env::var("TURNSTILE_SITEVERIFY_URL").ok().as_deref(),
        )
    }

    /// Pure resolution kept away from `std::env` so tests never mutate the process
    /// environment. A blank secret disables verification; a blank URL falls back to
    /// Cloudflare's endpoint (the override exists for stub verifiers in tests).
    pub fn resolve(secret: Option<&str>, siteverify_url: Option<&str>) -> Self {
        let secret = secret
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string);
        let siteverify_url = siteverify_url
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(DEFAULT_SITEVERIFY_URL)
            .to_string();
        let client = reqwest::Client::builder()
            .timeout(SITEVERIFY_TIMEOUT)
            .build()
            .unwrap_or_default();
        Self {
            secret,
            siteverify_url,
            client,
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.secret.is_some()
    }

    async fn verify_token(&self, token: &str, remote_ip: &str) -> anyhow::Result<bool> {
        let secret = self.secret.as_deref().expect("enabled config has a secret");
        let response = self
            .client
            .post(&self.siteverify_url)
            .form(&[
                ("secret", secret),
                ("response", token),
                ("remoteip", remote_ip),
            ])
            .send()
            .await?
            .json::<SiteverifyResponse>()
            .await?;
        Ok(response.success)
    }
}

/// Rejects protected POSTs that arrive without a valid Turnstile token. Mounted per-route
/// (alongside `rate_limit::limit`) on login, register, checkout, review and support surfaces;
/// non-POST requests on shared routes pass through untouched.
pub async fn verify(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Response {
    if request.method() != Method::POST || !state.turnstile.is_enabled() {
        return next.run(request).await;
    }

    let token = headers
        .get(TOKEN_HEADER)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let Some(token) = token else {
        return reject(
            StatusCode::BAD_REQUEST,
            "TURNSTILE_REQUIRED",
            "Bot verification is required.",
        );
    };

    let remote_ip = client_ip::client_ip(&headers, peer, state.trust_proxy);
    match state.turnstile.verify_token(token, &remote_ip).await {
        Ok(true) => next.run(request).await,
        Ok(false) => reject(
            StatusCode::FORBIDDEN,
            "TURNSTILE_FAILED",
            "Bot verification failed. Try again.",
        ),
        // Fail closed on an upstream outage: a verification service we cannot reach must not
        // silently open the protected surface.
        Err(error) => {
            tracing::warn!(%error, "turnstile siteverify request failed");
            reject(
                StatusCode::SERVICE_UNAVAILABLE,
                "TURNSTILE_UNAVAILABLE",
                "Verification is temporarily unavailable. Try again shortly.",
            )
        }
    }
}

fn reject(status: StatusCode, code: &str, message: &str) -> Response {
    (
        status,
        Json(serde_json::json!({ "error": message, "code": code })),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_disables_on_missing_or_blank_secret() {
        assert!(!TurnstileConfig::resolve(None, None).is_enabled());
        assert!(!TurnstileConfig::resolve(Some("   "), None).is_enabled());
    }

    #[test]
    fn resolve_enables_with_secret_and_defaults_url() {
        let config = TurnstileConfig::resolve(Some("  secret  "), None);
        assert!(config.is_enabled());
        assert_eq!(config.siteverify_url, DEFAULT_SITEVERIFY_URL);
    }

    #[test]
    fn resolve_honours_url_override() {
        let config = TurnstileConfig::resolve(Some("s"), Some("http://127.0.0.1:9/v"));
        assert_eq!(config.siteverify_url, "http://127.0.0.1:9/v");
    }
}
```

- [ ] **Step 2: Register the module in `backend/src/lib.rs`**

Add `pub mod turnstile;` after `pub mod security;` (keep alphabetical-ish order — actually insert between `security` and... the file lists `routes`, `security`; add `turnstile` at the end after `security`).

- [ ] **Step 3: Wire `turnstile` into `AppState` (`backend/src/app_state.rs`)**

```rust
use crate::{
    emailer::Emailer,
    modules::{mfa::service::MfaConfig, payments::activation::PaymentActivationMode},
    rate_limit::RateLimiter,
    turnstile::TurnstileConfig,
};

pub struct AppState {
    // ...existing fields...
    pub turnstile: TurnstileConfig,
}
```

- Add `turnstile: TurnstileConfig::disabled()` inside BOTH `new()` and `with_payment_activation_mode()` constructors.
- Add builder:

```rust
    pub fn with_turnstile(mut self, turnstile: TurnstileConfig) -> Self {
        self.turnstile = turnstile;
        self
    }
```

- [ ] **Step 4: Verify**

```bash
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/backend" && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test turnstile --lib && cargo build
```

Expected: fmt clean, no warnings, 3 unit tests pass, build OK. (Unit tests for `resolve` need no DB.)

- [ ] **Step 5: Commit**

```bash
git add backend/src/turnstile.rs backend/src/app_state.rs backend/src/lib.rs
git commit -m "feat: add Turnstile verification config and middleware"
```

---

### Task 2: Route protection, CORS header, main.rs wiring

**Files:**
- Modify: `backend/src/routes.rs`, `backend/src/main.rs`

**Interfaces:**
- Consumes: `turnstile::verify`, `TurnstileConfig::from_environment`, `AppState::with_turnstile` from Task 1.

- [ ] **Step 1: Apply the layer in `backend/src/routes.rs`**

Import update — add `turnstile` to the `crate::{...}` use list, and define once near the top of `build_router`:

```rust
use crate::{
    app_state::AppState,
    modules::{...},
    rate_limit, turnstile,
};
```

```rust
    let turnstile_layer = middleware::from_fn_with_state(state.clone(), turnstile::verify);
```

Then attach `.route_layer(turnstile_layer.clone())` on the `MethodRouter` of each protected route — inside `public`:

```rust
        .route(
            "/api/support/conversations",
            post(support::controller::create_conversation).route_layer(turnstile_layer.clone()),
        )
        .route(
            "/api/support/conversation",
            get(support::controller::support_conversation)
                .put(support::controller::close_conversation),
        )
        .route(
            "/api/support/messages",
            get(support::controller::support_messages)
                .post(support::controller::post_guest_message)
                .route_layer(turnstile_layer.clone()),
        )
        // ...
        .route(
            "/api/checkout",
            post(orders::controller::checkout).route_layer(turnstile_layer.clone()),
        )
        .route(
            "/api/checkout/payment",
            post(payments::controller::checkout_with_gateway).route_layer(turnstile_layer.clone()),
        )
        .route("/api/checkout/quote", post(orders::controller::quote)) // NOT protected — see constraints
        .route(
            "/api/account/register",
            post(customer_auth::controller::register).route_layer(turnstile_layer.clone()),
        )
        .route(
            "/api/account/login",
            post(customer_auth::controller::login).route_layer(turnstile_layer.clone()),
        )
        // ...
        .route(
            "/api/account/products/{product_id}/reviews",
            post(reviews::controller::create_review).route_layer(turnstile_layer.clone()),
        )
```

And for `/api/admin/login` (outside `public`):

```rust
        .route(
            "/api/admin/login",
            post(auth::controller::login).route_layer(turnstile_layer.clone()),
        )
```

- [ ] **Step 2: Allow the header through CORS (same file)**

```rust
        .allow_headers([
            CONTENT_TYPE,
            AUTHORIZATION,
            HeaderName::from_static(payments::activation::ACTIVATION_HEADER),
            HeaderName::from_static("cf-turnstile-token"),
        ]);
```

- [ ] **Step 3: Resolve + wire + log in `backend/src/main.rs`**

After the `rate_limiter` line (~41):

```rust
    let turnstile = online_shopping_api::turnstile::TurnstileConfig::from_environment();
```

Log line alongside the others (~78):

```rust
    tracing::info!(
        enabled = turnstile.is_enabled(),
        "turnstile bot protection resolved"
    );
```

State wiring (~85): `.with_rate_limiter(rate_limiter)` → append `.with_turnstile(turnstile)` after it.

- [ ] **Step 4: Verify**

```bash
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/backend" && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo build
```

Then run the existing suite (fail-open regression — all existing tests hit protected routes without tokens and must still pass):

```bash
docker compose -f "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/docker-compose.yml" up -d db
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/backend" && DATABASE_URL=postgres://project_depot:project_depot@localhost:5433/project_depot cargo test
```

Expected: all existing tests pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes.rs backend/src/main.rs
git commit -m "feat: gate public POST routes behind Turnstile verification"
```

---

### Task 3: Backend integration tests with stub siteverify

**Files:**
- Modify: `backend/tests/common/mod.rs`
- Create: `backend/tests/turnstile_api.rs`

**Interfaces:**
- Consumes: `TurnstileConfig::resolve` (Task 1), `common::request_with_headers` (existing — already injects `ConnectInfo` extension and arbitrary headers).

- [ ] **Step 1: Add `app_with_turnstile` helper to `backend/tests/common/mod.rs`**

```rust
use online_shopping_api::{
    // ...existing imports...
    turnstile::TurnstileConfig,
};

/// App state with Turnstile verification pointed at a stub siteverify server.
pub fn app_with_turnstile(pool: PgPool, siteverify_url: &str) -> Router {
    routes::build_router(
        AppState::with_payment_activation_mode(pool, PaymentActivationMode::Public)
            .with_turnstile(TurnstileConfig::resolve(
                Some("test-secret"),
                Some(siteverify_url),
            )),
        HeaderValue::from_static("http://localhost:5173"),
    )
}
```

- [ ] **Step 2: Write `backend/tests/turnstile_api.rs`**

```rust
mod common;

use axum::{
    Json, Router,
    http::{Method, StatusCode},
    routing::post,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use tokio::net::TcpListener;

/// Stub Cloudflare siteverify: "pass" succeeds, anything else fails. Returns its URL so the
/// app under test can be pointed at it via `TurnstileConfig::resolve`.
async fn stub_siteverify() -> String {
    let stub = Router::new().route(
        "/siteverify",
        post(|Json(body): Json<Value>| async move {
            Json(json!({ "success": body["response"].as_str() == Some("pass") }))
        }),
    );
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind stub");
    let url = format!("http://{}/siteverify", listener.local_addr().unwrap());
    tokio::spawn(async move {
        axum::serve(listener, stub).await.expect("stub server");
    });
    url
}

#[sqlx::test]
async fn protected_post_without_token_is_rejected(pool: PgPool) {
    let app = common::app_with_turnstile(pool, &stub_siteverify().await);

    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/admin/login",
        None,
        Some(json!({ "username": "x", "password": "y" })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
    assert_eq!(body["code"], "TURNSTILE_REQUIRED");
}

#[sqlx::test]
async fn accepted_token_reaches_the_handler(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "ts-admin", "secret123").await;
    let app = common::app_with_turnstile(pool, &stub_siteverify().await);

    let (status, body) = common::request_with_headers(
        app,
        Method::POST,
        "/api/admin/login",
        None,
        Some(json!({ "username": "ts-admin", "password": "secret123" })),
        &[("cf-turnstile-token", "pass".to_string())],
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body["token"].is_string(), "{body}");
}

#[sqlx::test]
async fn rejected_token_is_forbidden(pool: PgPool) {
    let app = common::app_with_turnstile(pool, &stub_siteverify().await);

    let (status, body) = common::request_with_headers(
        app,
        Method::POST,
        "/api/admin/login",
        None,
        Some(json!({ "username": "x", "password": "y" })),
        &[("cf-turnstile-token", "bogus".to_string())],
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN, "{body}");
    assert_eq!(body["code"], "TURNSTILE_FAILED");
}

#[sqlx::test]
async fn non_post_on_shared_route_bypasses_verification(pool: PgPool) {
    let app = common::app_with_turnstile(pool, &stub_siteverify().await);

    // GET /api/support/messages shares a route with the protected POST; the middleware must
    // let it reach the handler (which returns 401 for missing support auth, not 400).
    let (status, body) = common::request(app, Method::GET, "/api/support/messages", None, None).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED, "{body}");
    assert_ne!(body["code"], "TURNSTILE_REQUIRED");
}
```

- [ ] **Step 3: Run the new tests**

```bash
docker compose -f "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/docker-compose.yml" up -d db
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/backend" && DATABASE_URL=postgres://project_depot:project_depot@localhost:5433/project_depot cargo test --test turnstile_api
```

Expected: 4 tests pass. Then full gates: `cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test` (full suite).

- [ ] **Step 4: Commit**

```bash
git add backend/tests/common/mod.rs backend/tests/turnstile_api.rs
git commit -m "test: cover Turnstile middleware against a stub siteverify"
```

---

### Task 4: Frontend transport — `turnstileHeaders` + API signatures

**Files:**
- Modify: `frontend/src/shared/api/http.ts`, `frontend/src/modules/auth/api/authApi.ts`, `frontend/src/modules/customer_auth/api/customerAuthApi.ts`, `frontend/src/modules/orders/api/orderApi.ts`, `frontend/src/modules/reviews/api/reviewsApi.ts`, `frontend/src/modules/support/api/supportApi.ts`

**Interfaces:**
- Produces: `turnstileHeaders(token)` helper; `postJson(path, body, scope, headers?)`; API functions with optional trailing `turnstileToken?: string | null` param — consumed by Tasks 6–8.

- [ ] **Step 1: Add `turnstileHeaders` + extend `postJson` in `frontend/src/shared/api/http.ts`**

```ts
export function turnstileHeaders(token: string | null | undefined): Record<string, string> {
  return token ? { "cf-turnstile-token": token } : {};
}
```

Change `postJson` signature (line ~381):

```ts
export async function postJson<TBody, TResponse>(
  path: string,
  body: TBody,
  scope: AuthScope = "admin",
  headers?: HeadersInit
): Promise<TResponse> {
  return requestJson<TResponse>(
    path,
    {
      method: "POST",
      headers: requestHeaders(true, headers, scope),
      body: JSON.stringify(body)
    },
    scope
  );
}
```

(`requestHeaders` already merges caller headers — passing `headers` through is the whole change.)

- [ ] **Step 2: Update the five API functions**

`authApi.ts` `login` (line ~15):

```ts
export async function login(
  input: AdminLoginInput,
  turnstileToken?: string | null
): Promise<AdminLoginResponse> {
  const payload = await requestJson<AdminLoginResponse>("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...turnstileHeaders(turnstileToken) },
    body: JSON.stringify(input)
  });
  // ...unchanged
```

(add `turnstileHeaders` to the `shared/api/http` import)

`customerAuthApi.ts` `register` and `login` — same pattern: extra `turnstileToken?: string | null` param, spread `...turnstileHeaders(turnstileToken)` into the existing `headers` object.

`orderApi.ts` — `checkout`, `startPaymentCheckout` (leave `quoteCheckout` untouched — unprotected endpoint):

```ts
export function checkout(input: CreateOrderInput, turnstileToken?: string | null): Promise<Order> {
  return postJson<CreateOrderInput, Order>("/api/checkout", input, "customer", turnstileHeaders(turnstileToken));
}

export function startPaymentCheckout(input: CreateOrderInput, turnstileToken?: string | null): Promise<PaymentCheckout> {
  return postJson<CreateOrderInput, PaymentCheckout>("/api/checkout/payment", input, "customer", turnstileHeaders(turnstileToken));
}
```

(add `turnstileHeaders` to the http import)

`reviewsApi.ts`:

```ts
export function createProductReview(
  productId: number,
  input: CreateReviewInput,
  turnstileToken?: string | null
): Promise<ProductReview> {
  return postJson<CreateReviewInput, ProductReview>(
    `/api/account/products/${productId}/reviews`,
    input,
    "customer",
    turnstileHeaders(turnstileToken)
  );
}
```

`supportApi.ts` — `createSupportConversationWithScope` gains the param and forwards headers in its `postJson` call; `createSupportConversation` accepts and forwards it (both the customer-scope attempt and the public-scope retry must send the same token — one siteverify call per POST, and the retry only fires on a 401 which Turnstile precedes, so no double-consume); `sendSupportMessage` gains it too:

```ts
async function createSupportConversationWithScope(
  input: CreateSupportConversationInput,
  scope: AuthScope,
  turnstileToken?: string | null
): Promise<CreateSupportConversationResponse> {
  return postJson<CreateSupportConversationInput, CreateSupportConversationResponse>(
    "/api/support/conversations",
    input,
    scope,
    turnstileHeaders(turnstileToken)
  );
}

export async function createSupportConversation(
  input: CreateSupportConversationInput,
  turnstileToken?: string | null
): Promise<CreateSupportConversationResponse> {
  const scope = createConversationScope();
  try {
    return await createSupportConversationWithScope(input, scope, turnstileToken);
  } catch (error) {
    if (scope !== "customer" || !(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    setCustomerAuthToken(null);
    return createSupportConversationWithScope(input, "public", turnstileToken);
  }
}

export function sendSupportMessage(body: string, turnstileToken?: string | null): Promise<SupportMessage> {
  return postJson<{ body: string }, SupportMessage>(
    "/api/support/messages",
    { body },
    "support",
    turnstileHeaders(turnstileToken)
  );
}
```

- [ ] **Step 3: Verify**

```bash
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/frontend" && bun run build
```

Expected: `tsc -b && vite build` clean (existing call sites compile unchanged — the new param is optional).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/api/http.ts frontend/src/modules/auth/api/authApi.ts frontend/src/modules/customer_auth/api/customerAuthApi.ts frontend/src/modules/orders/api/orderApi.ts frontend/src/modules/reviews/api/reviewsApi.ts frontend/src/modules/support/api/supportApi.ts
git commit -m "feat: send Turnstile tokens on protected API calls"
```

---

### Task 5: `useTurnstile` hook + `TurnstileSlot` + error copy + env types

**Files:**
- Create: `frontend/src/shared/components/TurnstileSlot.tsx`
- Modify: `frontend/src/shared/notifications/errors.ts`, `frontend/src/vite-env.d.ts`

**Interfaces:**
- Produces: `useTurnstile(): { ref, token, isConfigured, reset }` and `<TurnstileSlot turnstile={...} />` — consumed by Tasks 6–8. `ref` is a React callback ref for the widget container div.
- Produces: `TURNSTILE_REQUIRED` / `TURNSTILE_FAILED` / `TURNSTILE_UNAVAILABLE` entries in `ERROR_MESSAGE_MAP` so `normalizeError` maps backend `code` fields to user copy instead of falling through to generic FORBIDDEN/BAD_REQUEST.

- [ ] **Step 1: Write `frontend/src/shared/components/TurnstileSlot.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileController = {
  ref: (element: HTMLDivElement | null) => void;
  token: string | null;
  isConfigured: boolean;
  reset: () => void;
};

let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Binds a Turnstile widget to whatever div `ref` is attached to. Using a callback ref (rather
 * than useRef + deps) means the widget is (re)created exactly when the slot mounts — forms
 * that render it conditionally need no extra wiring. Unconfigured site key = inert: nothing
 * renders, token stays null, and the backend's fail-open applies.
 */
export function useTurnstile(): TurnstileController {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const isConfigured = SITE_KEY.length > 0;

  useEffect(() => {
    if (!isConfigured || !container) return;

    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: SITE_KEY,
          callback: (nextToken: unknown) => setToken(typeof nextToken === "string" ? nextToken : null),
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null)
        });
      })
      .catch(() => setToken(null));

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      setToken(null);
      if (widgetId !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // The widget may already be gone if the script reset it.
        }
      }
    };
  }, [container, isConfigured]);

  const reset = useCallback(() => {
    setToken(null);
    const widgetId = widgetIdRef.current;
    if (widgetId !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetId);
      } catch {
        // Widget was removed; a fresh mount will issue a new token.
      }
    }
  }, []);

  return { ref: setContainer, token, isConfigured, reset };
}

/** Mount point for the widget; renders nothing when Turnstile isn't configured. */
export function TurnstileSlot({ turnstile }: { turnstile: TurnstileController }) {
  if (!turnstile.isConfigured) return null;
  return <div ref={turnstile.ref} />;
}
```

- [ ] **Step 2: Add the three error codes in `frontend/src/shared/notifications/errors.ts`**

Insert into `ERROR_MESSAGE_MAP` (e.g. after `RATE_LIMITED`):

```ts
  TURNSTILE_REQUIRED: { severity: "warning", title: "Verification needed", message: "Complete the bot check and try again.", retryable: true },
  TURNSTILE_FAILED: { severity: "warning", title: "Verification failed", message: "The bot check did not pass. Try again.", retryable: true },
  TURNSTILE_UNAVAILABLE: { severity: "error", title: "Verification unavailable", message: "The verification service is temporarily down. Try again shortly.", retryable: true },
```

- [ ] **Step 3: Type the env var in `frontend/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}
```

- [ ] **Step 4: Verify + commit**

```bash
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/frontend" && bun run build
git add frontend/src/shared/components/TurnstileSlot.tsx frontend/src/shared/notifications/errors.ts frontend/src/vite-env.d.ts
git commit -m "feat: add Turnstile widget hook and error copy"
```

---

### Task 6: Admin login wiring

**Files:**
- Modify: `frontend/src/modules/auth/components/AdminLoginScreen.tsx`, `frontend/src/App.tsx` (`handleAdminLogin` ~1873, `onLogin` prop at ~2942 unchanged — prop flows through)

**Interfaces:**
- Consumes: `useTurnstile`, `TurnstileSlot` (Task 5); `authApi.login(input, turnstileToken?)` (Task 4).

- [ ] **Step 1: Update `AdminLoginScreen.tsx`**

- Change the prop type: `onLogin: (input: AdminLoginInput, turnstileToken: string | null) => Promise<AdminLoginResponse>;`
- Add `const turnstile = useTurnstile();` with the other hooks.
- In `handleSubmit`: pass `turnstile.token` to `onLogin`, and in the `catch` call `turnstile.reset()` (token is single-use — after a failed submit a fresh one is required).
- Render `<TurnstileSlot turnstile={turnstile} />` inside the password form between the password `</label>` and `{feedback ? ...}` (~line 134).
- Submit button disabled: `disabled={isSubmitting || (turnstile.isConfigured && !turnstile.token)}`.
- Imports: `import { TurnstileSlot, useTurnstile } from "../../../shared/components/TurnstileSlot";`

- [ ] **Step 2: Update `handleAdminLogin` in `frontend/src/App.tsx`**

```ts
  const handleAdminLogin = async (
    input: AdminLoginInput,
    turnstileToken: string | null
  ): Promise<AdminLoginResponse> => {
    const response = await loginRequest(input, turnstileToken);
    // ...rest unchanged
```

(`loginRequest` is the aliased `login` import — find the exact local name near line 1874.)

- [ ] **Step 3: Verify + commit**

```bash
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/frontend" && bun run build
git add frontend/src/modules/auth/components/AdminLoginScreen.tsx frontend/src/App.tsx
git commit -m "feat: require Turnstile on admin login"
```

---

### Task 7: Storefront wiring — customer login/register + checkout

**Files:**
- Modify: `frontend/src/App.tsx` (AccountDrawer ~4245-5035, CartDrawer ~5064-5774, `submitCheckout` ~1981, `CartDrawer` prop type ~5064)

**Interfaces:**
- Consumes: `useTurnstile`, `TurnstileSlot` (Task 5); `loginCustomer`/`registerCustomer`/`startPaymentCheckoutRequest` token params (Task 4).

- [ ] **Step 1: AccountDrawer — one widget shared by login and register tabs**

In the `AccountDrawer` component (before the `if (!open) return null;` early return at ~4538 — hooks must run unconditionally):

```ts
  const turnstile = useTurnstile();
```

- In `submitLogin` (~4444): `await loginCustomer(input, turnstile.token)` and `turnstile.reset()` in `catch`.
- In `submitRegister` (~4462): `await registerCustomer(authForm, turnstile.token)` and `turnstile.reset()` in `catch`.
- Render `<TurnstileSlot turnstile={turnstile} />` ONCE between `.account-auth-tabs` div (~4962) and the `{authView === "login" ? (` conditional — one widget survives tab switches (a slot inside each form would remount on every switch).
- Both submit buttons: `disabled={authStatus === "loading" || (turnstile.isConfigured && !turnstile.token)}`.
- Import `TurnstileSlot, useTurnstile` from `./shared/components/TurnstileSlot`.

- [ ] **Step 2: CartDrawer — widget in the checkout stage**

`CartDrawer` prop type (~5064): `onCheckout: (input: CreateOrderInput, turnstileToken: string | null) => Promise<PaymentCheckout>;`

Inside `CartDrawer` (hooks section, with `useState`s ~5111): `const turnstile = useTurnstile();`

In `handleSubmit` (~5295): pass the token — `await onCheckout({...}, turnstile.token)` (second arg after the input object, ~5316-5326). In `catch`, `turnstile.reset()`.

Render `<TurnstileSlot turnstile={turnstile} />` inside the checkout-stage JSX just before `<div className="cart-checkout-actions">` (~5751).

Submit button disabled (~5758): append `|| (turnstile.isConfigured && !turnstile.token)` to the existing expression.

- [ ] **Step 3: App-level `submitCheckout` (~1981)**

```ts
  const submitCheckout = async (
    input: CreateOrderInput,
    turnstileToken: string | null
  ): Promise<PaymentCheckout> => {
    const checkout = await startPaymentCheckoutRequest(input, turnstileToken);
    // ...rest unchanged
```

- [ ] **Step 4: Verify + commit**

```bash
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/frontend" && bun run build
git add frontend/src/App.tsx
git commit -m "feat: require Turnstile on customer auth and checkout"
```

---

### Task 8: Support widget wiring

**Files:**
- Modify: `frontend/src/modules/support/components/SupportChatWidget.tsx`

**Interfaces:**
- Consumes: `useTurnstile`, `TurnstileSlot` (Task 5); `createSupportConversation`/`sendSupportMessage` token params (Task 4).

- [ ] **Step 1: Wire the widget**

- `const turnstile = useTurnstile();` with the other hooks (~line 65).
- In `startConversation` (~405): `await createSupportConversation({...}, turnstile.token)`; `turnstile.reset()` in `catch`.
- In `sendMessage` (~451): `await sendSupportMessage(body, turnstile.token)`; `turnstile.reset()` in `catch` AND after a successful send (token is single-use — next message needs a fresh one; `reset()` triggers a new `callback` token).
- Render `<TurnstileSlot turnstile={turnstile} />` inside the chat panel JSX — once, near the bottom of the panel above the composer, so it serves both the guest-start form and ongoing messages. (Find the panel container that renders when `isOpen`; the slot must live inside it since the callback-ref remount handles open/close automatically.)
- Gate the sends, don't hard-block: for `sendMessage`, if `turnstile.isConfigured && !turnstile.token`, surface `setError(t("support.error.required"))`-style feedback rather than firing a request that will 400. Same guard in `startConversation` before the API call.

- [ ] **Step 2: Verify + commit**

```bash
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/frontend" && bun run build
git add frontend/src/modules/support/components/SupportChatWidget.tsx
git commit -m "feat: require Turnstile on support conversations and messages"
```

---

### Task 9: Docs + final gates

**Files:**
- Modify: `README.md` (env vars section — brief Turnstile paragraph), `CLAUDE.md` (External dependencies list)
- Already edited (uncommitted): `backend/.env.example`, `frontend/.env.example` — fold into this commit.

- [ ] **Step 1: README** — short section: Turnstile protects public POST surfaces; get keys from Cloudflare dashboard → Turnstile → Add widget (register `localhost` + prod hostname); `VITE_TURNSTILE_SITE_KEY` → `frontend/.env`, `TURNSTILE_SECRET_KEY` → `backend/.env`; unset = disabled (fail-open); Cloudflare's published test keys work for staging.

- [ ] **Step 2: CLAUDE.md** — one line under "External dependencies": `Cloudflare Turnstile — bot gate on public POSTs; TURNSTILE_SECRET_KEY (backend) + VITE_TURNSTILE_SITE_KEY (frontend); disabled when unset.`

- [ ] **Step 3: Full verification**

```bash
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/backend" && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo build && DATABASE_URL=postgres://project_depot:project_depot@localhost:5433/project_depot cargo test
cd "/Volumes/APPLE EXTERNAL SSD /Personal Projects/online-shopping-platform/frontend" && bun run build
```

- [ ] **Step 4: Browser exercise (required by repo rules for UI work)** — start `cargo run` + `bun run dev`, open http://localhost:5173, verify: widget renders on account drawer + checkout + support chat; login/register/checkout/support flows work with the real keys already in `.env`; admin login shows the widget.

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md backend/.env.example frontend/.env.example
git commit -m "docs: document Turnstile env vars and setup"
```

---

## Self-review notes

- Spec coverage: all protected routes from the spec are wired **except** `/api/checkout/quote` — deliberately dropped (auto-fired on cart changes; incompatible with single-use tokens; rate limiter still applies). Spec updated separately.
- `sendSupportMessage` needs `reset()` after success too — each message consumes a token.
- `createSupportConversation` retries on 401 with a second scope — same token is resent; safe because Turnstile verification runs before the handler and a rejected token never reaches the 401 path... correction: a *consumed* token on retry would fail siteverify. Mitigate: the 401-retry path only triggers when the first request reached the handler (token already consumed). To stay correct, the retry sends the same token but if it 403s the user sees the error — acceptable, or better: catch 401-retry is rare (stale customer token); simplest correct behavior is sending the same token and letting a rare TURNSTILE_FAILED surface. Implementer: keep as written (same token on retry); noted limitation.
