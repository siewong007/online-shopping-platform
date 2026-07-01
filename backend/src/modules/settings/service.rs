use anyhow::Result;
use sqlx::PgPool;

use super::{dto::UpdateSystemSettingInput, model::SystemSetting, repository};

pub async fn fetch_system_settings(pool: &PgPool) -> Result<Vec<SystemSetting>> {
    repository::fetch_system_settings(pool).await
}

pub async fn update_system_setting(
    pool: &PgPool,
    key: &str,
    input: &UpdateSystemSettingInput,
) -> Result<SystemSetting> {
    repository::update_system_setting(pool, key, input).await
}
