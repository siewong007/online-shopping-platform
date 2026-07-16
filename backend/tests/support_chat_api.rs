mod common;

use axum::{
    Router,
    http::{Method, StatusCode},
};
use home_depot_clone_api::db;
use serde_json::{Value, json};
use sqlx::PgPool;

async fn create_guest_conversation(
    app: &Router,
    guest_name: &str,
    guest_email: &str,
    message: &str,
) -> (String, Value) {
    let (status, body) = common::request(
        app.clone(),
        Method::POST,
        "/api/support/conversations",
        None,
        Some(json!({
            "guest_name": guest_name,
            "guest_email": guest_email,
            "message": message,
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED, "{body}");
    let token = body["token"]
        .as_str()
        .expect("support conversation should return a token")
        .to_string();
    (token, body)
}

async fn register_customer(app: &Router, email: &str) -> Value {
    let (status, body) = common::request(
        app.clone(),
        Method::POST,
        "/api/account/register",
        None,
        Some(json!({
            "email": email,
            "password": "support-customer-password",
            "display_name": "Support Customer",
        })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "{body}");
    body
}

#[sqlx::test]
async fn guest_can_create_send_and_resume_support_conversation(pool: PgPool) {
    let app = common::app(pool);
    let (token, created) = create_guest_conversation(
        &app,
        "  Guest Buyer  ",
        "  guest@example.com  ",
        "  I need delivery help.  ",
    )
    .await;
    let conversation_id = created["conversation"]["id"]
        .as_i64()
        .expect("conversation id");
    let first_message_id = created["messages"][0]["id"]
        .as_i64()
        .expect("first message id");

    assert_eq!(token.len(), 64);
    assert_eq!(created["conversation"]["guest_name"], "Guest Buyer");
    assert_eq!(created["conversation"]["guest_email"], "guest@example.com");
    assert_eq!(created["messages"][0]["body"], "I need delivery help.");
    assert_eq!(created["messages"][0]["author_kind"], "guest");

    let (conversation_status, conversation) = common::request(
        app.clone(),
        Method::GET,
        "/api/support/conversation",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(conversation_status, StatusCode::OK, "{conversation}");
    assert_eq!(conversation["id"].as_i64(), Some(conversation_id));

    let (send_status, sent) = common::request(
        app.clone(),
        Method::POST,
        "/api/support/messages",
        Some(&token),
        Some(json!({ "body": "Please confirm the delivery date." })),
    )
    .await;
    assert_eq!(send_status, StatusCode::OK, "{sent}");
    assert_eq!(sent["conversation_id"].as_i64(), Some(conversation_id));
    assert_eq!(sent["body"], "Please confirm the delivery date.");

    let (resumed_status, resumed) = common::request(
        app,
        Method::GET,
        &format!("/api/support/messages?after_id={first_message_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(resumed_status, StatusCode::OK, "{resumed}");
    assert_eq!(resumed["messages"].as_array().map(Vec::len), Some(1));
    assert_eq!(
        resumed["messages"][0]["body"],
        "Please confirm the delivery date."
    );
}

#[sqlx::test]
async fn support_session_is_scoped_to_its_own_conversation(pool: PgPool) {
    let app = common::app(pool);
    let (first_token, first) =
        create_guest_conversation(&app, "First Guest", "first@example.com", "First request").await;
    let (_second_token, second) =
        create_guest_conversation(&app, "Second Guest", "second@example.com", "Second request")
            .await;
    let first_conversation_id = first["conversation"]["id"].as_i64().expect("first id");
    let second_conversation_id = second["conversation"]["id"].as_i64().expect("second id");

    let (conversation_status, conversation) = common::request(
        app.clone(),
        Method::GET,
        "/api/support/conversation",
        Some(&first_token),
        None,
    )
    .await;
    assert_eq!(conversation_status, StatusCode::OK, "{conversation}");
    assert_eq!(conversation["id"].as_i64(), Some(first_conversation_id));
    assert_ne!(conversation["id"].as_i64(), Some(second_conversation_id));

    let (messages_status, messages) = common::request(
        app,
        Method::GET,
        &format!("/api/support/messages?after_id=0&conversation_id={second_conversation_id}"),
        Some(&first_token),
        None,
    )
    .await;
    assert_eq!(messages_status, StatusCode::OK, "{messages}");
    assert!(
        messages["messages"]
            .as_array()
            .expect("message list")
            .iter()
            .all(|message| message["conversation_id"].as_i64() == Some(first_conversation_id))
    );
}

#[sqlx::test]
async fn permissioned_admin_can_reply_assign_and_change_status(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "support-admin", "secret123").await;
    let admin_id =
        sqlx::query_scalar::<_, i32>("SELECT id FROM admin_users WHERE username = 'support-admin'")
            .fetch_one(&pool)
            .await
            .expect("admin should exist");
    let app = common::app(pool.clone());
    let admin_token = common::login(app.clone(), "support-admin", "secret123").await;
    let (support_token, created) =
        create_guest_conversation(&app, "Guest", "guest@example.com", "Need an update").await;
    let conversation_id = created["conversation"]["id"]
        .as_i64()
        .expect("conversation id");

    let (inbox_status, inbox) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/support/conversations?status=open",
        Some(&admin_token),
        None,
    )
    .await;
    assert_eq!(inbox_status, StatusCode::OK, "{inbox}");
    assert_eq!(inbox["items"][0]["id"].as_i64(), Some(conversation_id));
    assert_eq!(inbox["items"][0]["last_message_preview"], "Need an update");
    assert_eq!(inbox["items"][0]["last_message_author_kind"], "guest");

    let (thread_status, thread) = common::request(
        app.clone(),
        Method::GET,
        &format!("/api/admin/support/conversations/{conversation_id}/messages"),
        Some(&admin_token),
        None,
    )
    .await;
    assert_eq!(thread_status, StatusCode::OK, "{thread}");
    assert_eq!(thread["messages"].as_array().map(Vec::len), Some(1));

    let (reply_status, reply) = common::request(
        app.clone(),
        Method::POST,
        &format!("/api/admin/support/conversations/{conversation_id}/messages"),
        Some(&admin_token),
        Some(json!({ "body": "We can help with that today." })),
    )
    .await;
    assert_eq!(reply_status, StatusCode::OK, "{reply}");
    assert_eq!(reply["author_kind"], "admin");
    assert_eq!(reply["admin_user_id"].as_i64(), Some(i64::from(admin_id)));

    let (update_status, updated) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/support/conversations/{conversation_id}"),
        Some(&admin_token),
        Some(json!({
            "status": "pending",
            "assigned_admin_user_id": admin_id,
        })),
    )
    .await;
    assert_eq!(update_status, StatusCode::OK, "{updated}");
    assert_eq!(updated["status"], "pending");
    assert_eq!(
        updated["assigned_admin_user_id"].as_i64(),
        Some(i64::from(admin_id))
    );

    let (guest_messages_status, guest_messages) = common::request(
        app,
        Method::GET,
        "/api/support/messages",
        Some(&support_token),
        None,
    )
    .await;
    assert_eq!(guest_messages_status, StatusCode::OK, "{guest_messages}");
    assert_eq!(guest_messages["messages"].as_array().map(Vec::len), Some(2));
    assert_eq!(guest_messages["messages"][1]["author_kind"], "admin");

    let audit_rows = sqlx::query_as::<_, (String, String, String)>(
        r#"
        SELECT action, entity_id, detail
        FROM audit_events
        WHERE entity_type = 'support_conversation'
        ORDER BY id
        "#,
    )
    .fetch_all(&pool)
    .await
    .expect("support audit events should load");
    assert_eq!(audit_rows.len(), 2);
    assert!(audit_rows.iter().all(|(_, entity_id, detail)| {
        entity_id == &conversation_id.to_string() && detail.is_empty()
    }));
}

#[sqlx::test]
async fn admin_support_access_requires_authentication_and_permission(pool: PgPool) {
    common::create_admin(
        &pool,
        "Fulfillment Lead",
        "support-fulfillment",
        "secret123",
    )
    .await;
    let app = common::app(pool);
    let fulfillment_token = common::login(app.clone(), "support-fulfillment", "secret123").await;

    let (missing_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/support/conversations",
        None,
        None,
    )
    .await;
    assert_eq!(missing_status, StatusCode::UNAUTHORIZED);

    let (forbidden_status, _) = common::request(
        app,
        Method::GET,
        "/api/admin/support/conversations",
        Some(&fulfillment_token),
        None,
    )
    .await;
    assert_eq!(forbidden_status, StatusCode::FORBIDDEN);
}

#[sqlx::test]
async fn support_validation_and_closed_conversations_reject_invalid_messages(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "validation-admin", "secret123").await;
    let app = common::app(pool);
    let admin_token = common::login(app.clone(), "validation-admin", "secret123").await;

    let (invalid_email_status, _) = common::request(
        app.clone(),
        Method::POST,
        "/api/support/conversations",
        None,
        Some(json!({
            "guest_name": "Guest",
            "guest_email": "not-an-email",
            "message": "Question",
        })),
    )
    .await;
    assert_eq!(invalid_email_status, StatusCode::BAD_REQUEST);

    let (blank_message_status, _) = common::request(
        app.clone(),
        Method::POST,
        "/api/support/conversations",
        None,
        Some(json!({
            "guest_name": "Guest",
            "guest_email": "guest@example.com",
            "message": "   ",
        })),
    )
    .await;
    assert_eq!(blank_message_status, StatusCode::BAD_REQUEST);

    let (support_token, created) =
        create_guest_conversation(&app, "Guest", "guest@example.com", "Question").await;
    let conversation_id = created["conversation"]["id"]
        .as_i64()
        .expect("conversation id");
    let oversized_body = "x".repeat(2_001);
    let (oversized_status, _) = common::request(
        app.clone(),
        Method::POST,
        "/api/support/messages",
        Some(&support_token),
        Some(json!({ "body": oversized_body })),
    )
    .await;
    assert_eq!(oversized_status, StatusCode::BAD_REQUEST);

    let (limit_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/support/conversations?limit=101",
        Some(&admin_token),
        None,
    )
    .await;
    assert_eq!(limit_status, StatusCode::BAD_REQUEST);

    let (invalid_guest_status, _) = common::request(
        app.clone(),
        Method::PUT,
        "/api/support/conversation",
        Some(&support_token),
        Some(json!({ "status": "pending" })),
    )
    .await;
    assert_eq!(invalid_guest_status, StatusCode::BAD_REQUEST);

    let (closed_status, closed) = common::request(
        app.clone(),
        Method::PUT,
        "/api/support/conversation",
        Some(&support_token),
        Some(json!({ "status": "closed" })),
    )
    .await;
    assert_eq!(closed_status, StatusCode::OK, "{closed}");
    assert_eq!(closed["status"], "closed");

    let (guest_message_status, _) = common::request(
        app.clone(),
        Method::POST,
        "/api/support/messages",
        Some(&support_token),
        Some(json!({ "body": "Can you reopen this?" })),
    )
    .await;
    assert_eq!(guest_message_status, StatusCode::BAD_REQUEST);

    let (admin_message_status, _) = common::request(
        app.clone(),
        Method::POST,
        &format!("/api/admin/support/conversations/{conversation_id}/messages"),
        Some(&admin_token),
        Some(json!({ "body": "This should fail." })),
    )
    .await;
    assert_eq!(admin_message_status, StatusCode::BAD_REQUEST);

    let (reopen_status, reopened) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/support/conversations/{conversation_id}"),
        Some(&admin_token),
        Some(json!({ "status": "open" })),
    )
    .await;
    assert_eq!(reopen_status, StatusCode::OK, "{reopened}");
    assert_eq!(reopened["status"], "open");

    let (reopened_admin_message_status, reopened_admin_message) = common::request(
        app,
        Method::POST,
        &format!("/api/admin/support/conversations/{conversation_id}/messages"),
        Some(&admin_token),
        Some(json!({ "body": "We can help after reopening." })),
    )
    .await;
    assert_eq!(
        reopened_admin_message_status,
        StatusCode::OK,
        "{reopened_admin_message}"
    );
    assert_eq!(reopened_admin_message["author_kind"], "admin");
}

#[sqlx::test]
async fn customer_admin_and_support_tokens_cannot_cross_authentication_boundaries(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "boundary-admin", "secret123").await;
    let app = common::app(pool.clone());
    let admin_token = common::login(app.clone(), "boundary-admin", "secret123").await;
    let customer = register_customer(&app, "support-customer@example.com").await;
    let customer_token = customer["token"]
        .as_str()
        .expect("customer token")
        .to_string();
    let customer_id = customer["account"]["id"].as_i64().expect("customer id");
    let (support_token, _) =
        create_guest_conversation(&app, "Guest", "guest@example.com", "Support request").await;

    let (linked_status, linked) = common::request(
        app.clone(),
        Method::POST,
        "/api/support/conversations",
        Some(&customer_token),
        Some(json!({
            "guest_name": "Signed In Customer",
            "guest_email": "support-customer@example.com",
            "message": "I need account help.",
        })),
    )
    .await;
    assert_eq!(linked_status, StatusCode::CREATED, "{linked}");
    assert_eq!(
        linked["conversation"]["customer_account_id"].as_i64(),
        Some(customer_id)
    );

    for token in [&admin_token, &support_token, "not-a-customer-token"] {
        let (create_status, _) = common::request(
            app.clone(),
            Method::POST,
            "/api/support/conversations",
            Some(token),
            Some(json!({
                "guest_name": "Guest",
                "guest_email": "guest@example.com",
                "message": "Support request",
            })),
        )
        .await;
        assert_eq!(create_status, StatusCode::UNAUTHORIZED);
    }

    for token in [&customer_token, &admin_token] {
        let (support_status, _) = common::request(
            app.clone(),
            Method::GET,
            "/api/support/conversation",
            Some(token),
            None,
        )
        .await;
        assert_eq!(support_status, StatusCode::UNAUTHORIZED);
    }

    let (admin_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/support/conversations",
        Some(&support_token),
        None,
    )
    .await;
    assert_eq!(admin_status, StatusCode::UNAUTHORIZED);

    let (customer_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/account/me",
        Some(&support_token),
        None,
    )
    .await;
    assert_eq!(customer_status, StatusCode::UNAUTHORIZED);

    sqlx::query(
        "UPDATE support_sessions SET expires_at = now() - interval '1 second' WHERE token = $1",
    )
    .bind(&support_token)
    .execute(&pool)
    .await
    .expect("support session should expire");
    let (expired_status, _) = common::request(
        app,
        Method::GET,
        "/api/support/conversation",
        Some(&support_token),
        None,
    )
    .await;
    assert_eq!(expired_status, StatusCode::UNAUTHORIZED);
}

#[sqlx::test]
async fn stale_expected_status_cannot_reassign_or_overwrite_a_closed_conversation(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "race-admin", "secret123").await;
    let admin_id =
        sqlx::query_scalar::<_, i32>("SELECT id FROM admin_users WHERE username = 'race-admin'")
            .fetch_one(&pool)
            .await
            .expect("admin should exist");
    let app = common::app(pool.clone());
    let (_support_token, created) =
        create_guest_conversation(&app, "Guest", "guest@example.com", "Race request").await;
    let conversation_id = created["conversation"]["id"]
        .as_i64()
        .expect("conversation id") as i32;
    let stale_expected_status = created["conversation"]["status"]
        .as_str()
        .expect("conversation status")
        .to_string();

    assert!(
        db::close_support_conversation(&pool, conversation_id)
            .await
            .expect("conversation should close")
    );

    let changed = db::update_support_conversation(
        &pool,
        conversation_id,
        &stale_expected_status,
        None,
        true,
        Some(admin_id),
    )
    .await
    .expect("guarded update should run");
    assert!(!changed, "stale expected status must not update the row");

    let current = db::fetch_support_conversation(&pool, conversation_id)
        .await
        .expect("conversation should load")
        .expect("conversation should exist");
    assert_eq!(current.status, "closed");
    assert_eq!(current.assigned_admin_user_id, None);
}

