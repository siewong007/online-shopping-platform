mod common;

use axum::http::{Method, StatusCode};
use online_shopping_api::db;
use serde_json::json;
use sqlx::PgPool;

#[sqlx::test]
async fn create_user_then_login_as_them_succeeds(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "team-admin", "secret123").await;
    let app = common::app(pool);
    let admin_token = common::login(app.clone(), "team-admin", "secret123").await;

    let (created_status, created_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/users",
        Some(&admin_token),
        Some(json!({
            "username": "new-lead",
            "display_name": "New Lead",
            "password": "secret123",
            "role_id": 4
        })),
    )
    .await;
    assert_eq!(created_status, StatusCode::CREATED, "{created_body}");

    let new_user_token = common::login(app.clone(), "new-lead", "secret123").await;
    let (me_status, me_body) = common::request(
        app,
        Method::GET,
        "/api/admin/me",
        Some(&new_user_token),
        None,
    )
    .await;
    assert_eq!(me_status, StatusCode::OK, "{me_body}");
    assert_eq!(me_body["role"]["name"], "Fulfillment Lead");
}

#[sqlx::test]
async fn deactivate_user_blocks_subsequent_requests(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "deactivate-admin", "secret123").await;
    common::create_admin(&pool, "Fulfillment Lead", "deactivate-target", "secret123").await;
    let app = common::app(pool);
    let admin_token = common::login(app.clone(), "deactivate-admin", "secret123").await;
    let target_token = common::login(app.clone(), "deactivate-target", "secret123").await;

    let (users_status, users_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/users",
        Some(&admin_token),
        None,
    )
    .await;
    assert_eq!(users_status, StatusCode::OK, "{users_body}");
    let target_id = users_body
        .as_array()
        .and_then(|users| {
            users
                .iter()
                .find(|user| user["username"] == "deactivate-target")
        })
        .and_then(|user| user["id"].as_i64())
        .expect("target user id") as i32;

    let (deactivate_status, deactivate_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/users/{target_id}/status"),
        Some(&admin_token),
        Some(json!({ "is_active": false })),
    )
    .await;
    assert_eq!(deactivate_status, StatusCode::OK, "{deactivate_body}");

    let (blocked_status, _) =
        common::request(app, Method::GET, "/api/admin/me", Some(&target_token), None).await;
    assert_eq!(blocked_status, StatusCode::UNAUTHORIZED);
}

#[sqlx::test]
async fn cannot_deactivate_the_only_active_super_admin(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "sole-super-admin", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "sole-super-admin", "secret123").await;

    let (me_status, me_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/me",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(me_status, StatusCode::OK, "{me_body}");
    let self_id = me_body["user"]["id"].as_i64().expect("self id") as i32;

    let (blocked_status, blocked_body) = common::request(
        app,
        Method::PUT,
        &format!("/api/admin/users/{self_id}/status"),
        Some(&token),
        Some(json!({ "is_active": false })),
    )
    .await;
    assert_eq!(blocked_status, StatusCode::BAD_REQUEST, "{blocked_body}");
    assert!(
        blocked_body
            .as_str()
            .is_some_and(|message| message.contains("only active Super Admin"))
    );
}

#[sqlx::test]
async fn concurrent_super_admin_deactivations_leave_one_active(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "concurrent-super-one", "secret123").await;
    common::create_admin(&pool, "Super Admin", "concurrent-super-two", "secret123").await;

    let first_id = sqlx::query_scalar::<_, i32>(
        "SELECT id FROM admin_users WHERE username = 'concurrent-super-one'",
    )
    .fetch_one(&pool)
    .await
    .expect("first Super Admin should exist");
    let second_id = sqlx::query_scalar::<_, i32>(
        "SELECT id FROM admin_users WHERE username = 'concurrent-super-two'",
    )
    .fetch_one(&pool)
    .await
    .expect("second Super Admin should exist");

    let (first_result, second_result) = tokio::join!(
        db::set_admin_user_active(&pool, first_id, false, first_id),
        db::set_admin_user_active(&pool, second_id, false, second_id),
    );

    assert_eq!(
        usize::from(first_result.is_ok()) + usize::from(second_result.is_ok()),
        1,
        "exactly one concurrent deactivation must succeed"
    );
    let failed = first_result.err().or_else(|| second_result.err());
    assert!(
        failed.is_some_and(|error| error.to_string().contains("only active Super Admin")),
        "the other deactivation must preserve the final Super Admin"
    );

    let active_super_admins = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM admin_users
        JOIN roles ON roles.id = admin_users.role_id
        WHERE admin_users.is_active = TRUE
          AND roles.is_super_admin = TRUE
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("active Super Admin count should be readable");
    assert_eq!(active_super_admins, 1);
}

