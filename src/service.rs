use crate::clients::{LlmGateway, ZeneClient};
use crate::common::AppResult;
use crate::db;
use crate::models::{
    ConversationTurn, DeploymentRun, IdeaEvent, PrdVersion, Project, Session, Stage, StateStore,
    TaskRun,
};
use crate::utils::{now_timestamp, suggest_project_name};
use serde_json::{Value, json};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

pub struct CeladonService {
    storage_dir: PathBuf,
    state: StateStore,
    zene_client: ZeneClient,
    llm_gateway: LlmGateway,
    pool: Option<db::Pool>,
    user_id: Option<Uuid>,
}

impl CeladonService {
    pub async fn load(storage_dir: PathBuf) -> AppResult<Self> {
        fs::create_dir_all(&storage_dir)?;
        let state_file = storage_dir.join("state.json");
        let mut state: StateStore = if state_file.exists() {
            let content = fs::read_to_string(state_file)?;
            serde_json::from_str(&content)?
        } else {
            StateStore::default()
        };
        migrate_idea_events_to_conversation(&mut state);
        let llm_gateway = LlmGateway::load(None).await
            .map_err(|e| format!("{e}. 请设置 LLM API KEY"))?;
        
        let mut zene_client = ZeneClient::new();
        let _ = zene_client.init(llm_gateway.to_agent_config()).await;
        
        Ok(Self {
            storage_dir,
            state,
            zene_client,
            llm_gateway,
            pool: None,
            user_id: None,
        })
    }

    /// 从数据库加载对应用户状态（需已配置 DATABASE_URL）
    pub async fn load_with_db(
        storage_dir: PathBuf,
        pool: db::Pool,
        user_id: Uuid,
    ) -> AppResult<Self> {
        let mut state = db::load_user_state(&pool, user_id).await?;
        migrate_idea_events_to_conversation(&mut state);
        let user_dir = storage_dir.join(user_id.to_string());
        fs::create_dir_all(&user_dir)?;
        let llm_gateway = LlmGateway::load(Some(&pool)).await
            .map_err(|e| format!("{e}. 请在系统设置中配置 LLM API KEY"))?;
            
        let mut zene_client = ZeneClient::new();
        // Warm the engine immediately
        let _ = zene_client.init(llm_gateway.to_agent_config()).await;
        
        Ok(Self {
            storage_dir: user_dir,
            state,
            zene_client,
            llm_gateway,
            pool: Some(pool),
            user_id: Some(user_id),
        })
    }

    async fn persist(&self) -> AppResult<()> {
        if let (Some(pool), Some(uid)) = (self.pool.as_ref(), self.user_id) {
            db::save_user_state(pool, uid, &self.state).await?;
        } else {
            self.save()?;
        }
        Ok(())
    }

    pub async fn start(&mut self, idea: String, name: Option<String>) -> AppResult<Value> {
        let now = now_timestamp();
        let project_id = Uuid::new_v4().to_string();
        let project_name = name.unwrap_or_else(|| suggest_project_name(&idea));
        let session_id = Uuid::new_v4().to_string();

        let project = Project {
            id: project_id.clone(),
            name: project_name.clone(),
            status: "ACTIVE".to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        self.state.projects.insert(project_id.clone(), project);
        self.state.sessions.insert(
            session_id.clone(),
            Session {
                session_id: session_id.clone(),
                project_id: project_id.clone(),
                stage: Stage::Clarifying,
                context_snapshot: idea.clone(),
            },
        );
        self.append_conversation_turn(&session_id, "user", &idea)?;
        self.append_idea_event(&session_id, idea.clone())?;

        let history: Vec<(String, String)> = Vec::new();
        let assistant_reply = self
            .llm_gateway
            .clarify_round(crate::clients::CLARIFY_SYSTEM, &history, &idea)
            .await?;
        self.append_conversation_turn(&session_id, "assistant", &assistant_reply)?;
        self.touch_project(&project_id);
        self.persist().await?;

        Ok(json!({
            "message": "project/session created",
            "project_id": project_id,
            "project_name": project_name,
            "session_id": session_id,
            "conversation": [
                { "role": "user", "content": idea, "created_at": now },
                { "role": "assistant", "content": assistant_reply }
            ],
            "assistant_reply": assistant_reply,
            "stage": "CLARIFYING"
        }))
    }

    pub async fn join_waiting_list(&self, email: String, idea: String) -> AppResult<Value> {
        let pool = self.pool.as_ref().ok_or_else(|| "数据库未启用".to_string())?;
        sqlx::query("INSERT INTO waiting_list (email, idea) VALUES (?, ?)")
            .bind(email)
            .bind(idea)
            .execute(pool)
            .await
            .map_err(|e| format!("写入等待列表失败: {e}"))?;

        Ok(json!({ "ok": true }))
    }

    pub async fn append_idea(&mut self, session_id: &str, text: String) -> AppResult<Value> {
        let session = self
            .state
            .sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| format!("session not found: {session_id}"))?;
        let project_id = session.project_id.clone();

        let history = self.get_conversation_history(session_id);
        let assistant_reply = self
            .llm_gateway
            .clarify_round(crate::clients::CLARIFY_SYSTEM, &history, &text)
            .await?;

        self.append_conversation_turn(session_id, "user", &text)?;
        self.append_conversation_turn(session_id, "assistant", &assistant_reply)?;
        self.append_idea_event(session_id, text.clone())?;

        if let Some(s) = self.state.sessions.get_mut(session_id) {
            s.stage = Stage::Clarifying;
            s.context_snapshot = text.clone();
        }
        self.touch_project(&project_id);
        self.persist().await?;

        Ok(json!({
            "message": "idea appended",
            "session_id": session_id,
            "user_text": text,
            "assistant_reply": assistant_reply,
            "stage": "CLARIFYING"
        }))
    }

