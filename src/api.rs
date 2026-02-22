use crate::auth;
use crate::common::AppResult;
use crate::db;
use crate::service::CeladonService;
use axum::extract::{Path, State, Query};
use axum::http::header::AUTHORIZATION;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response, Json, sse::{Event, Sse}};
use axum::routing::{get, post};
use axum::Router;
use futures_core::stream::Stream;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::convert::Infallible;
use std::collections::HashMap;
use std::path::PathBuf;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

use tokio::sync::{mpsc, Mutex};
use std::sync::Arc;
use zene::AgentEvent;

#[derive(Clone)]
struct ApiState {
    storage_dir: PathBuf,
    pool: Option<db::Pool>,
    streams: Arc<Mutex<HashMap<String, mpsc::UnboundedReceiver<AgentEvent>>>>,
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
        streams: Arc::new(Mutex::new(HashMap::new())),
    };
    let mut app = Router::new()
        .route("/api/health", get(health))
        .route("/api/start", post(start))
        .route("/api/waiting-list", post(join_waiting_list))
        .route("/api/idea", post(idea))
        .route("/api/prd/generate", post(generate_prd))
        .route("/api/dev/run", post(run_dev))
        .route("/api/dev/files", get(dev_files))
        .route("/api/dev/files/content", get(dev_file_content))
        .route("/api/dev/stream/{session_id}", get(dev_stream))
        .route("/api/deploy", post(run_deploy))
        .route("/api/projects", get(list_projects))
        .route("/api/status/{session_id}", get(status));
        if state.pool.is_some() {
        app = app
            .route("/api/register", post(register))
            .route("/api/login", post(login))
            .route("/api/me", get(me))
            .route("/api/logout", post(logout))
            .route("/api/admin/settings", get(get_all_settings))
            .route("/api/admin/settings", post(update_system_setting))
            .route("/api/admin/providers", get(get_providers))
            .route("/api/admin/providers_info", get(get_providers_info));
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
        _ => CeladonService::load(state.storage_dir.clone()).await.map_err(ApiError::from),
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

#[derive(Serialize)]
pub struct FileNode {
    name: String,
    path: String,
    #[serde(rename = "type")]
    node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<FileNode>>,
}

fn build_file_tree(dir: &std::path::Path, base_dir: &std::path::Path) -> Vec<FileNode> {
    let mut nodes = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        let mut entries: Vec<_> = entries.filter_map(|e| e.ok()).collect();
        // Sort: directories first, then alphabetical
        entries.sort_by(|a, b| {
            let a_is_dir = a.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
            let b_is_dir = b.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
            if a_is_dir != b_is_dir {
                b_is_dir.cmp(&a_is_dir)
            } else {
                a.file_name().cmp(&b.file_name())
            }
        });

        for entry in entries {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();
            let rel_path = path.strip_prefix(base_dir).unwrap_or(&path).to_string_lossy().into_owned();
            
            // Skip hidden directories like .git or node_modules
            if name.starts_with('.') || name == "node_modules" || name == "target" {
                continue;
            }

            if path.is_dir() {
                nodes.push(FileNode {
                    name,
                    path: rel_path,
                    node_type: "folder".to_string(),
                    children: Some(build_file_tree(&path, base_dir)),
                });
            } else {
                nodes.push(FileNode {
                    name,
                    path: rel_path,
                    node_type: "file".to_string(),
                    children: None,
                });
            }
        }
    }
    nodes
}

async fn dev_files(State(_state): State<ApiState>) -> Json<Vec<FileNode>> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    Json(build_file_tree(&cwd, &cwd))
}

#[derive(Deserialize)]
pub struct FileQuery {
    path: String,
}

async fn dev_file_content(
    State(_state): State<ApiState>,
    Query(query): Query<FileQuery>,
) -> impl IntoResponse {
    let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let full_path = cwd.join(&query.path);
    
    // Security check: ensure the path is within cwd to prevent path traversal
    if !full_path.starts_with(&cwd) {
        return (axum::http::StatusCode::FORBIDDEN, "Access denied".to_string());
    }

    match std::fs::read_to_string(&full_path) {
        Ok(content) => (axum::http::StatusCode::OK, content),
        Err(e) => (axum::http::StatusCode::NOT_FOUND, format!("Could not read file: {}", e)),
    }
}

