use crate::models::*;
use anyhow::{Result, anyhow, bail};
use sqlx::PgPool;
use std::collections::HashMap;

#[derive(Debug, Clone, Copy)]
pub enum PermissionAction {
    Create,
    Read,
    Update,
    Delete,
}

pub async fn fetch_permissions(pool: &PgPool) -> Result<PermissionsPayload> {
    let roles = sqlx::query_as::<_, Role>(
        r#"
        SELECT id, name, description, is_super_admin, created_at::text AS created_at
        FROM roles
        ORDER BY is_super_admin DESC, name
        "#,
    )
    .fetch_all(pool)
    .await?;

    let pages = sqlx::query_as::<_, PermissionPage>(
        r#"
        SELECT id, slug, name, description
        FROM permission_pages
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let permission_rows = sqlx::query_as::<_, RolePagePermission>(
        r#"
        SELECT role_id, page_id, can_create, can_read, can_update, can_delete
        FROM role_page_permissions
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut permission_map: HashMap<(i32, i32), RolePagePermission> = permission_rows
        .into_iter()
        .map(|permission| ((permission.role_id, permission.page_id), permission))
        .collect();

    let mut permissions = Vec::with_capacity(roles.len() * pages.len());
    for role in &roles {
        for page in &pages {
            if role.is_super_admin {
                permissions.push(RolePagePermission {
                    role_id: role.id,
                    page_id: page.id,
                    can_create: true,
                    can_read: true,
                    can_update: true,
                    can_delete: true,
                });
                continue;
            }

            permissions.push(permission_map.remove(&(role.id, page.id)).unwrap_or(
                RolePagePermission {
                    role_id: role.id,
                    page_id: page.id,
                    can_create: false,
                    can_read: false,
                    can_update: false,
                    can_delete: false,
                },
            ));
        }
    }

    Ok(PermissionsPayload {
        roles,
        pages,
        permissions,
    })
}

pub async fn role_has_page_permission(
    pool: &PgPool,
    role_id: i32,
    page_slug: &str,
    action: PermissionAction,
) -> Result<bool> {
    let role_is_super_admin = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT is_super_admin
        FROM roles
        WHERE id = $1
        "#,
    )
    .bind(role_id)
    .fetch_optional(pool)
    .await?;

    if role_is_super_admin.unwrap_or(false) {
        return Ok(true);
    }

    let permission = sqlx::query_as::<_, RolePagePermission>(
        r#"
        SELECT role_page_permissions.role_id,
               role_page_permissions.page_id,
               role_page_permissions.can_create,
               role_page_permissions.can_read,
               role_page_permissions.can_update,
               role_page_permissions.can_delete
        FROM role_page_permissions
        JOIN permission_pages ON permission_pages.id = role_page_permissions.page_id
        WHERE role_page_permissions.role_id = $1
          AND permission_pages.slug = $2
        "#,
    )
    .bind(role_id)
    .bind(page_slug)
    .fetch_optional(pool)
    .await?;

    Ok(match permission {
        Some(permission) => match action {
            PermissionAction::Create => permission.can_create,
            PermissionAction::Read => permission.can_read,
            PermissionAction::Update => permission.can_update,
            PermissionAction::Delete => permission.can_delete,
        },
        None => false,
    })
}

pub async fn fetch_role(pool: &PgPool, role_id: i32) -> Result<Role> {
    sqlx::query_as::<_, Role>(
        r#"
        SELECT id, name, description, is_super_admin, created_at::text AS created_at
        FROM roles
        WHERE id = $1
        "#,
    )
    .bind(role_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Role not found."))
}

pub async fn fetch_super_admin_role(pool: &PgPool) -> Result<Role> {
    sqlx::query_as::<_, Role>(
        r#"
        SELECT id, name, description, is_super_admin, created_at::text AS created_at
        FROM roles
        WHERE is_super_admin = TRUE
        ORDER BY id
        LIMIT 1
        "#,
    )
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Super Admin role not found."))
}

pub async fn fetch_role_page_permissions(
    pool: &PgPool,
    role_id: i32,
) -> Result<Vec<RolePagePermission>> {
    let role = fetch_role(pool, role_id).await?;
    let pages = sqlx::query_as::<_, PermissionPage>(
        r#"
        SELECT id, slug, name, description
        FROM permission_pages
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    if role.is_super_admin {
        return Ok(pages
            .into_iter()
            .map(|page| RolePagePermission {
                role_id,
                page_id: page.id,
                can_create: true,
                can_read: true,
                can_update: true,
                can_delete: true,
            })
            .collect());
    }

    let permission_rows = sqlx::query_as::<_, RolePagePermission>(
        r#"
        SELECT role_id, page_id, can_create, can_read, can_update, can_delete
        FROM role_page_permissions
        WHERE role_id = $1
        "#,
    )
    .bind(role_id)
    .fetch_all(pool)
    .await?;

    let mut permission_map: HashMap<i32, RolePagePermission> = permission_rows
        .into_iter()
        .map(|permission| (permission.page_id, permission))
        .collect();

    Ok(pages
        .into_iter()
        .map(|page| {
            permission_map
                .remove(&page.id)
                .unwrap_or(RolePagePermission {
                    role_id,
                    page_id: page.id,
                    can_create: false,
                    can_read: false,
                    can_update: false,
                    can_delete: false,
                })
        })
        .collect())
}

pub async fn create_role(pool: &PgPool, input: &CreateRoleInput) -> Result<Role> {
    let name = input.name.trim();
    let description = input.description.trim();

    validate_role_input(name)?;

    let mut tx = pool.begin().await?;

    let role = sqlx::query_as::<_, Role>(
        r#"
        INSERT INTO roles (name, description, is_super_admin)
        VALUES ($1, $2, FALSE)
        RETURNING id, name, description, is_super_admin, created_at::text AS created_at
        "#,
    )
    .bind(name)
    .bind(description)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO role_page_permissions (role_id, page_id)
        SELECT $1, id
        FROM permission_pages
        ON CONFLICT (role_id, page_id) DO NOTHING
        "#,
    )
    .bind(role.id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(role)
}

pub async fn update_role(pool: &PgPool, role_id: i32, input: &UpdateRoleInput) -> Result<Role> {
    let name = input.name.trim();
    let description = input.description.trim();

    validate_role_input(name)?;
    ensure_role_is_editable(pool, role_id).await?;

    sqlx::query_as::<_, Role>(
        r#"
        UPDATE roles
        SET name = $1, description = $2
        WHERE id = $3
        RETURNING id, name, description, is_super_admin, created_at::text AS created_at
        "#,
    )
    .bind(name)
    .bind(description)
    .bind(role_id)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn delete_role(pool: &PgPool, role_id: i32) -> Result<()> {
    ensure_role_is_editable(pool, role_id).await?;

    sqlx::query(
        r#"
        DELETE FROM roles
        WHERE id = $1
        "#,
    )
    .bind(role_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_role_page_permission(
    pool: &PgPool,
    input: &UpdateRolePagePermissionInput,
) -> Result<RolePagePermission> {
    ensure_role_is_editable(pool, input.role_id).await?;

    let page_exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(SELECT 1 FROM permission_pages WHERE id = $1)
        "#,
    )
    .bind(input.page_id)
    .fetch_one(pool)
    .await?;

    if !page_exists {
        bail!("Permission page does not exist.");
    }

    let (can_create, can_read, can_update, can_delete) = normalize_permission_flags(input);

    sqlx::query_as::<_, RolePagePermission>(
        r#"
        INSERT INTO role_page_permissions
            (role_id, page_id, can_create, can_read, can_update, can_delete)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (role_id, page_id) DO UPDATE SET
            can_create = EXCLUDED.can_create,
            can_read = EXCLUDED.can_read,
            can_update = EXCLUDED.can_update,
            can_delete = EXCLUDED.can_delete
        RETURNING role_id, page_id, can_create, can_read, can_update, can_delete
        "#,
    )
    .bind(input.role_id)
    .bind(input.page_id)
    .bind(can_create)
    .bind(can_read)
    .bind(can_update)
    .bind(can_delete)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

fn validate_role_input(name: &str) -> Result<()> {
    if name.is_empty() {
        bail!("Role name is required.");
    }

    if name.eq_ignore_ascii_case("Super Admin") {
        bail!("Super Admin is reserved and cannot be recreated.");
    }

    Ok(())
}

async fn ensure_role_is_editable(pool: &PgPool, role_id: i32) -> Result<()> {
    let role = sqlx::query_as::<_, (bool,)>(
        r#"
        SELECT is_super_admin
        FROM roles
        WHERE id = $1
        "#,
    )
    .bind(role_id)
    .fetch_optional(pool)
    .await?;

    let Some((is_super_admin,)) = role else {
        bail!("Role does not exist.");
    };

    if is_super_admin {
        bail!("Super Admin is reserved and always has full access.");
    }

    Ok(())
}

fn normalize_permission_flags(input: &UpdateRolePagePermissionInput) -> (bool, bool, bool, bool) {
    let can_read = input.can_read || input.can_create || input.can_update || input.can_delete;

    (
        can_read && input.can_create,
        can_read,
        can_read && input.can_update,
        can_read && input.can_delete,
    )
}

#[cfg(test)]
mod permission_tests {
    use super::*;

    fn permission_input(
        can_create: bool,
        can_read: bool,
        can_update: bool,
        can_delete: bool,
    ) -> UpdateRolePagePermissionInput {
        UpdateRolePagePermissionInput {
            role_id: 2,
            page_id: 7,
            can_create,
            can_read,
            can_update,
            can_delete,
        }
    }

    #[test]
    fn permission_write_grants_force_read_access() {
        let input = permission_input(true, false, true, true);

        assert_eq!(normalize_permission_flags(&input), (true, true, true, true));
    }

    #[test]
    fn permission_without_read_or_writes_blocks_page_access() {
        let input = permission_input(false, false, false, false);

        assert_eq!(
            normalize_permission_flags(&input),
            (false, false, false, false)
        );
    }
}