#[sqlx::test]
async fn support_inbox_paginates_only_when_more_results_exist(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "pagination-admin", "secret123").await;
    let app = common::app(pool.clone());
    let admin_token = common::login(app.clone(), "pagination-admin", "secret123").await;
    let (_, newest) = create_guest_conversation(
        &app,
        "Newest Guest",
        "newest-pagination@example.com",
        "Newest request",
    )
    .await;
    let (_, middle) = create_guest_conversation(
        &app,
        "Middle Guest",
        "middle-pagination@example.com",
        "Middle request",
    )
    .await;
    let (_, oldest) = create_guest_conversation(
        &app,
        "Oldest Guest",
        "oldest-pagination@example.com",
        "Oldest request",
    )
    .await;
    let newest_id = newest["conversation"]["id"]
        .as_i64()
        .expect("newest conversation id") as i32;
    let middle_id = middle["conversation"]["id"]
        .as_i64()
        .expect("middle conversation id") as i32;
    let oldest_id = oldest["conversation"]["id"]
        .as_i64()
        .expect("oldest conversation id") as i32;

    for (conversation_id, seconds_ago) in [(newest_id, 1_i64), (middle_id, 2), (oldest_id, 3)] {
        sqlx::query(
            "UPDATE support_conversations SET last_message_at = now() - ($2::BIGINT * INTERVAL '1 second') WHERE id = $1",
        )
        .bind(conversation_id)
        .bind(seconds_ago)
        .execute(&pool)
        .await
        .expect("conversation timestamp should update");
    }

    let (first_status, first_page) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/support/conversations?status=open&limit=2",
        Some(&admin_token),
        None,
    )
    .await;
    assert_eq!(first_status, StatusCode::OK, "{first_page}");
    assert_eq!(first_page["items"].as_array().map(Vec::len), Some(2));
    assert_eq!(
        first_page["items"][0]["id"].as_i64(),
        Some(i64::from(newest_id))
    );
    assert_eq!(
        first_page["items"][1]["id"].as_i64(),
        Some(i64::from(middle_id))
    );
    assert_eq!(
        first_page["next_cursor"].as_i64(),
        Some(i64::from(middle_id))
    );

    let (second_status, second_page) = common::request(
        app,
        Method::GET,
        &format!("/api/admin/support/conversations?status=open&limit=2&before={middle_id}"),
        Some(&admin_token),
        None,
    )
    .await;
    assert_eq!(second_status, StatusCode::OK, "{second_page}");
    assert_eq!(second_page["items"].as_array().map(Vec::len), Some(1));
    assert_eq!(
        second_page["items"][0]["id"].as_i64(),
        Some(i64::from(oldest_id))
    );
    assert!(second_page["next_cursor"].is_null());
}

