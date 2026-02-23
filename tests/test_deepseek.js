const apiKey = "sk-0f1e8e2c4cdd442bb590b1ded596db3e";

fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [
      { role: "user", content: "Let me check for any PRD-related files or documentation by searching for patterns using search_code tool." }
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "search_code",
          description: "Search for a string pattern in the codebase",
          parameters: {
            type: "object",
            properties: {
              pattern: { type: "string" }
            },
            required: ["pattern"]
          }
        }
      }
    ]
  })
}).then(res => res.json()).then(console.log);
