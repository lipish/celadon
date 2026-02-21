use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Stage {
    #[default]
    IdeaCollecting,
    Clarifying,
    PrdConfirmed,
    Developing,
    Testing,
    Deploying,
    Delivered,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub session_id: String,
    pub project_id: String,
    pub stage: Stage,
    pub context_snapshot: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdeaEvent {
    pub event_id: String,
    pub session_id: String,
    pub user_input: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationTurn {
    pub session_id: String,
    pub role: String, // "user" | "assistant"
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrdVersion {
    pub prd_id: String,
    pub project_id: String,
    pub version: u32,
    pub content: String,
    pub diff_from_prev: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRun {
    pub task_id: String,
    pub project_id: String,
    pub plan_json: String,
    pub run_status: String,
    pub logs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentRun {
    pub deploy_id: String,
    pub project_id: String,
    pub env: String,
    pub version: String,
    pub result: String,
    pub rollback_hint: String,
}


#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StateStore {
    pub projects: HashMap<String, Project>,
    pub sessions: HashMap<String, Session>,
    pub idea_events: Vec<IdeaEvent>,
    #[serde(default)]
    pub conversation_turns: Vec<ConversationTurn>,
    pub prd_versions: Vec<PrdVersion>,
    pub task_runs: Vec<TaskRun>,
    pub deployment_runs: Vec<DeploymentRun>,
}