#[sqlx::test]
async fn administrator_cannot_change_their_own_role(pool: PgPool) {
    let user_manager_role_id = sqlx::query_scalar::<_, i32>(
        r#"
        INSERT INTO roles (name, description)
        VALUES ('User Manager', 'Can manage non-super-admin accounts.')
        RETURNING id
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("User Manager role should be created");
    sqlx::query(
        r#"
        INSERT INTO role_page_permissions (role_id, page_id, can_create, can_update)
        SELECT $1, id, TRUE, TRUE
        FROM permission_pages
        WHERE slug = 'admin-permissions'
        "#,
    )
    .bind(user_manager_role_id)
    .execute(&pool)
    .await
    .expect("User Manager permissions should be granted");
    common::create_admin(&pool, "User Manager", "self-role-admin", "secret123").await;
    let super_admin_role_id = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT id
        FROM roles
        WHERE is_super_admin = TRUE
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("Super Admin role should exist");
    common::create_admin(&pool, "Super Admin", "protected-super-admin", "secret123").await;
    let protected_super_admin_id = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT id
        FROM admin_users
        WHERE username = 'protected-super-admin'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("protected Super Admin should exist");
    let app = common::app(pool.clone());
    let token = common::login(app.clone(), "self-role-admin", "secret123").await;

    let (me_status, me_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/me",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(me_status, StatusCode::OK, "{me_body}");
    let self_id = me_body["user"]["id"].as_i64().expect("self id") as i32;

    let (blocked_status, blocked_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/users/{self_id}"),
        Some(&token),
        Some(json!({
            "display_name": "Self Role Admin",
            "role_id": super_admin_role_id,
        })),
    )
    .await;
    assert_eq!(blocked_status, StatusCode::FORBIDDEN, "{blocked_body}");

    let (create_status, create_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/users",
        Some(&token),
        Some(json!({
            "username": "second-super-admin",
            "display_name": "Second Super Admin",
            "password": "secret123",
            "role_id": super_admin_role_id,
        })),
    )
    .await;
    assert_eq!(create_status, StatusCode::FORBIDDEN, "{create_body}");

    let (profile_update_status, profile_update_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/users/{protected_super_admin_id}"),
        Some(&token),
        Some(json!({
            "display_name": "Changed Super Admin",
            "role_id": super_admin_role_id,
        })),
    )
    .await;
    assert_eq!(
        profile_update_status,
        StatusCode::FORBIDDEN,
        "{profile_update_body}"
    );

    let (status_update_status, status_update_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/users/{protected_super_admin_id}/status"),
        Some(&token),
        Some(json!({ "is_active": false })),
    )
    .await;
    assert_eq!(
        status_update_status,
        StatusCode::FORBIDDEN,
        "{status_update_body}"
    );

    let (password_reset_status, password_reset_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/users/{protected_super_admin_id}/password"),
        Some(&token),
        Some(json!({ "new_password": "brandnew123" })),
    )
    .await;
    assert_eq!(
        password_reset_status,
        StatusCode::FORBIDDEN,
        "{password_reset_body}"
    );

    let permissions_page_id = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT id
        FROM permission_pages
        WHERE slug = 'admin-permissions'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("admin-permissions page should exist");
    let (permission_status, permission_body) = common::request(
        app.clone(),
        Method::PUT,
        "/api/admin/role-permissions",
        Some(&token),
        Some(json!({
            "role_id": user_manager_role_id,
            "page_id": permissions_page_id,
            "can_create": true,
            "can_read": true,
            "can_update": true,
            "can_delete": true,
        })),
    )
    .await;
    assert_eq!(
        permission_status,
        StatusCode::FORBIDDEN,
        "{permission_body}"
    );

    let (me_status, me_body) =
        common::request(app, Method::GET, "/api/admin/me", Some(&token), None).await;
    assert_eq!(me_status, StatusCode::OK, "{me_body}");
    assert_eq!(me_body["role"]["name"], "User Manager");
}

#[sqlx::test]
async fn admin_reset_password_invalidates_existing_sessions(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "reset-admin", "secret123").await;
    common::create_admin(&pool, "Fulfillment Lead", "reset-target", "secret123").await;
    let app = common::app(pool);
    let admin_token = common::login(app.clone(), "reset-admin", "secret123").await;
    let target_token = common::login(app.clone(), "reset-target", "secret123").await;

    let (users_status, users_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/users",
        Some(&admin_token),
        None,
    )
    .await;
    assert_eq!(users_status, StatusCode::OK, "{users_body}");
    let target_id = users_body
        .as_array()
        .and_then(|users| users.iter().find(|user| user["username"] == "reset-target"))
        .and_then(|user| user["id"].as_i64())
        .expect("target user id") as i32;

    let (reset_status, reset_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/users/{target_id}/password"),
        Some(&admin_token),
        Some(json!({ "new_password": "brandnew123" })),
    )
    .await;
    assert_eq!(reset_status, StatusCode::NO_CONTENT, "{reset_body}");

    let (stale_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/me",
        Some(&target_token),
        None,
    )
    .await;
    assert_eq!(stale_status, StatusCode::UNAUTHORIZED);

    let new_token = common::login(app, "reset-target", "brandnew123").await;
    assert_eq!(new_token.len(), 64);
}

#[sqlx::test]
async fn change_own_password_requires_current_password_then_invalidates_session(pool: PgPool) {
    common::create_admin(&pool, "Fulfillment Lead", "self-change", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "self-change", "secret123").await;

    let (wrong_status, wrong_body) = common::request(
        app.clone(),
        Method::PUT,
        "/api/admin/me/password",
        Some(&token),
        Some(json!({ "current_password": "not-it", "new_password": "updated123" })),
    )
    .await;
    assert_eq!(wrong_status, StatusCode::BAD_REQUEST, "{wrong_body}");

    let (still_valid_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/me",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(
        still_valid_status,
        StatusCode::OK,
        "a wrong current password must not invalidate the session"
    );

    let (correct_status, correct_body) = common::request(
        app.clone(),
        Method::PUT,
        "/api/admin/me/password",
        Some(&token),
        Some(json!({ "current_password": "secret123", "new_password": "updated123" })),
    )
    .await;
    assert_eq!(correct_status, StatusCode::NO_CONTENT, "{correct_body}");

    let (stale_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/me",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(stale_status, StatusCode::UNAUTHORIZED);

    let new_token = common::login(app, "self-change", "updated123").await;
    assert_eq!(new_token.len(), 64);
}

#[sqlx::test]
async fn username_uniqueness_is_case_insensitive(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "case-admin", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "case-admin", "secret123").await;

    let (first_status, first_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/users",
        Some(&token),
        Some(json!({
            "username": "CaseTest",
            "display_name": "Case Test",
            "password": "secret123",
            "role_id": 4
        })),
    )
    .await;
    assert_eq!(first_status, StatusCode::CREATED, "{first_body}");

    let (duplicate_status, _) = common::request(
        app,
        Method::POST,
        "/api/admin/users",
        Some(&token),
        Some(json!({
            "username": "casetest",
            "display_name": "Duplicate Case Test",
            "password": "secret123",
            "role_id": 4
        })),
    )
    .await;
    assert_eq!(duplicate_status, StatusCode::BAD_REQUEST);
}
