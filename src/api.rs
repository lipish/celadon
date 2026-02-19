use crate::common::AppResult;
use crate::service::CeladonService;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{Value, json};
use std::path::PathBuf;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
struct ApiState {
    storage_dir: PathBuf,
}

#[derive(Debug)]
struct ApiError(String);

impl From<Box<dyn std::error::Error + Send + Sync>> for ApiError {
    fn from(value: Box<dyn std::error::Error + Send + Sync>) -> Self {
        Self(value.to_string())
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

pub async fn serve(storage_dir: PathBuf, port: u16) -> AppResult<()> {
    let state = ApiState { storage_dir };
    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/start", post(start))
        .route("/api/idea", post(idea))
        .route("/api/prd/generate", post(generate_prd))
        .route("/api/dev/run", post(run_dev))
        .route("/api/deploy", post(run_deploy))
        .route("/api/status/{session_id}", get(status))
        .with_state(state)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
    println!("Celadon API running on http://localhost:{port}");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

async fn start(State(state): State<ApiState>, Json(req): Json<StartRequest>) -> ApiResult {
    let mut service = CeladonService::load(state.storage_dir).map_err(ApiError::from)?;
    let out = service.start(req.idea, req.name).await.map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn idea(State(state): State<ApiState>, Json(req): Json<IdeaRequest>) -> ApiResult {
    let mut service = CeladonService::load(state.storage_dir).map_err(ApiError::from)?;
    let out = service
        .append_idea(&req.session_id, req.text)
        .await
        .map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn generate_prd(State(state): State<ApiState>, Json(req): Json<SessionRequest>) -> ApiResult {
    let mut service = CeladonService::load(state.storage_dir).map_err(ApiError::from)?;
    let out = service
        .generate_prd(&req.session_id)
        .await
        .map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn run_dev(State(state): State<ApiState>, Json(req): Json<DevRunRequest>) -> ApiResult {
    let mut service = CeladonService::load(state.storage_dir).map_err(ApiError::from)?;
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

async fn run_deploy(State(state): State<ApiState>, Json(req): Json<DeployRequest>) -> ApiResult {
    let mut service = CeladonService::load(state.storage_dir).map_err(ApiError::from)?;
    let out = service
        .run_deploy(
            &req.session_id,
            req.env.unwrap_or_else(|| "staging".to_string()),
        )
        .map_err(ApiError::from)?;
    Ok(Json(out))
}

async fn status(State(state): State<ApiState>, Path(session_id): Path<String>) -> ApiResult {
    let service = CeladonService::load(state.storage_dir).map_err(ApiError::from)?;
    let out = service.status(&session_id).map_err(ApiError::from)?;
    Ok(Json(out))
}
