use crate::common::AppResult;
use llm_connector::types::{ChatRequest, Message};
use llm_connector::LlmClient;
use serde_json::{Value, json};
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;
use zene::config::AgentConfig;
use zene::engine::session::store::FileSessionStore;
use zene::RunRequest;
use zene::ZeneEngine;
use zene::AgentEvent;
use tokio::sync::mpsc;

pub struct ZeneClient {
    engine: Arc<tokio::sync::Mutex<Option<ZeneEngine>>>,
}

impl ZeneClient {
    pub fn new() -> Self {
        Self { engine: Arc::new(tokio::sync::Mutex::new(None)) }
    }

    pub async fn init(&mut self, config: AgentConfig) -> AppResult<()> {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let storage_dir = PathBuf::from(&home).join(".zene/sessions");
        let store = Arc::new(FileSessionStore::new(storage_dir)?);
        let engine = ZeneEngine::new(config, store).await?;
        *self.engine.lock().await = Some(engine);
        Ok(())
    }

    pub fn agent_run_payload(&self, session_id: &str, instruction: &str, workspace: &str) -> Value {
        json!({
            "jsonrpc": "2.0",
            "id": Uuid::new_v4().to_string(),
            "method": "agent.run",
            "params": {
                "session_id": session_id,
                "instruction": instruction,
                "workspace": workspace
            }
        })
    }

    pub async fn run_agent_stream(
        &self,
        session_id: &str,
        instruction: &str,
        config_override: Option<AgentConfig>,
    ) -> AppResult<mpsc::UnboundedReceiver<AgentEvent>> {
        let req = RunRequest {
            prompt: instruction.to_string(),
            session_id: session_id.to_string(),
            env_vars: None,
        };

        let mut engine_guard = self.engine.lock().await;

        if let (Some(engine), None) = (&*engine_guard, config_override.as_ref()) {
            Ok(engine.run_stream(req).await?)
        } else {
            // Fallback or override, we update the cached engine
            let config = config_override.unwrap_or_else(|| AgentConfig::from_env().unwrap());
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            let storage_dir = PathBuf::from(&home).join(".zene/sessions");
            let store = Arc::new(FileSessionStore::new(storage_dir)?);
            let new_engine = ZeneEngine::new(config, store).await?;
            let stream = new_engine.run_stream(req).await?;
            *engine_guard = Some(new_engine);
            Ok(stream)
        }
    }
}

pub(crate) const CLARIFY_SYSTEM: &str = r#"你是 Celadon 的需求澄清助手。用户会描述他们的项目想法，你的任务是：
1. 通过多轮对话澄清需求：范围（MVP/完整版）、约束（技术栈、预算、上线时间）、成功标准（验收条件）
2. 在信息充分时，简要总结已明确的需求，并建议可以进入 PRD 生成阶段
3. 保持简洁、专业，每次回复聚焦 1-2 个问题或要点
4. 若用户表示已准备好或信息足够，回复「需求已澄清，可以生成 PRD 了」"#;

pub(crate) const PRD_GEN_SYSTEM: &str = r#"根据对话内容，提炼并生成一份结构化的 PRD（产品需求文档），包含：
1. 背景与目标
2. 用户故事与使用流程
3. 功能清单（Must/Should/Could）
4. 非功能需求（性能、安全、稳定性）
5. 验收标准与里程碑

使用 Markdown 格式，简洁清晰。"#;

pub struct LlmGateway {
    // Legacy support for basic LLM features in Celadon (like clarify)
    client: Arc<LlmClient>,
    
    // Zene-aligned role configs
    pub planner_provider: String,
    pub planner_key: String,
    pub planner_model: String,
    
    pub executor_provider: String,
    pub executor_key: String,
    pub executor_model: String,
    
    pub reflector_provider: String,
    pub reflector_key: String,
    pub reflector_model: String,

    pub use_semantic_memory: bool,
    pub is_dummy: bool,
}

