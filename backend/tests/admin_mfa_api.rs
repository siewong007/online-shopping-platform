use axum::{
    Router,
    body::Body,
    http::{Method, Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

mod common;

fn app_with_mfa(pool: PgPool) -> Router {
    common::app_with_mfa(pool)
}

/// The six-digit code an authenticator app would show right now for the enrolled secret.
fn current_totp_code(secret_base32: &str) -> String {
    let secret = totp_rs::Secret::Encoded(secret_base32.to_string())
        .to_bytes()
        .expect("enrollment returns a valid base32 secret");
    let totp = totp_rs::TOTP::new(
        totp_rs::Algorithm::SHA1,
        6,
        1,
        30,
        secret,
        None,
        "mfa-test".to_string(),
    )
    .expect("TOTP parameters are fixed by the server");
    totp.generate_current().expect("system time is available")
}

async fn post_json(
    app: Router,
    path: &str,
    token: Option<&str>,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(Method::POST).uri(path);
    if let Some(token) = token {
        builder = builder.header(axum::http::header::AUTHORIZATION, format!("Bearer {token}"));
    }
    if body.is_some() {
        builder = builder.header(axum::http::header::CONTENT_TYPE, "application/json");
    }
    let request = builder
        .body(Body::from(
            body.map(|value| value.to_string()).unwrap_or_default(),
        ))
        .expect("request should build");
    let response = app
        .oneshot(request)
        .await
        .expect("router request should complete");
    let status = response.status();
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("response body should collect")
        .to_bytes();
    let text = String::from_utf8(bytes.to_vec()).expect("response should be utf-8");
    (
        status,
        serde_json::from_str(&text).unwrap_or(Value::String(text)),
    )
}

/// Password phase of login; returns the raw response body.
async fn login_password(app: &Router, username: &str, password: &str) -> (StatusCode, Value) {
    common::request(
        app.clone(),
        Method::POST,
        "/api/admin/login",
        None,
        Some(json!({ "username": username, "password": password })),
    )
    .await
}

#[sqlx::test]
async fn enrollment_then_login_requires_and_accepts_the_authenticator_code(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "mfa-admin", "secret123").await;
    let app = app_with_mfa(pool);

    // Plain login works before any factor is enrolled.
    let (plain_status, plain_body) = login_password(&app, "mfa-admin", "secret123").await;
    assert_eq!(plain_status, StatusCode::OK, "{plain_body}");
    let session_token = plain_body["token"].as_str().expect("token").to_string();

    // Enrollment hands back an otpauth URL plus the base32 fallback...
    let (start_status, start_body) = post_json(
        app.clone(),
        "/api/admin/mfa/enrollment",
        Some(&session_token),
        None,
    )
    .await;
    assert_eq!(start_status, StatusCode::OK, "{start_body}");
    assert!(
        start_body["otpauth_url"]
            .as_str()
            .unwrap()
            .starts_with("otpauth://totp/"),
        "{start_body}"
    );
    let secret_base32 = start_body["secret_base32"].as_str().unwrap().to_string();

    // ...and confirming with a live code yields one-time recovery codes.
    let (confirm_status, confirm_body) = post_json(
        app.clone(),
        "/api/admin/mfa/enrollment/verify",
        Some(&session_token),
        Some(json!({ "code": current_totp_code(&secret_base32) })),
    )
    .await;
    assert_eq!(confirm_status, StatusCode::OK, "{confirm_body}");
    let recovery_codes = confirm_body["recovery_codes"]
        .as_array()
        .expect("recovery codes array")
        .iter()
        .map(|code| code.as_str().expect("recovery code").to_string())
        .collect::<Vec<_>>();
    assert_eq!(recovery_codes.len(), 10);

    // From here on, password alone only reaches the MFA challenge.
    let (_, challenge_body) = login_password(&app, "mfa-admin", "secret123").await;
    assert_eq!(challenge_body["mfa_required"], true, "{challenge_body}");
    let wrong_status;
    {
        let challenge_token = challenge_body["challenge_token"].as_str().unwrap();
        (wrong_status, _) = post_json(
            app.clone(),
            "/api/admin/login/verify",
            None,
            Some(json!({ "challenge_token": challenge_token, "code": "000000" })),
        )
        .await;
    }
    assert_eq!(wrong_status, StatusCode::UNAUTHORIZED);

    // A fresh challenge verified with a live code completes the login.
    let (_, retry_challenge) = login_password(&app, "mfa-admin", "secret123").await;
    let (verify_status, verify_body) = post_json(
        app.clone(),
        "/api/admin/login/verify",
        None,
        Some(json!({
            "challenge_token": retry_challenge["challenge_token"],
            "code": current_totp_code(&secret_base32),
        })),
    )
    .await;
    assert_eq!(verify_status, StatusCode::OK, "{verify_body}");
    let me_token = verify_body["token"].as_str().expect("session token");
    let (me_status, me_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/me",
        Some(me_token),
        None,
    )
    .await;
    assert_eq!(me_status, StatusCode::OK, "{me_body}");

    // A recovery code is accepted exactly once.
    let (_, recovery_challenge) = login_password(&app, "mfa-admin", "secret123").await;
    let (recovery_status, recovery_login) = post_json(
        app.clone(),
        "/api/admin/login/verify",
        None,
        Some(json!({
            "challenge_token": recovery_challenge["challenge_token"],
            "recovery_code": recovery_codes[0],
        })),
    )
    .await;
    assert_eq!(recovery_status, StatusCode::OK, "{recovery_login}");

    let (_, reuse_challenge) = login_password(&app, "mfa-admin", "secret123").await;
    let (reuse_status, _) = post_json(
        app.clone(),
        "/api/admin/login/verify",
        None,
        Some(json!({
            "challenge_token": reuse_challenge["challenge_token"],
            "recovery_code": recovery_codes[0],
        })),
    )
    .await;
    assert_eq!(reuse_status, StatusCode::UNAUTHORIZED);

    // Disabling needs both the password and a live code; afterwards plain login returns.
    let (disable_status, disable_body) = post_json(
        app.clone(),
        "/api/admin/mfa/disable",
        Some(me_token),
        Some(json!({
            "password": "secret123",
            "code": current_totp_code(&secret_base32),
        })),
    )
    .await;
    assert_eq!(disable_status, StatusCode::NO_CONTENT, "{disable_body}");

    let (final_status, final_body) = login_password(&app, "mfa-admin", "secret123").await;
    assert_eq!(final_status, StatusCode::OK, "{final_body}");
    assert!(final_body["token"].is_string(), "{final_body}");
}

#[sqlx::test]
async fn five_wrong_codes_exhaust_the_login_challenge(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "lock-mfa", "secret123").await;
    let app = app_with_mfa(pool);

    let (_, plain) = login_password(&app, "lock-mfa", "secret123").await;
    let session_token = plain["token"].as_str().unwrap();
    let (start_status, start_body) = post_json(
        app.clone(),
        "/api/admin/mfa/enrollment",
        Some(session_token),
        None,
    )
    .await;
    assert_eq!(start_status, StatusCode::OK, "{start_body}");
    let secret_base32 = start_body["secret_base32"].as_str().unwrap();
    let (confirm_status, _) = post_json(
        app.clone(),
        "/api/admin/mfa/enrollment/verify",
        Some(session_token),
        Some(json!({ "code": current_totp_code(secret_base32) })),
    )
    .await;
    assert_eq!(confirm_status, StatusCode::OK, "{confirm_status}");

    let (_, challenge) = login_password(&app, "lock-mfa", "secret123").await;
    let challenge_token = challenge["challenge_token"].as_str().unwrap();
    for attempt in 0..5 {
        let (status, _) = post_json(
            app.clone(),
            "/api/admin/login/verify",
            None,
            Some(json!({
                "challenge_token": challenge_token,
                "code": format!("{attempt:06}"),
            })),
        )
        .await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    // The schema-capped attempt budget is spent, so even the genuine code cannot pass.
    let (dead_status, dead_body) = post_json(
        app.clone(),
        "/api/admin/login/verify",
        None,
        Some(json!({
            "challenge_token": challenge_token,
            "code": current_totp_code(secret_base32),
        })),
    )
    .await;
    assert_eq!(dead_status, StatusCode::UNAUTHORIZED, "{dead_body}");

    // But a brand-new challenge with the genuine code still logs the admin in.
    let (_, fresh_challenge) = login_password(&app, "lock-mfa", "secret123").await;
    let (fresh_status, fresh_body) = post_json(
        app,
        "/api/admin/login/verify",
        None,
        Some(json!({
            "challenge_token": fresh_challenge["challenge_token"],
            "code": current_totp_code(secret_base32),
        })),
    )
    .await;
    assert_eq!(fresh_status, StatusCode::OK, "{fresh_body}");
}
