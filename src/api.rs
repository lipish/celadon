use crate::auth;
use crate::common::AppResult;
use crate::db;
use crate::service::CeladonService;
use axum::extract::{Path, State};
use axum::http::header::AUTHORIZATION;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{Value, json};
use std::path::PathBuf;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

#[derive(Clone)]
struct ApiState {
    storage_dir: PathBuf,
    pool: Option<db::Pool>,
}

#[derive(Debug)]
struct ApiError(String);

impl From<Box<dyn std::error::Error + Send + Sync>> for ApiError {
    fn from(value: Box<dyn std::error::Error + Send + Sync>) -> Self {
        Self(value.to_string())
    }
}

impl From<String> for ApiError {
    fn from(value: String) -> Self {
        Self(value)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": self.0
            })),
        )
            .into_response()
    }
}

type ApiResult = Result<Json<Value>, ApiError>;

#[derive(Deserialize)]
struct StartRequest {
    idea: String,
    name: Option<String>,
}

#[derive(Deserialize)]
struct IdeaRequest {
    session_id: String,
    text: String,
}

#[derive(Deserialize)]
struct SessionRequest {
    session_id: String,
}

#[derive(Deserialize)]
struct DevRunRequest {
    session_id: String,
    instruction: Option<String>,
    dry_run: Option<bool>,
}

#[derive(Deserialize)]
struct DeployRequest {
    session_id: String,
    env: Option<String>,
}

#[derive(Deserialize)]
struct RegisterRequest {
    email: String,
    password: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Deserialize)]
struct WaitingListRequest {
    email: String,
    idea: String,
}

