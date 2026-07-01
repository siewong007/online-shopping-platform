use anyhow::Result;
use sqlx::PgPool;

use super::{dto::UpdateSystemSettingInput, model::SystemSetting};

pub async fn fetch_system_settings(pool: &PgPool) -> Result<Vec<SystemSetting>> {
    crate::db::fetch_system_settings(pool).await
}

pub async fn update_system_setting(
    pool: &PgPool,
    key: &str,
    input: &UpdateSystemSettingInput,
) -> Result<SystemSetting> {
    crate::db::update_system_setting(pool, key, input).await
}
