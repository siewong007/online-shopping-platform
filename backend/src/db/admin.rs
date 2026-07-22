use crate::models::*;
use anyhow::{Result, anyhow, bail};
use sqlx::{PgPool, Postgres, Transaction};

const LAST_SUPER_ADMIN_MESSAGE: &str = "Cannot deactivate or demote the only active Super Admin.";
pub const ADMIN_MANAGEMENT_LOCK_KEY: i64 = 7_261_001;
const SUPER_ADMIN_MANAGEMENT_DENIED: &str = "Only a Super Admin can manage a Super Admin account.";
const SUPER_ADMIN_ASSIGNMENT_DENIED: &str = "Only a Super Admin can assign the Super Admin role.";
const ADMIN_MANAGEMENT_PERMISSION_REVOKED: &str =
    "This admin role does not have enough admin user privileges.";

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
    actor_user_id: i32,
) -> Result<AdminUser> {
    let display_name = display_name.trim();

    if display_name.is_empty() {
        bail!("Display name is required.");
    }

    let mut tx = pool.begin().await?;
    acquire_admin_management_lock(&mut tx).await?;
    let actor_is_super_admin = lock_current_actor_is_super_admin(&mut tx, actor_user_id).await?;
    ensure_current_actor_can_manage_admin_users(&mut tx, actor_user_id).await?;
    let (target_is_active, target_is_super_admin) =
        lock_admin_user_for_management(&mut tx, admin_user_id).await?;
    ensure_super_admin_management_allowed(
        &mut tx,
        target_is_super_admin,
        Some(role_id),
        actor_is_super_admin,
    )
    .await?;
    ensure_not_sole_active_super_admin(
        &mut tx,
        admin_user_id,
        target_is_active,
        target_is_super_admin,
        Some(role_id),
    )
    .await?;

    let user = sqlx::query_as::<_, AdminUser>(
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
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| anyhow!("Admin user not found."))?;

    tx.commit().await?;
    Ok(user)
}

