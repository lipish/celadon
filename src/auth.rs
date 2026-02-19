//! 用户注册、登录与 token 鉴权

use crate::common::AppResult;
use crate::db::Pool;
use bcrypt::{hash, verify, DEFAULT_COST};
use sqlx::Row;
use std::io;
use uuid::Uuid;

fn err_msg(s: &str) -> Box<dyn std::error::Error + Send + Sync> {
    Box::new(io::Error::new(io::ErrorKind::Other, s))
}

/// 注册：写入 users，返回 user_id
pub async fn register(pool: &Pool, email: &str, password: &str) -> AppResult<Uuid> {
    let password_hash = hash(password, DEFAULT_COST).map_err(|e| format!("密码哈希失败: {e}"))?;
    let id = Uuid::new_v4();
    let email = email.trim().to_lowercase();
    let row = sqlx::query("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id")
        .bind(id)
        .bind(&email)
        .bind(&password_hash)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("unique") || msg.contains("duplicate") {
                "邮箱已被注册".to_string()
            } else {
                format!("注册失败: {e}")
            }
        })?;
    Ok(row.get::<Uuid, _>("id"))
}

/// 登录：校验密码，写入 user_tokens（含过期时间），返回 (user_id, token)
pub async fn login(pool: &Pool, email: &str, password: &str) -> AppResult<(Uuid, Uuid)> {
    let email = email.trim().to_lowercase();
    let row = sqlx::query_as::<_, (Uuid, String)>(
        "SELECT id, password_hash FROM users WHERE email = $1",
    )
    .bind(&email)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("登录查询失败: {e}"))?
    .ok_or_else(|| err_msg("邮箱或密码错误"))?;
    let (user_id, password_hash) = row;
    let ok = verify(password, &password_hash).unwrap_or(false);
    if !ok {
        return Err("邮箱或密码错误".into());
    }
    let token = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO user_tokens (token, user_id, expires_at) VALUES ($1, $2, now() + INTERVAL '7 days')",
    )
    .bind(token)
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(|e| format!("写入 token 失败: {e}"))?;
    Ok((user_id, token))
}

/// 校验 Bearer token（含过期检查），返回 user_id
pub async fn verify_token(pool: &Pool, token: Uuid) -> AppResult<Uuid> {
    let row = sqlx::query_as::<_, (Uuid,)>(
        "SELECT user_id FROM user_tokens WHERE token = $1 AND expires_at > now()",
    )
    .bind(token)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("token 校验失败: {e}"))?
    .ok_or_else(|| err_msg("无效或过期的登录状态，请重新登录"))?;
    Ok(row.0)
}

/// 登出：删除指定 token
pub async fn logout(pool: &Pool, token: Uuid) -> AppResult<()> {
    sqlx::query("DELETE FROM user_tokens WHERE token = $1")
        .bind(token)
        .execute(pool)
        .await
        .map_err(|e| format!("登出失败: {e}"))?;
    Ok(())
}

/// 获取用户邮箱
pub async fn get_user_email(pool: &Pool, user_id: Uuid) -> AppResult<String> {
    let row = sqlx::query_as::<_, (String,)>("SELECT email FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("查询用户失败: {e}"))?
        .ok_or_else(|| err_msg("用户不存在"))?;
    Ok(row.0)
}