pub async fn serve(storage_dir: PathBuf, port: u16, pool: Option<db::Pool>) -> AppResult<()> {
    let state = ApiState {
        storage_dir,
        pool,
    };
    let mut app = Router::new()
        .route("/api/health", get(health))
        .route("/api/start", post(start))
        .route("/api/waiting-list", post(join_waiting_list))
        .route("/api/idea", post(idea))
        .route("/api/prd/generate", post(generate_prd))
        .route("/api/dev/run", post(run_dev))
        .route("/api/deploy", post(run_deploy))
        .route("/api/projects", get(list_projects))
        .route("/api/status/:session_id", get(status));
    if state.pool.is_some() {
        app = app
            .route("/api/register", post(register))
            .route("/api/login", post(login))
            .route("/api/me", get(me))
            .route("/api/logout", post(logout));
    }
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = app.with_state(state).layer(cors);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
    println!("Celadon API running on http://localhost:{port}");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

/// 从请求头解析 "Bearer <uuid>"，失败返回 None
fn bearer_token_from_headers(headers: &axum::http::HeaderMap) -> Option<Uuid> {
    let v = headers.get(AUTHORIZATION)?.to_str().ok()?;
    let prefix = "Bearer ";
    let token_str = v.strip_prefix(prefix)?.trim();
    Uuid::parse_str(token_str).ok()
}

/// 有 DB 时要求 Bearer token 并返回 user_id；无 DB 时返回 None
async fn resolve_user_id(
    state: &ApiState,
    headers: &axum::http::HeaderMap,
) -> Result<Option<Uuid>, ApiError> {
    let pool = match &state.pool {
        None => return Ok(None),
        Some(p) => p,
    };
    let token = bearer_token_from_headers(headers)
        .ok_or_else(|| ApiError("需要登录".to_string()))?;
    let user_id = auth::verify_token(pool, token)
        .await
        .map_err(|e| ApiError(e.to_string()))?;
    Ok(Some(user_id))
}

async fn make_service(
    state: &ApiState,
    user_id: Option<Uuid>,
) -> Result<CeladonService, ApiError> {
    match (&state.pool, user_id) {
        (Some(pool), Some(uid)) => CeladonService::load_with_db(
            state.storage_dir.clone(),
            pool.clone(),
            uid,
        )
        .await
        .map_err(ApiError::from),
        _ => CeladonService::load(state.storage_dir.clone()).map_err(ApiError::from),
    }
}

async fn register(
    State(state): State<ApiState>,
    Json(req): Json<RegisterRequest>,
) -> ApiResult {
    let pool = state.pool.as_ref().ok_or_else(|| ApiError("未启用用户系统".to_string()))?;
    let user_id = auth::register(pool, &req.email, &req.password)
        .await
        .map_err(|e| ApiError(e.to_string()))?;
    let (_, token) = auth::login(pool, &req.email, &req.password)
        .await
        .map_err(|e| ApiError(e.to_string()))?;
    Ok(Json(json!({
        "user_id": user_id.to_string(),
        "token": token.to_string(),
    })))
}

async fn login(State(state): State<ApiState>, Json(req): Json<LoginRequest>) -> ApiResult {
    let pool = state.pool.as_ref().ok_or_else(|| ApiError("未启用用户系统".to_string()))?;
    let (user_id, token) = auth::login(pool, &req.email, &req.password)
        .await
        .map_err(|e| ApiError(e.to_string()))?;
    Ok(Json(json!({
        "user_id": user_id.to_string(),
        "token": token.to_string(),
    })))
}

async fn list_projects(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
) -> ApiResult {
    let user_id = resolve_user_id(&state, &headers).await?;
    let service = make_service(&state, user_id).await?;
    let out = service.list_projects().map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn start(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<StartRequest>,
) -> ApiResult {
    let user_id = resolve_user_id(&state, &headers).await?;
    let mut service = make_service(&state, user_id).await?;
    let out = service.start(req.idea, req.name).await.map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn idea(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<IdeaRequest>,
) -> ApiResult {
    let user_id = resolve_user_id(&state, &headers).await?;
    let mut service = make_service(&state, user_id).await?;
    let out = service
        .append_idea(&req.session_id, req.text)
        .await
        .map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn generate_prd(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<SessionRequest>,
) -> ApiResult {
    let user_id = resolve_user_id(&state, &headers).await?;
    let mut service = make_service(&state, user_id).await?;
    let out = service
        .generate_prd(&req.session_id)
        .await
        .map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn run_dev(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<DevRunRequest>,
) -> ApiResult {
    let user_id = resolve_user_id(&state, &headers).await?;
    let mut service = make_service(&state, user_id).await?;
    let out = service
        .run_dev(
            &req.session_id,
            req.instruction,
            req.dry_run.unwrap_or_default(),
        )
        .await
        .map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn run_deploy(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<DeployRequest>,
) -> ApiResult {
    let user_id = resolve_user_id(&state, &headers).await?;
    let mut service = make_service(&state, user_id).await?;
    let out = service
        .run_deploy(
            &req.session_id,
            req.env.unwrap_or_else(|| "staging".to_string()),
        )
        .await
        .map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn status(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Path(session_id): Path<String>,
) -> ApiResult {
    let user_id = resolve_user_id(&state, &headers).await?;
    let service = make_service(&state, user_id).await?;
    let out = service.status(&session_id).map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn me(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
) -> ApiResult {
    let pool = state.pool.as_ref().ok_or_else(|| ApiError("未启用用户系统".to_string()))?;
    let user_id = resolve_user_id(&state, &headers)
        .await?
        .ok_or_else(|| ApiError("需要登录".to_string()))?;
    let email = auth::get_user_email(pool, user_id)
        .await
        .map_err(|e| ApiError(e.to_string()))?;
    Ok(Json(json!({ "email": email })))
}

async fn logout(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
) -> ApiResult {
    let pool = state.pool.as_ref().ok_or_else(|| ApiError("未启用用户系统".to_string()))?;
    let token = bearer_token_from_headers(&headers)
        .ok_or_else(|| ApiError("需要登录".to_string()))?;
    auth::logout(pool, token)
        .await
        .map_err(|e| ApiError(e.to_string()))?;
    Ok(Json(json!({ "ok": true })))
}

async fn join_waiting_list(
    State(state): State<ApiState>,
    Json(req): Json<WaitingListRequest>,
) -> ApiResult {
    let service = make_service(&state, None).await?;
    let out = service.join_waiting_list(req.email, req.idea).await.map_err(ApiError::from)?;
    Ok(Json(out))
}
