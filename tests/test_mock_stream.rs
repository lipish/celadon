use zene::agent::executor::Executor;
use llm_connector::types::ToolCall;

fn main() {
    let mut tool_calls_buffer: Vec<ToolCall> = Vec::new();

    // Simulating deepseek stream chunks for search_code without arguments
    let chunks = vec![
        r#"{"index": 0, "id": "call_1", "type": "function", "function": {"name": "search_code", "arguments": ""}}"#,
        r#"{"index": 0, "function": {"arguments": "{}"}}"#,
    ];

    for chunk_str in chunks {
        let tool_call_chunk: ToolCall = serde_json::from_str(chunk_str).unwrap();
        let index = tool_call_chunk.index.unwrap_or(0);
        
        if index >= tool_calls_buffer.len() {
             tool_calls_buffer.resize(index + 1, ToolCall::default());
        }
        
        let current_tool = &mut tool_calls_buffer[index];
        
        if !tool_call_chunk.id.is_empty() {
            current_tool.id = tool_call_chunk.id.clone();
        }
        if !tool_call_chunk.function.name.is_empty() {
            if current_tool.function.name.is_empty() {
                current_tool.function.name.push_str(&tool_call_chunk.function.name);
            }
        }
        if !tool_call_chunk.function.arguments.is_empty() {
            current_tool.function.arguments.push_str(&tool_call_chunk.function.arguments);
        }
    }

    println!("Combined Tool Call: {:?}", tool_calls_buffer);
}