#[sqlx::test]
async fn initial_support_message_fetch_returns_latest_hundred_in_ascending_order(pool: PgPool) {
    let app = common::app(pool.clone());
    let (support_token, created) = create_guest_conversation(
        &app,
        "Message Guest",
        "message-window@example.com",
        "Initial message",
    )
    .await;
    let conversation_id = created["conversation"]["id"]
        .as_i64()
        .expect("conversation id") as i32;

    sqlx::query(
        r#"
        INSERT INTO support_messages (conversation_id, author_kind, body)
        SELECT $1, 'guest', 'Seed message ' || value::TEXT
        FROM generate_series(1, 100) AS series(value)
        "#,
    )
    .bind(conversation_id)
    .execute(&pool)
    .await
    .expect("messages should seed");

    let (status, body) = common::request(
        app,
        Method::GET,
        "/api/support/messages",
        Some(&support_token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let messages = body["messages"].as_array().expect("message list");
    assert_eq!(messages.len(), 100);
    assert_eq!(messages[0]["body"], "Seed message 1");
    assert_eq!(messages[99]["body"], "Seed message 100");
    assert!(messages.windows(2).all(|window| {
        window[0]["id"]
            .as_i64()
            .zip(window[1]["id"].as_i64())
            .is_some_and(|(previous, next)| previous < next)
    }));
}

#[sqlx::test]
async fn support_conversation_creation_rate_limit_normalizes_guest_email(pool: PgPool) {
    let app = common::app(pool);
    for guest_email in [
        "RateLimit@Example.com",
        "ratelimit@example.com",
        "RATELIMIT@example.com",
    ] {
        create_guest_conversation(&app, "Rate Limited Guest", guest_email, "Support request").await;
    }

    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/support/conversations",
        None,
        Some(json!({
            "guest_name": "Rate Limited Guest",
            "guest_email": "rAtElImIt@example.com",
            "message": "One more support request",
        })),
    )
    .await;
    assert_eq!(status, StatusCode::TOO_MANY_REQUESTS, "{body}");
    assert!(
        body.as_str()
            .is_some_and(|message| message.contains("Please wait"))
    );
}

#[sqlx::test]
async fn guest_support_message_rate_limit_allows_twenty_then_rejects_more(pool: PgPool) {
    let app = common::app(pool.clone());
    let (support_token, created) = create_guest_conversation(
        &app,
        "Message Rate Guest",
        "message-rate@example.com",
        "Initial message",
    )
    .await;
    let conversation_id = created["conversation"]["id"]
        .as_i64()
        .expect("conversation id") as i32;

    sqlx::query(
        r#"
        INSERT INTO support_messages (conversation_id, author_kind, body)
        SELECT $1, 'guest', 'Seed guest message'
        FROM generate_series(1, 18)
        "#,
    )
    .bind(conversation_id)
    .execute(&pool)
    .await
    .expect("messages should seed");

    let (twentieth_status, twentieth) = common::request(
        app.clone(),
        Method::POST,
        "/api/support/messages",
        Some(&support_token),
        Some(json!({ "body": "Twentieth guest message" })),
    )
    .await;
    assert_eq!(twentieth_status, StatusCode::OK, "{twentieth}");

    let (limited_status, limited) = common::request(
        app,
        Method::POST,
        "/api/support/messages",
        Some(&support_token),
        Some(json!({ "body": "Twenty-first guest message" })),
    )
    .await;
    assert_eq!(limited_status, StatusCode::TOO_MANY_REQUESTS, "{limited}");
    assert!(
        limited
            .as_str()
            .is_some_and(|message| message.contains("Please wait"))
    );
}
