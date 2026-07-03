use crate::models::*;
use anyhow::{Result, anyhow, bail};
use sqlx::PgPool;

const LAST_SUPER_ADMIN_MESSAGE: &str = "Cannot deactivate or demote the only active Super Admin.";

pub async fn count_admin_users(pool: &PgPool) -> Result<i64> {
    sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM admin_users
        "#,
    )
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn create_admin_user(
    pool: &PgPool,
    username: &str,
    display_name: &str,
    password_hash: &str,
    role_id: i32,
) -> Result<AdminUser> {
    let username = username.trim();
    let display_name = display_name.trim();

    if username.is_empty() || display_name.is_empty() {
        bail!("Username and display name are required.");
    }

    sqlx::query_as::<_, AdminUser>(
        r#"
        INSERT INTO admin_users (username, display_name, password_hash, role_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id,
                  username,
                  display_name,
                  role_id,
                  is_active,
                  created_at::text AS created_at,
                  updated_at::text AS updated_at
        "#,
    )
    .bind(username)
    .bind(display_name)
    .bind(password_hash)
    .bind(role_id)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn fetch_admin_user_by_username(
    pool: &PgPool,
    username: &str,
) -> Result<Option<AdminUserCredentials>> {
    sqlx::query_as::<_, AdminUserCredentials>(
        r#"
        SELECT admin_users.id,
               admin_users.username,
               admin_users.display_name,
               admin_users.password_hash,
               admin_users.role_id,
               roles.name AS role_name,
               roles.description AS role_description,
               roles.is_super_admin,
               admin_users.is_active,
               admin_users.created_at::text AS created_at,
               admin_users.updated_at::text AS updated_at
        FROM admin_users
        JOIN roles ON roles.id = admin_users.role_id
        WHERE lower(admin_users.username) = lower($1)
        "#,
    )
    .bind(username)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

pub async fn insert_admin_session(pool: &PgPool, admin_user_id: i32, token: &str) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO admin_sessions (token, admin_user_id, expires_at)
        VALUES ($1, $2, now() + interval '7 days')
        "#,
    )
    .bind(token)
    .bind(admin_user_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_admin_session(pool: &PgPool, token: &str) -> Result<()> {
    sqlx::query(
        r#"
        DELETE FROM admin_sessions
        WHERE token = $1
        "#,
    )
    .bind(token)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn authenticate_admin_session(
    pool: &PgPool,
    token: &str,
) -> Result<Option<AdminIdentity>> {
    sqlx::query_as::<_, AdminIdentity>(
        r#"
        SELECT admin_users.id AS user_id,
               admin_users.username,
               admin_users.display_name,
               admin_users.role_id,
               roles.name AS role_name,
               roles.is_super_admin
        FROM admin_sessions
        JOIN admin_users ON admin_users.id = admin_sessions.admin_user_id
        JOIN roles ON roles.id = admin_users.role_id
        WHERE admin_sessions.token = $1
          AND admin_sessions.expires_at > now()
          AND admin_users.is_active = TRUE
        "#,
    )
    .bind(token)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

pub async fn fetch_admin_users(pool: &PgPool) -> Result<Vec<AdminUser>> {
    sqlx::query_as::<_, AdminUser>(
        r#"
        SELECT id,
               username,
               display_name,
               role_id,
               is_active,
               created_at::text AS created_at,
               updated_at::text AS updated_at
        FROM admin_users
        ORDER BY username
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn fetch_admin_user_by_id(
    pool: &PgPool,
    admin_user_id: i32,
) -> Result<Option<AdminUserCredentials>> {
    sqlx::query_as::<_, AdminUserCredentials>(
        r#"
        SELECT admin_users.id,
               admin_users.username,
               admin_users.display_name,
               admin_users.password_hash,
               admin_users.role_id,
               roles.name AS role_name,
               roles.description AS role_description,
               roles.is_super_admin,
               admin_users.is_active,
               admin_users.created_at::text AS created_at,
               admin_users.updated_at::text AS updated_at
        FROM admin_users
        JOIN roles ON roles.id = admin_users.role_id
        WHERE admin_users.id = $1
        "#,
    )
    .bind(admin_user_id)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

pub async fn update_admin_user_profile(
    pool: &PgPool,
    admin_user_id: i32,
    display_name: &str,
    role_id: i32,
) -> Result<AdminUser> {
    let display_name = display_name.trim();

    if display_name.is_empty() {
        bail!("Display name is required.");
    }

    ensure_not_sole_active_super_admin(pool, admin_user_id, Some(role_id)).await?;

    sqlx::query_as::<_, AdminUser>(
        r#"
        UPDATE admin_users
        SET display_name = $1,
            role_id = $2,
            updated_at = now()
        WHERE id = $3
        RETURNING id,
                  username,
                  display_name,
                  role_id,
                  is_active,
                  created_at::text AS created_at,
                  updated_at::text AS updated_at
        "#,
    )
    .bind(display_name)
    .bind(role_id)
    .bind(admin_user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Admin user not found."))
}

pub async fn set_admin_user_active(
    pool: &PgPool,
    admin_user_id: i32,
    is_active: bool,
) -> Result<AdminUser> {
    if !is_active {
        ensure_not_sole_active_super_admin(pool, admin_user_id, None).await?;
    }

    let user = sqlx::query_as::<_, AdminUser>(
        r#"
        UPDATE admin_users
        SET is_active = $1,
            updated_at = now()
        WHERE id = $2
        RETURNING id,
                  username,
                  display_name,
                  role_id,
                  is_active,
                  created_at::text AS created_at,
                  updated_at::text AS updated_at
        "#,
    )
    .bind(is_active)
    .bind(admin_user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Admin user not found."))?;

    if !is_active {
        delete_admin_sessions_for_user(pool, admin_user_id).await?;
    }

    Ok(user)
}

pub async fn update_admin_user_password(
    pool: &PgPool,
    admin_user_id: i32,
    password_hash: &str,
) -> Result<()> {
    let result = sqlx::query(
        r#"
        UPDATE admin_users
        SET password_hash = $1,
            updated_at = now()
        WHERE id = $2
        "#,
    )
    .bind(password_hash)
    .bind(admin_user_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        bail!("Admin user not found.");
    }

    Ok(())
}

pub async fn delete_admin_sessions_for_user(pool: &PgPool, admin_user_id: i32) -> Result<()> {
    sqlx::query(
        r#"
        DELETE FROM admin_sessions
        WHERE admin_user_id = $1
        "#,
    )
    .bind(admin_user_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_expired_admin_sessions(pool: &PgPool) -> Result<()> {
    sqlx::query(
        r#"
        DELETE FROM admin_sessions
        WHERE expires_at <= now()
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

async fn count_active_super_admins_excluding(pool: &PgPool, exclude_user_id: i32) -> Result<i64> {
    sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM admin_users
        JOIN roles ON roles.id = admin_users.role_id
        WHERE roles.is_super_admin = TRUE
          AND admin_users.is_active = TRUE
          AND admin_users.id != $1
        "#,
    )
    .bind(exclude_user_id)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

async fn ensure_not_sole_active_super_admin(
    pool: &PgPool,
    admin_user_id: i32,
    demote_to_role_id: Option<i32>,
) -> Result<()> {
    let current = sqlx::query_as::<_, (bool, bool)>(
        r#"
        SELECT admin_users.is_active, roles.is_super_admin
        FROM admin_users
        JOIN roles ON roles.id = admin_users.role_id
        WHERE admin_users.id = $1
        "#,
    )
    .bind(admin_user_id)
    .fetch_optional(pool)
    .await?;

    let Some((is_active, is_super_admin)) = current else {
        bail!("Admin user not found.");
    };

    if !is_active || !is_super_admin {
        return Ok(());
    }

    if let Some(role_id) = demote_to_role_id {
        let still_super_admin = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT is_super_admin
            FROM roles
            WHERE id = $1
            "#,
        )
        .bind(role_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| anyhow!("Role not found."))?;

        if still_super_admin {
            return Ok(());
        }
    }

    let remaining = count_active_super_admins_excluding(pool, admin_user_id).await?;
    if remaining == 0 {
        bail!(LAST_SUPER_ADMIN_MESSAGE);
    }

    Ok(())
}
