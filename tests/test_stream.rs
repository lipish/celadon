use zene::agent::client::AgentClient;
use zene::config::AgentConfig;
use llm_connector::types::{Message, Tool};
use futures::StreamExt;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let config = AgentConfig::from_env().unwrap();
    let mut client = AgentClient::new(&config.executor).unwrap();
    
    let mut history = vec![Message::user("Search for the phrase 'list_files' in the codebase.")];
    let tools = vec![
        Tool::function("search_code".to_string(), Some("Search code".to_string()), serde_json::json!({
            "type": "object",
            "properties": {
                "pattern": { "type": "string" }
            },
            "required": ["pattern"]
        }))
    ];
    
    let mut stream = client.chat_stream_with_history(history, Some(tools)).await.unwrap();
    
    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.unwrap();
        println!("Raw chunk: {:?}", chunk);
    }
}
