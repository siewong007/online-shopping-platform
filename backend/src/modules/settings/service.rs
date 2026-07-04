use anyhow::Result;
use sqlx::PgPool;

use crate::modules::{audit, auth::model::AdminIdentity};

use super::{dto::UpdateSystemSettingInput, model::SystemSetting, repository};

pub async fn fetch_system_settings(pool: &PgPool) -> Result<Vec<SystemSetting>> {
    repository::fetch_system_settings(pool).await
}

pub async fn update_system_setting(
    pool: &PgPool,
    identity: &AdminIdentity,
    key: &str,
    input: &UpdateSystemSettingInput,
) -> Result<SystemSetting> {
    let setting = repository::update_system_setting(pool, key, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "setting",
        &setting.key,
        &setting.value,
    )
    .await;
    Ok(setting)
}