    pub async fn generate_prd(&mut self, session_id: &str) -> AppResult<Value> {
        let session = self
            .state
            .sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| format!("session not found: {session_id}"))?;
        let project = self
            .state
            .projects
            .get(&session.project_id)
            .cloned()
            .ok_or_else(|| format!("project not found: {}", session.project_id))?;
        let turns: Vec<&ConversationTurn> = self
            .state
            .conversation_turns
            .iter()
            .filter(|t| t.session_id == session_id)
            .collect();
        if turns.is_empty() {
            return Err(format!("no conversation found for session: {session_id}").into());
        }

        let conv_text: String = turns
            .iter()
            .map(|t| format!("[{}] {}\n", t.role, t.content))
            .collect();
        let raw = self
            .llm_gateway
            .clarify_round(
                crate::clients::PRD_GEN_SYSTEM,
                &[],
                &format!("项目名: {}\n\n对话记录:\n{}", project.name, conv_text),
            )
            .await?;

        // 若 LLM 返回空、过短、或明显非 PRD（无二级标题），用对话内容生成一份 PRD，避免页面“暂无内容”
        let trim = raw.trim();
        let use_fallback = trim.is_empty()
            || trim.len() < 150
            || (!trim.contains("##") && !trim.contains("背景") && !trim.contains("功能"));
        let prd_content = if use_fallback {
            let fallback = turns
                .iter()
                .map(|t| format!("- **{}**: {}", t.role, t.content.trim()))
                .collect::<Vec<_>>()
                .join("\n\n");
            format!(
                "# PRD · {}\n\n## 背景与目标\n\n根据澄清对话整理如下。若此处为摘要而非完整 PRD，请检查后端 LLM 配置（如 DEEPSEEK_API_KEY）或重试生成。\n\n## 对话摘要\n\n{}\n\n## 功能与验收\n\n待根据上述对话由 AI 补充功能清单与验收标准。",
                project.name,
                fallback
            )
        } else {
            raw
        };

        let next_version = self
            .state
            .prd_versions
            .iter()
            .filter(|v| v.project_id == project.id)
            .count() as u32
            + 1;
        let previous = self
            .state
            .prd_versions
            .iter()
            .filter(|v| v.project_id == project.id)
            .max_by_key(|v| v.version)
            .map(|v| v.version);
        let diff_from_prev = previous.map(|v| format!("Incremental update from PRD v{v}"));
        self.state.prd_versions.push(PrdVersion {
            prd_id: Uuid::new_v4().to_string(),
            project_id: project.id.clone(),
            version: next_version,
            content: prd_content.clone(),
            diff_from_prev: diff_from_prev.clone(),
        });
        self.write_prd_file(&project.id, next_version, &prd_content)?;

        if let Some(session_ref) = self.state.sessions.get_mut(session_id) {
            session_ref.stage = Stage::PrdConfirmed;
            session_ref.context_snapshot = format!("PRD v{next_version} ready");
        }
        self.touch_project(&project.id);
        self.persist().await?;