pub async fn set_admin_user_active(
    pool: &PgPool,
    admin_user_id: i32,
    is_active: bool,
    actor_user_id: i32,
) -> Result<AdminUser> {
    let mut tx = pool.begin().await?;
    acquire_admin_management_lock(&mut tx).await?;
    let actor_is_super_admin = lock_current_actor_is_super_admin(&mut tx, actor_user_id).await?;
    ensure_current_actor_can_manage_admin_users(&mut tx, actor_user_id).await?;
    let (target_is_active, target_is_super_admin) =
        lock_admin_user_for_management(&mut tx, admin_user_id).await?;
    ensure_super_admin_management_allowed(
        &mut tx,
        target_is_super_admin,
        None,
        actor_is_super_admin,
    )
    .await?;

    if !is_active {
        ensure_not_sole_active_super_admin(
            &mut tx,
            admin_user_id,
            target_is_active,
            target_is_super_admin,
            None,
        )
        .await?;
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
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| anyhow!("Admin user not found."))?;

    if !is_active {
        sqlx::query(
            r#"
            DELETE FROM admin_sessions
            WHERE admin_user_id = $1
            "#,
        )
        .bind(admin_user_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(user)
}

pub async fn reset_admin_user_password(
    pool: &PgPool,
    admin_user_id: i32,
    password_hash: &str,
    actor_user_id: i32,
) -> Result<()> {
    let mut tx = pool.begin().await?;
    acquire_admin_management_lock(&mut tx).await?;
    let actor_is_super_admin = lock_current_actor_is_super_admin(&mut tx, actor_user_id).await?;
    ensure_current_actor_can_manage_admin_users(&mut tx, actor_user_id).await?;
    let (_, target_is_super_admin) = lock_admin_user_for_management(&mut tx, admin_user_id).await?;
    ensure_super_admin_management_allowed(
        &mut tx,
        target_is_super_admin,
        None,
        actor_is_super_admin,
    )
    .await?;

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
    .execute(&mut *tx)
    .await?;

    if result.rows_affected() == 0 {
        bail!("Admin user not found.");
    }

    sqlx::query(
        r#"
        DELETE FROM admin_sessions
        WHERE admin_user_id = $1
        "#,
    )
    .bind(admin_user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
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

pub async fn acquire_admin_management_lock(tx: &mut Transaction<'_, Postgres>) -> Result<()> {
    sqlx::query("SELECT pg_advisory_xact_lock($1)")
        .bind(ADMIN_MANAGEMENT_LOCK_KEY)
        .execute(&mut **tx)
        .await?;
    Ok(())
}

async fn lock_admin_user_for_management(
    tx: &mut Transaction<'_, Postgres>,
    admin_user_id: i32,
) -> Result<(bool, bool)> {
    sqlx::query_as::<_, (bool, bool)>(
        r#"
        SELECT admin_users.is_active, roles.is_super_admin
        FROM admin_users
        JOIN roles ON roles.id = admin_users.role_id
        WHERE admin_users.id = $1
        FOR UPDATE OF admin_users
        "#,
    )
    .bind(admin_user_id)
    .fetch_optional(&mut **tx)
    .await?
    .ok_or_else(|| anyhow!("Admin user not found."))
}

async fn lock_current_actor_is_super_admin(
    tx: &mut Transaction<'_, Postgres>,
    actor_user_id: i32,
) -> Result<bool> {
    let (is_active, is_super_admin) = lock_admin_user_for_management(tx, actor_user_id).await?;
    if !is_active {
        bail!("Admin session is no longer valid.");
    }

    Ok(is_super_admin)
}

async fn ensure_current_actor_can_manage_admin_users(
    tx: &mut Transaction<'_, Postgres>,
    actor_user_id: i32,
) -> Result<()> {
    let is_allowed = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM admin_users
            JOIN roles ON roles.id = admin_users.role_id
            LEFT JOIN (
                SELECT role_page_permissions.role_id,
                       role_page_permissions.can_update
                FROM role_page_permissions
                JOIN permission_pages
                    ON permission_pages.id = role_page_permissions.page_id
                WHERE permission_pages.slug = 'admin-permissions'
            ) AS admin_permissions ON admin_permissions.role_id = roles.id
            WHERE admin_users.id = $1
              AND (
                  roles.is_super_admin = TRUE
                  OR COALESCE(admin_permissions.can_update, FALSE) = TRUE
              )
        )
        "#,
    )
    .bind(actor_user_id)
    .fetch_one(&mut **tx)
    .await?;

    if !is_allowed {
        bail!(ADMIN_MANAGEMENT_PERMISSION_REVOKED);
    }

    Ok(())
}

async fn ensure_super_admin_management_allowed(
    tx: &mut Transaction<'_, Postgres>,
    target_is_super_admin: bool,
    requested_role_id: Option<i32>,
    actor_is_super_admin: bool,
) -> Result<()> {
    if actor_is_super_admin {
        return Ok(());
    }

    if target_is_super_admin {
        bail!(SUPER_ADMIN_MANAGEMENT_DENIED);
    }

    if let Some(role_id) = requested_role_id {
        let role_is_super_admin = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT is_super_admin
            FROM roles
            WHERE id = $1
            "#,
        )
        .bind(role_id)
        .fetch_optional(&mut **tx)
        .await?
        .ok_or_else(|| anyhow!("Role not found."))?;

        if role_is_super_admin {
            bail!(SUPER_ADMIN_ASSIGNMENT_DENIED);
        }
    }

    Ok(())
}

async fn count_active_super_admins_excluding(
    tx: &mut Transaction<'_, Postgres>,
    exclude_user_id: i32,
) -> Result<i64> {
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
    .fetch_one(&mut **tx)
    .await
    .map_err(Into::into)
}

async fn ensure_not_sole_active_super_admin(
    tx: &mut Transaction<'_, Postgres>,
    admin_user_id: i32,
    is_active: bool,
    is_super_admin: bool,
    demote_to_role_id: Option<i32>,
) -> Result<()> {
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
        .fetch_optional(&mut **tx)
        .await?
        .ok_or_else(|| anyhow!("Role not found."))?;

        if still_super_admin {
            return Ok(());
        }
    }

    let remaining = count_active_super_admins_excluding(tx, admin_user_id).await?;
    if remaining == 0 {
        bail!(LAST_SUPER_ADMIN_MESSAGE);
    }

    Ok(())
}
