//! PostgreSQL 连接、迁移与按用户的状态存储

use crate::common::AppResult;
use crate::models::StateStore;
use serde_json::{Value, json};
use sqlx::postgres::PgPoolOptions;
use sqlx::types::Json;
use sqlx::PgPool;
use sqlx::Row;
use std::time::Duration;
use uuid::Uuid;

pub type Pool = PgPool;

/// 从 DATABASE_URL 创建连接池并执行迁移
pub async fn init_pool(database_url: &str) -> Result<Pool, String> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
        .map_err(|e| format!("数据库连接失败: {e}"))?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| format!("执行迁移失败: {e}"))?;

    Ok(pool)
}

/// 读取对应用户的 state（无则返回默认）
pub async fn load_user_state(pool: &Pool, user_id: Uuid) -> AppResult<StateStore> {
    let row = sqlx::query("SELECT state_json FROM user_state WHERE user_id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("读取用户状态失败: {e}"))?;
    let state: StateStore = match row {
        Some(r) => {
            let json: Json<Value> = r.get("state_json");
            serde_json::from_value(json.0).map_err(|e| format!("反序列化状态失败: {e}"))?
        }
        None => StateStore::default(),
    };
    Ok(state)
}

/// 写入对应用户的 state
pub async fn save_user_state(pool: &Pool, user_id: Uuid, state: &StateStore) -> AppResult<()> {
    let json = serde_json::to_value(state).map_err(|e| format!("序列化状态失败: {e}"))?;
    sqlx::query(
        "INSERT INTO user_state (user_id, state_json, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (user_id) DO UPDATE SET state_json = $2, updated_at = now()",
    )
    .bind(user_id)
    .bind(json)
    .execute(pool)
    .await
    .map_err(|e| format!("写入用户状态失败: {e}"))?;
    Ok(())
}

/// 获取全局系统设置
pub async fn get_system_setting(pool: &Pool, key: &str) -> AppResult<Option<String>> {
    let row = sqlx::query("SELECT value FROM system_settings WHERE key = $1")
        .bind(key)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("读取系统设置失败: {e}"))?;
    Ok(row.map(|r| r.get("value")))
}

/// 更新或创建全局系统设置
pub async fn set_system_setting(pool: &Pool, key: &str, value: &str) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await
    .map_err(|e| format!("执行系统设置更新失败: {e}"))?;
    Ok(())
}

/// 获取所有系统设置
pub async fn list_system_settings(pool: &Pool) -> AppResult<Value> {
    let rows = sqlx::query("SELECT key, value, description FROM system_settings")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("读取所有系统设置失败: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(json!({
            "key": row.get::<String, _>("key"),
            "value": row.get::<String, _>("value"),
            "description": row.get::<Option<String>, _>("description"),
        }));
    }
    Ok(Value::Array(result))
}