        Ok(json!({
            "message": "prd generated",
            "project_id": project.id,
            "session_id": session_id,
            "version": next_version,
            "path": format!(".celadon/prd/{}/v{}.md", project.id, next_version),
            "content": prd_content,
            "diff_from_prev": diff_from_prev
        }))
    }

    pub async fn run_dev(
        &mut self,
        session_id: &str,
        instruction: Option<String>,
        dry_run: bool,
    ) -> AppResult<Value> {
        let session = self
            .state
            .sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| format!("session not found: {session_id}"))?;
        let project = self
            .state
            .projects
            .get(&session.project_id)
            .cloned()
            .ok_or_else(|| format!("project not found: {}", session.project_id))?;
        let default_instruction = format!(
            "Implement the latest PRD for project `{}` and run tests.",
            project.name
        );
        let final_instruction = instruction.unwrap_or(default_instruction);
        let workspace = std::env::current_dir()?.to_string_lossy().to_string();

        let zene_payload =
            self.zene_client
                .agent_run_payload(session_id, &final_instruction, &workspace);
        let llm_payload = self.llm_gateway.invoke_payload(
            "deepseek-chat",
            "Execute coding task based on current project context.",
            &zene_payload,
        );
        let zene_response = if dry_run {
            None
        } else {
            Some(
                self.zene_client
                    .run_agent_via_lib(
                        session_id,
                        &final_instruction,
                        None, // Use pre-warmed engine
                    )
                    .await?,
            )
        };
        let (run_status, logs) = if let Some(response) = &zene_response {
            if response.get("error").is_some() {
                ("FAILED", "zene agent returned an error")
            } else {
                ("SUCCEEDED", "zene agent executed successfully")
            }
        } else {
            ("QUEUED", "dry-run only, zene was not executed")
        };
        self.state.task_runs.push(TaskRun {
            task_id: Uuid::new_v4().to_string(),
            project_id: project.id.clone(),
            plan_json: serde_json::to_string_pretty(&zene_payload)?,
            run_status: run_status.to_string(),
            logs: logs.to_string(),
        });
        if let Some(session_ref) = self.state.sessions.get_mut(session_id) {
            session_ref.stage = if dry_run {
                Stage::Developing
            } else if run_status == "SUCCEEDED" {
                Stage::Testing
            } else {
                Stage::Developing
            };
            session_ref.context_snapshot = final_instruction.clone();
        }
        self.touch_project(&project.id);
        self.persist().await?;

        Ok(json!({
            "message": if dry_run {
                "development workflow queued (dry-run)"
            } else {
                "development workflow executed"
            },
            "service_layer_method": "workflow.start_development",
            "dry_run": dry_run,
            "zene_request": zene_payload,
            "zene_response": zene_response,
            "llm_connector_request": llm_payload
        }))
    }

    pub async fn run_deploy(&mut self, session_id: &str, env: String) -> AppResult<Value> {
        let session = self
            .state
            .sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| format!("session not found: {session_id}"))?;
        let project = self
            .state
            .projects
            .get(&session.project_id)
            .cloned()
            .ok_or_else(|| format!("project not found: {}", session.project_id))?;
        if let Some(session_ref) = self.state.sessions.get_mut(session_id) {
            session_ref.stage = Stage::Deploying;
        }

        let prd_version = self
            .state
            .prd_versions
            .iter()
            .filter(|v| v.project_id == project.id)
            .max_by_key(|v| v.version)
            .map(|v| format!("prd-v{}", v.version))
            .unwrap_or_else(|| "prd-v0".to_string());
        self.state.deployment_runs.push(DeploymentRun {
            deploy_id: Uuid::new_v4().to_string(),
            project_id: project.id.clone(),
            env: env.clone(),
            version: prd_version.clone(),
            result: "SIMULATED_SUCCESS".to_string(),
            rollback_hint: format!("redeploy previous stable tag for project {}", project.id),
        });
        if let Some(session_ref) = self.state.sessions.get_mut(session_id) {
            session_ref.stage = Stage::Delivered;
            session_ref.context_snapshot = format!("deployed to {env}");
        }
        self.touch_project(&project.id);
        self.persist().await?;

        Ok(json!({
            "message": "deployment recorded",
            "project_id": project.id,
            "session_id": session_id,
            "env": env,
            "version": prd_version,
            "result": "SIMULATED_SUCCESS"
        }))
    }

    /// 列出所有项目及其最近会话，用于首页「继续之前的工作」
    pub fn list_projects(&self) -> AppResult<Value> {
        let mut list: Vec<Value> = self
            .state
            .projects
            .values()
            .filter_map(|project| {
                let session = self
                    .state
                    .sessions
                    .values()
                    .find(|s| s.project_id == project.id)?;
                Some(json!({
                    "project_id": project.id,
                    "name": project.name,
                    "status": project.status,
                    "updated_at": project.updated_at,
                    "session_id": session.session_id,
                    "stage": session.stage
                }))
            })
            .collect();
        list.sort_by(|a, b| {
            let a_t = a["updated_at"].as_str().unwrap_or("");
            let b_t = b["updated_at"].as_str().unwrap_or("");
            b_t.cmp(a_t)
        });
        Ok(json!({ "projects": list }))
    }

    pub fn status(&self, session_id: &str) -> AppResult<Value> {
        let session = self
            .state
            .sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| format!("session not found: {session_id}"))?;
        let project = self
            .state
            .projects
            .get(&session.project_id)
            .cloned()
            .ok_or_else(|| format!("project not found: {}", session.project_id))?;
        let latest_prd = self
            .state
            .prd_versions
            .iter()
            .filter(|v| v.project_id == project.id)
            .max_by_key(|v| v.version)
            .map(|v| json!({ "version": v.version, "diff_from_prev": v.diff_from_prev }));
        let latest_task = self
            .state
            .task_runs
            .iter().rfind(|t| t.project_id == project.id)
            .map(|t| json!({ "task_id": t.task_id, "run_status": t.run_status }));
        let latest_deploy = self
            .state
            .deployment_runs
            .iter().rfind(|d| d.project_id == project.id)
            .map(|d| {
                json!({
                    "deploy_id": d.deploy_id,
                    "env": d.env,
                    "version": d.version,
                    "result": d.result
                })
            });
        let conversation: Vec<_> = self
            .state
            .conversation_turns
            .iter()
            .filter(|t| t.session_id == session_id)
            .map(|t| json!({ "role": t.role, "content": t.content, "created_at": t.created_at }))
            .collect();

        Ok(json!({
            "project": {
                "id": project.id,
                "name": project.name,
                "status": project.status
            },
            "session": {
                "session_id": session.session_id,
                "stage": session.stage,
                "context_snapshot": session.context_snapshot
            },
            "conversation": conversation,
            "latest_prd": latest_prd,
            "latest_task": latest_task,
            "latest_deployment": latest_deploy
        }))
    }

    fn save(&self) -> AppResult<()> {
        let state_file = self.storage_dir.join("state.json");
        let payload = serde_json::to_string_pretty(&self.state)?;
        fs::write(state_file, payload)?;
        Ok(())
    }

    fn append_conversation_turn(&mut self, session_id: &str, role: &str, content: &str) -> AppResult<()> {
        if !self.state.sessions.contains_key(session_id) {
            return Err(format!("session not found: {session_id}").into());
        }
        self.state.conversation_turns.push(ConversationTurn {
            session_id: session_id.to_string(),
            role: role.to_string(),
            content: content.to_string(),
            created_at: now_timestamp(),
        });
        Ok(())
    }

    fn get_conversation_history(&self, session_id: &str) -> Vec<(String, String)> {
        self.state
            .conversation_turns
            .iter()
            .filter(|t| t.session_id == session_id)
            .map(|t| (t.role.clone(), t.content.clone()))
            .collect()
    }

    fn append_idea_event(&mut self, session_id: &str, text: String) -> AppResult<()> {
        if !self.state.sessions.contains_key(session_id) {
            return Err(format!("session not found: {session_id}").into());
        }
        self.state.idea_events.push(IdeaEvent {
            event_id: Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            user_input: text,
            created_at: now_timestamp(),
        });
        Ok(())
    }

    fn write_prd_file(&self, project_id: &str, version: u32, content: &str) -> AppResult<()> {
        let prd_dir = self.storage_dir.join("prd").join(project_id);
        fs::create_dir_all(&prd_dir)?;
        let target = prd_dir.join(format!("v{version}.md"));
        fs::write(target, content)?;
        Ok(())
    }

    fn touch_project(&mut self, project_id: &str) {
        if let Some(project) = self.state.projects.get_mut(project_id) {
            project.updated_at = now_timestamp();
        }
    }

    pub async fn list_all_settings(&self) -> AppResult<Value> {
        let pool = self.pool.as_ref().ok_or_else(|| "数据库未启用".to_string())?;
        db::list_system_settings(pool).await
    }

    pub async fn update_setting(&mut self, key: &str, value: &str) -> AppResult<()> {
        let pool = self.pool.as_ref().ok_or_else(|| "数据库未启用".to_string())?;
        db::set_system_setting(pool, key, value).await?;
        // 立即尝试重载 Gateway
        if let Ok(new_gateway) = LlmGateway::load(Some(pool)).await {
            self.llm_gateway = new_gateway;
        }
        Ok(())
    }
}

fn migrate_idea_events_to_conversation(state: &mut StateStore) {
    if state.conversation_turns.is_empty() && !state.idea_events.is_empty() {
        for e in &state.idea_events {
            state.conversation_turns.push(ConversationTurn {
                session_id: e.session_id.clone(),
                role: "user".to_string(),
                content: e.user_input.clone(),
                created_at: e.created_at.clone(),
            });
        }
    }
}