async fn run_dev(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<DevRunRequest>,
) -> ApiResult {
    let user_id = resolve_user_id(&state, &headers).await?;
    let mut service = make_service(&state, user_id).await?;
    let (out, receiver_opt) = service
        .run_dev(
            &req.session_id,
            req.instruction,
            req.dry_run.unwrap_or_default(),
        )
        .await
        .map_err(ApiError::from)?;
        
    if let Some(rx) = receiver_opt {
        state.streams.lock().await.insert(req.session_id.clone(), rx);
    }
    
    Ok(Json(out))
}

async fn dev_stream(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Query(params): Query<HashMap<String, String>>,
    Path(session_id): Path<String>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, ApiError> {
    let _user_id = if let Some(token) = params.get("token") {
        if let Some(pool) = &state.pool {
            let parsed_token = Uuid::parse_str(token).map_err(|_| ApiError("Invalid token format".to_string()))?;
            let u_id = auth::verify_token(pool, parsed_token)
                .await
                .map_err(|e| ApiError(e.to_string()))?;
            Some(u_id)
        } else {
            None
        }
    } else {
        resolve_user_id(&state, &headers).await?
    };

    let receiver = {
        let mut streams = state.streams.lock().await;
        streams.remove(&session_id).ok_or_else(|| {
            ApiError(format!("No active stream for session {}", session_id))
        })?
    };

    let stream = CeladonService::stream_dev_logs(receiver).map_err(ApiError::from)?;
    Ok(Sse::new(stream).keep_alive(axum::response::sse::KeepAlive::new()))
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
    
    let admin_email = std::env::var("CELADON_ADMIN_EMAIL").ok();
    let is_admin = admin_email.map(|a| a == email).unwrap_or(false);

    Ok(Json(json!({ 
        "email": email,
        "is_admin": is_admin
    })))
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

async fn check_admin(
    state: &ApiState,
    headers: &axum::http::HeaderMap,
) -> Result<CeladonService, ApiError> {
    let pool = state.pool.as_ref().ok_or_else(|| ApiError("未启用用户系统".to_string()))?;
    let user_id = resolve_user_id(state, headers).await?
        .ok_or_else(|| ApiError("需要登录".to_string()))?;
    
    let email = auth::get_user_email(pool, user_id)
        .await
        .map_err(|e| ApiError(e.to_string()))?;

    let admin_email = std::env::var("CELADON_ADMIN_EMAIL")
        .map_err(|_| ApiError("未配置管理员邮箱".to_string()))?;

    if email != admin_email {
         return Err(ApiError("权限不足".to_string()));
    }

    make_service(state, Some(user_id)).await
}

async fn get_all_settings(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
) -> ApiResult {
    let service = check_admin(&state, &headers).await?;
    let out = service.list_all_settings().await.map_err(ApiError::from)?;
    Ok(Json(out))
}

#[derive(Deserialize)]
struct UpdateSettingRequest {
    key: String,
    value: String,
}

async fn update_system_setting(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateSettingRequest>,
) -> ApiResult {
    let mut service = check_admin(&state, &headers).await?;
    service.update_setting(&req.key, &req.value).await.map_err(ApiError::from)?;
    Ok(Json(json!({ "ok": true })))
}

async fn get_providers(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
) -> ApiResult {
    // 保证只有 admin 能调用
    let _ = check_admin(&state, &headers).await?;
    let providers = llm_connector::LlmClient::supported_providers();
    Ok(Json(json!(providers)))
}

async fn get_providers_info(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
) -> ApiResult {
    let _ = check_admin(&state, &headers).await?;
    let providers_data = llm_providers::get_providers_data();
    Ok(Json(json!(providers_data)))
}
