# Celadon

Celadon 是一个持续交互式开发流程服务层：用户输入想法后，经历澄清、PRD、开发执行、部署和持续迭代。  
后端基于 Rust，开发执行通过 Zene，模型交互走 llm-connector 兼容载荷。

## 后端（Rust）

```bash
cargo run -- serve --port 3000
```

可用 API：

- `POST /api/start`
- `POST /api/idea`
- `POST /api/prd/generate`
- `POST /api/dev/run`
- `POST /api/deploy`
- `GET /api/status/{session_id}`

Celadon 现在通过 Rust crate 直接调用 zene（不是 shell 启动 `zene server`），因此不需要配置 zene 可执行路径。

**澄清阶段（ChatGPT 风格对话）**需要配置 LLM 环境变量，任选其一：
- `DEEPSEEK_API_KEY`（推荐，DeepSeek API Key）
- `OPENAI_API_KEY`
- `LLM_API_KEY`

可选：`CELADON_LLM_MODEL` 覆盖模型名，默认 `deepseek-chat`。

## 前端（React + Tailwind + shadcn 风格）

```bash
cd web
npm install
npm run dev
```

默认请求 `http://localhost:3000`，可在前端运行时通过 `VITE_API_BASE_URL` 覆盖。
