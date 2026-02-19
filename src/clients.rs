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

pub struct ZeneClient;

impl ZeneClient {
    pub fn from_env() -> Self {
        Self
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

    pub async fn run_agent_via_lib(&self, session_id: &str, instruction: &str) -> AppResult<Value> {
        let session_id = session_id.to_string();
        let instruction = instruction.to_string();
        tokio::task::spawn_blocking(move || -> AppResult<Value> {
            let runtime = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()?;
            runtime.block_on(async move {
                let config = AgentConfig::from_env()?;
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
                let storage_dir = PathBuf::from(&home).join(".zene/sessions");
                let store = Arc::new(FileSessionStore::new(storage_dir)?);
                let engine = ZeneEngine::new(config, store).await?;
                let req = RunRequest {
                    prompt: instruction,
                    session_id: session_id.clone(),
                    env_vars: None,
                };
                let result = engine.run(req).await?;
                Ok(json!({
                    "jsonrpc": "2.0",
                    "result": {
                        "status": "completed",
                        "message": result.output,
                        "session_id": result.session_id
                    }
                }))
            })
        })
        .await
        .map_err(|e| format!("failed to join zene task: {e}"))?
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
    client: Arc<LlmClient>,
    model: String,
}

impl LlmGateway {
    pub fn from_env() -> Result<Self, String> {
        let api_key = std::env::var("DEEPSEEK_API_KEY")
            .or_else(|_| std::env::var("OPENAI_API_KEY"))
            .or_else(|_| std::env::var("LLM_API_KEY"))
            .map_err(|_| {
                "需要设置 DEEPSEEK_API_KEY、OPENAI_API_KEY 或 LLM_API_KEY 环境变量".to_string()
            })?;
        let client = LlmClient::deepseek(&api_key)
            .map_err(|e| format!("初始化 LLM 客户端失败: {e}"))?;
        let model = std::env::var("CELADON_LLM_MODEL").unwrap_or_else(|_| "deepseek-chat".to_string());
        Ok(Self {
            client: Arc::new(client),
            model,
        })
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
        let request = ChatRequest::new(&self.model)
            .with_messages(msgs)
            .with_max_tokens(2048);
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