impl LlmGateway {
    pub async fn load(pool: Option<&crate::db::Pool>) -> Result<Self, String> {
        let mut settings = std::collections::HashMap::new();

        if let Some(p) = pool {
            let keys = vec![
                "ZENE_PLANNER_PROVIDER", "ZENE_PLANNER_API_KEY", "ZENE_PLANNER_MODEL",
                "ZENE_EXECUTOR_PROVIDER", "ZENE_EXECUTOR_API_KEY", "ZENE_EXECUTOR_MODEL",
                "ZENE_REFLECTOR_PROVIDER", "ZENE_REFLECTOR_API_KEY", "ZENE_REFLECTOR_MODEL",
                "ZENE_USE_SEMANTIC_MEMORY", "CELADON_LLM_MODEL",
                "DEEPSEEK_API_KEY", "OPENAI_API_KEY"
            ];
            for k in keys {
                if let Ok(Some(val)) = crate::db::get_system_setting(p, k).await
                    && !val.trim().is_empty() {
                        settings.insert(k.to_string(), val);
                    }
            }
        }

        let get_setting = |key: &str, default: &str| -> String {
            settings.get(key).cloned().or_else(|| std::env::var(key).ok()).unwrap_or_else(|| default.to_string())
        };

        let planner_provider = get_setting("ZENE_PLANNER_PROVIDER", "deepseek");
        let planner_key = get_setting("ZENE_PLANNER_API_KEY", "");
        let planner_model = get_setting("ZENE_PLANNER_MODEL", "deepseek-chat");

        let executor_provider = get_setting("ZENE_EXECUTOR_PROVIDER", "openai");
        let executor_key = get_setting("ZENE_EXECUTOR_API_KEY", "");
        let executor_model = get_setting("ZENE_EXECUTOR_MODEL", "gpt-4o");

        let reflector_provider = get_setting("ZENE_REFLECTOR_PROVIDER", "deepseek");
        let reflector_key = get_setting("ZENE_REFLECTOR_API_KEY", "");
        let reflector_model = get_setting("ZENE_REFLECTOR_MODEL", "deepseek-chat");

        let use_semantic_memory = get_setting("ZENE_USE_SEMANTIC_MEMORY", "false") == "true";

        // Basic client for non-zene features (e.g. clarify, generate_prd)
        // Use the planner provider & key if available, otherwise read DEEPSEEK_API_KEY, otherwise "dummy".
        let basic_key = if !planner_key.is_empty() { planner_key.clone() } else { get_setting("DEEPSEEK_API_KEY", "dummy") };
        
        let is_dummy = basic_key == "dummy" || basic_key.trim().is_empty();
        let client = if is_dummy {
            LlmClient::openai("dummy").unwrap() // Fallback mock - won't be called due to is_dummy check
        } else {
            let providers_data = llm_providers::get_providers_data();
            if let Some(p) = providers_data.get(&planner_provider) {
                LlmClient::openai_with_base_url(&basic_key, &p.base_url)
                    .unwrap_or_else(|_| LlmClient::deepseek(&basic_key).unwrap()) // Fallback
            } else {
                match planner_provider.as_str() {
                    "zhipu" => LlmClient::zhipu(&basic_key).unwrap_or_else(|_| LlmClient::deepseek(&basic_key).unwrap()),
                    "moonshot" => LlmClient::moonshot(&basic_key).unwrap_or_else(|_| LlmClient::deepseek(&basic_key).unwrap()),
                    "aliyun" => LlmClient::aliyun(&basic_key).unwrap_or_else(|_| LlmClient::deepseek(&basic_key).unwrap()),
                    "openai" => LlmClient::openai(&basic_key).unwrap_or_else(|_| LlmClient::deepseek(&basic_key).unwrap()),
                    "anthropic" => LlmClient::anthropic(&basic_key).unwrap_or_else(|_| LlmClient::deepseek(&basic_key).unwrap()),
                    "google" => LlmClient::google(&basic_key).unwrap_or_else(|_| LlmClient::deepseek(&basic_key).unwrap()),
                    _ => LlmClient::deepseek(&basic_key).unwrap_or_else(|_| LlmClient::deepseek("dummy").unwrap()),
                }
            }
        };

        Ok(Self {
            client: Arc::new(client),
            planner_provider, planner_key, planner_model,
            executor_provider, executor_key, executor_model,
            reflector_provider, reflector_key, reflector_model,
            use_semantic_memory,
            is_dummy,
        })
    }

    pub fn to_agent_config(&self) -> AgentConfig {
        let mut config = AgentConfig::default();
        
        config.planner.provider = self.planner_provider.clone();
        config.planner.api_key = self.planner_key.clone();
        config.planner.model = self.planner_model.clone();

        config.executor.provider = self.executor_provider.clone();
        config.executor.api_key = self.executor_key.clone();
        config.executor.model = self.executor_model.clone();

        config.reflector.provider = self.reflector_provider.clone();
        config.reflector.api_key = self.reflector_key.clone();
        config.reflector.model = self.reflector_model.clone();

        config.use_semantic_memory = self.use_semantic_memory;
        config.simple_mode = true; // For performance in Celadon

        config
    }

    pub async fn clarify_round(
        &self,
        system_prompt: &str,
        history: &[(String, String)],
        user_input: &str,
    ) -> AppResult<String> {
        let mut messages: Vec<(String, String)> = vec![("system".to_string(), system_prompt.to_string())];
        messages.extend(history.iter().cloned());
        messages.push(("user".to_string(), user_input.to_string()));
        let msgs: Vec<Message> = messages
            .iter()
            .flat_map(|(role, content)| {
                let content = content.clone();
                match role.as_str() {
                    "system" => Some(Message::system(content)),
                    "user" => Some(Message::user(content)),
                    "assistant" => Some(Message::assistant(content)),
                    _ => None,
                }
            })
            .collect();
        let request = ChatRequest::new(&self.planner_model)
            .with_messages(msgs)
            .with_max_tokens(2048);
        if self.is_dummy {
            return Ok("请先在管理员设置中配置 LLM API Key 以启用需求澄清功能。".to_string());
        }
        let response = self
            .client
            .chat(&request)
            .await
            .map_err(|e| format!("LLM 调用失败: {e}"))?;
        Ok(response.content.clone())
    }

    pub fn invoke_payload(&self, model: &str, prompt: &str, context: &Value) -> Value {
        json!({
            "method": "provider.invoke",
            "params": {
                "model": model,
                "prompt": prompt,
                "context": context
            }
        })
    }
}
