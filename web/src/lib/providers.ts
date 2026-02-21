export type ProviderModel = {
  id: string;
  name: string;
  description?: string;
  supports_tools?: boolean;
  context_length?: number;
  max_output?: number;
  input_price?: number;
  output_price?: number;
};

export type ProviderInfo = {
  label: string;
  base_url: string;
  models: ProviderModel[];
  docs_url?: string;
};

export const PROVIDERS: Record<string, ProviderInfo> = {
  aliyun: {
    label: "Aliyun Bailian",
    base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      { id: "qwen3-max", name: "Qwen3 Max", description: "Latest flagship, best for agentic coding and tool calling", supports_tools: true, context_length: 262144, input_price: 0.0025, output_price: 0.01 },
      { id: "qwen3.5-plus", name: "Qwen3.5 Plus", description: "Balanced performance, speed and cost, text/image/video input", supports_tools: true, context_length: 1000000, input_price: 0.0008, output_price: 0.002 },
      { id: "qwen-max", name: "Qwen Max", description: "Previous flagship for complex multi-step tasks", supports_tools: true, context_length: 262144, input_price: 0.0032, output_price: 0.0128 },
      { id: "qwen-plus", name: "Qwen Plus", description: "Balanced performance, speed and cost, suitable for medium complexity tasks", supports_tools: true, context_length: 1000000, input_price: 0.0008, output_price: 0.002 },
      { id: "qwen-flash", name: "Qwen Flash", description: "Suitable for simple tasks with fast speed and low cost", supports_tools: true, context_length: 1000000, input_price: 0.00015, output_price: 0.0015 },
      { id: "qwen-coder-turbo", name: "Qwen Coder Turbo", description: "Excellent code model, proficient in tool calling and environment interaction", supports_tools: true, context_length: 1000000, input_price: 0.001, output_price: 0.004 },
      { id: "qwen-vl-max", name: "Qwen VL Max", description: "Multimodal model with powerful vision understanding", supports_tools: true, context_length: 262144, input_price: 0.002, output_price: 0.02 },
      { id: "qwen-audio-turbo", name: "Qwen Audio Turbo", description: "Audio understanding model", supports_tools: false, context_length: 131072, input_price: 0.0016, output_price: 0.01 },
      { id: "qwen-long", name: "Qwen Long", description: "Long text processing model with longest context window", supports_tools: true, context_length: 10000000, input_price: 0.0005, output_price: 0.002 },
      { id: "qwq-plus", name: "QwQ Plus", description: "Reasoning model with outstanding math and code capabilities", supports_tools: false, context_length: 131072, input_price: 0.0016, output_price: 0.004 },
    ],
    docs_url: "https://help.aliyun.com/zh/dashscope/developer-reference/model-introduction",
  },
  deepseek: {
    label: "DeepSeek",
    base_url: "https://api.deepseek.com/v1",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat", description: "General chat model with 128K context", supports_tools: true, context_length: 131072, input_price: 2.0, output_price: 8.0 },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner", description: "Reasoning model with 128K context, max 64K output", supports_tools: false, context_length: 131072, input_price: 4.0, output_price: 16.0 },
    ],
    docs_url: "https://api-docs.deepseek.com/zh-cn/information/model_list",
  },
  longcat: {
    label: "LongCat",
    base_url: "https://api.longcat.chat/openai/v1",
    models: [
      { id: "LongCat-Flash-Chat", name: "LongCat Flash Chat", description: "High-performance general chat model", supports_tools: true, context_length: 32768, input_price: 0.0, output_price: 0.0 },
      { id: "LongCat-Flash-Thinking", name: "LongCat Flash Thinking", description: "Deep thinking model", supports_tools: true, context_length: 32768, input_price: 0.0, output_price: 0.0 },
    ],
    docs_url: "https://longcat.chat/platform/docs/zh/",
  },
  minimax: {
    label: "MiniMax",
    base_url: "https://api.minimax.io/v1",
    models: [
      { id: "MiniMax-M2.5", name: "MiniMax M2.5", description: "Latest flagship, 200K context, advanced reasoning", supports_tools: true, context_length: 204800, input_price: 0.0, output_price: 0.0 },
      { id: "MiniMax-M2.5-highspeed", name: "MiniMax M2.5 Highspeed", description: "Same as M2.5 with faster inference (~100 tps)", supports_tools: true, context_length: 204800, input_price: 0.0, output_price: 0.0 },
      { id: "MiniMax-M2.1", name: "MiniMax M2.1", description: "230B parameters, 10B activation, optimized for code generation and refactoring", supports_tools: true, context_length: 200000, input_price: 0.0, output_price: 0.0 },
      { id: "MiniMax-M2.1-lightning", name: "MiniMax M2.1 Lightning", description: "Same performance as M2.1 with faster inference speed", supports_tools: true, context_length: 200000, input_price: 0.0, output_price: 0.0 },
      { id: "MiniMax-M2", name: "MiniMax M2", description: "200K context, 128K output, supports function calling and advanced reasoning", supports_tools: true, context_length: 200000, input_price: 0.0, output_price: 0.0 },
      { id: "speech-2.6-hd", name: "Speech 2.6 HD", supports_tools: false, context_length: 4096, input_price: 0.0, output_price: 0.0 },
      { id: "speech-2.6-turbo", name: "Speech 2.6 Turbo", supports_tools: false, context_length: 4096, input_price: 0.0, output_price: 0.0 },
      { id: "speech-02-hd", name: "Speech 02 HD", supports_tools: false, context_length: 4096, input_price: 0.0, output_price: 0.0 },
      { id: "speech-02-turbo", name: "Speech 02 Turbo", supports_tools: false, context_length: 4096, input_price: 0.0, output_price: 0.0 },
      { id: "MiniMax-Hailuo-2.3", name: "MiniMax Hailuo 2.3", supports_tools: false, context_length: 4096, input_price: 0.0, output_price: 0.0 },
      { id: "MiniMax-Hailuo-2.3Fast", name: "MiniMax Hailuo 2.3 Fast", supports_tools: false, context_length: 4096, input_price: 0.0, output_price: 0.0 },
      { id: "MiniMax-Hailuo-02", name: "MiniMax Hailuo 02", supports_tools: false, context_length: 4096, input_price: 0.0, output_price: 0.0 },
      { id: "Music-2.0", name: "Music 2.0", supports_tools: false, context_length: 4096, input_price: 0.0, output_price: 0.0 },
    ],
    docs_url: "https://platform.minimaxi.com/document/models",
  },
  moonshot: {
    label: "Moonshot AI",
    base_url: "https://api.moonshot.cn/v1",
    models: [
      { id: "kimi-k2.5", name: "Kimi K2.5", description: "Latest flagship, 256K context, 1T params MoE, Agent Swarm", supports_tools: true, context_length: 262144, input_price: 4.0, output_price: 21.0 },
      { id: "kimi-k2-0905-preview", name: "Kimi K2 0905", description: "Latest K2 model with 256K context, strong Agentic Coding", supports_tools: true, context_length: 262144, input_price: 4.0, output_price: 16.0 },
      { id: "kimi-k2-turbo-preview", name: "Kimi K2 Turbo", description: "High-speed K2 with 256K context, 60-100 tokens/s", supports_tools: true, context_length: 262144, input_price: 8.0, output_price: 58.0 },
      { id: "kimi-k2-0711-preview", name: "Kimi K2 0711", description: "Earlier K2 version with 128K context", supports_tools: true, context_length: 131072, input_price: 4.0, output_price: 16.0 },
      { id: "kimi-k2-thinking", name: "Kimi K2 Thinking", description: "Deep reasoning model with 256K context", supports_tools: true, context_length: 262144, input_price: 4.0, output_price: 16.0 },
      { id: "kimi-k2-thinking-turbo", name: "Kimi K2 Thinking Turbo", description: "High-speed deep reasoning with 256K context", supports_tools: true, context_length: 262144, input_price: 8.0, output_price: 58.0 },
      { id: "kimi-latest", name: "Kimi Latest", description: "Auto-select model based on context (8K/32K/128K), vision support", supports_tools: true, context_length: 131072, input_price: 2.0, output_price: 10.0 },
      { id: "moonshot-v1-8k", name: "Moonshot V1 8K", description: "Classic v1 model with 8K context", supports_tools: true, context_length: 8192, input_price: 2.0, output_price: 10.0 },
      { id: "moonshot-v1-32k", name: "Moonshot V1 32K", description: "Classic v1 model with 32K context", supports_tools: true, context_length: 32768, input_price: 5.0, output_price: 20.0 },
      { id: "moonshot-v1-128k", name: "Moonshot V1 128K", description: "Classic v1 model with 128K context", supports_tools: true, context_length: 131072, input_price: 10.0, output_price: 30.0 },
    ],
    docs_url: "https://platform.moonshot.cn/docs/guide/model-list",
  },
  tencent: {
    label: "Tencent Hunyuan",
    base_url: "https://hunyuan.tencentcloudapi.com",
    models: [
      { id: "hunyuan-2.0-thinking-20251109", name: "Tencent HY 2.0 Think", supports_tools: true, context_length: 131072, max_output: 65536 },
      { id: "hunyuan-2.0-instruct-20251111", name: "Tencent HY 2.0 Instruct", supports_tools: true, context_length: 131072, max_output: 16384 },
      { id: "hunyuan-t1-latest", name: "Hunyuan T1 Latest", supports_tools: true, context_length: 32768, max_output: 65536 },
      { id: "hunyuan-a13b", name: "Hunyuan A13B", supports_tools: true, context_length: 229376, max_output: 32768 },
      { id: "hunyuan-turbos-latest", name: "Hunyuan TurboS Latest", supports_tools: true, context_length: 32768, max_output: 16384 },
      { id: "hunyuan-lite", name: "Hunyuan Lite", supports_tools: true, context_length: 256000, max_output: 6144 },
      { id: "hunyuan-translation", name: "Hunyuan Translation", supports_tools: false, context_length: 4096, max_output: 4096 },
      { id: "hunyuan-translation-lite", name: "Hunyuan Translation Lite", supports_tools: false, context_length: 4096, max_output: 4096 },
      { id: "hunyuan-large-role-latest", name: "Hunyuan Large Role Latest", supports_tools: false, context_length: 28672, max_output: 4096 },
      { id: "hunyuan-vision-1.5-instruct", name: "Tencent HY Vision 1.5 Instruct", supports_tools: true, context_length: 24576, max_output: 16384 },
      { id: "hunyuan-t1-vision-20250916", name: "Hunyuan T1 Vision", supports_tools: true, context_length: 28672, max_output: 20480 },
      { id: "hunyuan-large-vision", name: "Hunyuan Large Vision", supports_tools: true, context_length: 24576, max_output: 8192 },
      { id: "hunyuan-turbos-vision-video", name: "Hunyuan TurboS Vision Video", supports_tools: true, context_length: 24576, max_output: 8192 },
    ],
    docs_url: "https://cloud.tencent.com/document/product/1729/104753",
  },
  volcengine: {
    label: "Volcengine",
    base_url: "https://ark.cn-beijing.volces.com/api/v3",
    models: [
      { id: "doubao-seed-1-8-251215", name: "Doubao Seed 1.8", supports_tools: true, context_length: 262144 },
      { id: "doubao-seed-code-preview-251028", name: "Doubao Seed Code Preview", supports_tools: true, context_length: 262144 },
      { id: "doubao-seed-1-6-lite-251015", name: "Doubao Seed 1.6 Lite", supports_tools: true, context_length: 262144 },
      { id: "doubao-seed-1-6-flash-250828", name: "Doubao Seed 1.6 Flash", supports_tools: true, context_length: 262144 },
      { id: "doubao-seed-1-6-vision-250815", name: "Doubao Seed 1.6 Vision", supports_tools: true, context_length: 262144 },
      { id: "doubao-seed-translation-250915", name: "Doubao Seed Translation", supports_tools: false, context_length: 4096 },
      { id: "deepseek-v3-2-251201", name: "DeepSeek V3.2", supports_tools: true, context_length: 131072 },
      { id: "deepseek-v3-1-terminus", name: "DeepSeek V3.1 Terminus", supports_tools: true, context_length: 131072 },
      { id: "kimi-k2-thinking-251104", name: "Kimi K2 Thinking", supports_tools: true, context_length: 262144 },
      { id: "doubao-seedance-1-5-pro-251215", name: "Doubao Seedance 1.5 Pro", supports_tools: false, context_length: 4096 },
      { id: "doubao-seedream-4-5-251128", name: "Doubao Seedream 4.5", supports_tools: false, context_length: 4096 },
    ],
    docs_url: "https://www.volcengine.com/docs/82379/1099475",
  },
  zhipu: {
    label: "Zhipu AI",
    base_url: "https://open.bigmodel.cn/api/paas/v4",
    models: [
      { id: "glm-5", name: "GLM-5", description: "Fifth gen flagship, 745B params, 200K context, SOTA reasoning", supports_tools: true, context_length: 200000, input_price: 0.6, output_price: 2.2 },
      { id: "glm-4.7", name: "GLM-4.7", supports_tools: true, context_length: 128000, input_price: 0.6, output_price: 2.2 },
      { id: "glm-4.6", name: "GLM-4.6", supports_tools: true, context_length: 200000, input_price: 0.6, output_price: 2.2 },
      { id: "glm-4.6v", name: "GLM-4.6V", supports_tools: true, context_length: 128000, input_price: 0.3, output_price: 0.9 },
      { id: "glm-4.6v-flashx", name: "GLM-4.6V-FlashX", supports_tools: true, context_length: 128000, input_price: 0.04, output_price: 0.4 },
      { id: "glm-4.5", name: "GLM-4.5", supports_tools: true, context_length: 128000, input_price: 0.6, output_price: 2.2 },
      { id: "glm-4.5v", name: "GLM-4.5V", supports_tools: true, context_length: 128000, input_price: 0.6, output_price: 1.8 },
      { id: "glm-4.5-x", name: "GLM-4.5-X", supports_tools: true, context_length: 128000, input_price: 2.2, output_price: 8.9 },
      { id: "glm-4.5-air", name: "GLM-4.5 Air", supports_tools: true, context_length: 128000, input_price: 0.2, output_price: 1.1 },
      { id: "glm-4.5-airx", name: "GLM-4.5 AirX", supports_tools: true, context_length: 128000, input_price: 1.1, output_price: 4.5 },
      { id: "glm-4-32b-0414-128k", name: "GLM-4-32B-0414-128K", supports_tools: true, context_length: 128000, input_price: 0.1, output_price: 0.1 },
      { id: "glm-4.6v-flash", name: "GLM-4.6V-Flash", supports_tools: true, context_length: 128000, input_price: 0.0, output_price: 0.0 },
      { id: "glm-4.5-flash", name: "GLM-4.5-Flash", supports_tools: true, context_length: 128000, input_price: 0.0, output_price: 0.0 },
    ],
    docs_url: "https://open.bigmodel.cn/dev/howuse/model",
  },
  openai: {
    label: "OpenAI",
    base_url: "https://api.openai.com/v1",
    models: [
      { id: "gpt-5.2", name: "GPT-5.2", supports_tools: true, context_length: 128000, input_price: 2.5, output_price: 10.0 },
      { id: "gpt-5.2-pro", name: "GPT-5.2 Pro", supports_tools: true, context_length: 128000, input_price: 5.0, output_price: 20.0 },
      { id: "gpt-5.2-codex", name: "GPT-5.2 Codex", supports_tools: true, context_length: 128000, input_price: 2.5, output_price: 10.0 },
      { id: "gpt-5-mini", name: "GPT-5 Mini", supports_tools: true, context_length: 128000, input_price: 0.4, output_price: 1.6 },
      { id: "gpt-5-nano", name: "GPT-5 Nano", supports_tools: true, context_length: 128000, input_price: 0.1, output_price: 0.4 },
      { id: "gpt-4o", name: "GPT-4o", supports_tools: true, context_length: 128000, input_price: 2.5, output_price: 10.0 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", supports_tools: true, context_length: 128000, input_price: 0.15, output_price: 0.6 },
      { id: "gpt-4.1", name: "GPT-4.1", supports_tools: true, context_length: 128000, input_price: 2.5, output_price: 10.0 },
      { id: "o1", name: "o1", supports_tools: false, context_length: 200000, input_price: 15.0, output_price: 60.0 },
      { id: "o1-mini", name: "o1 Mini", supports_tools: false, context_length: 128000, input_price: 3.0, output_price: 12.0 },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", supports_tools: true, context_length: 16385, input_price: 0.5, output_price: 1.5 },
    ],
  },
  anthropic: {
    label: "Anthropic",
    base_url: "https://api.anthropic.com",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", supports_tools: true, context_length: 200000, input_price: 5.0, output_price: 25.0 },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", supports_tools: true, context_length: 200000, input_price: 3.0, output_price: 15.0 },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", supports_tools: true, context_length: 200000, input_price: 1.0, output_price: 5.0 },
      { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", supports_tools: true, context_length: 200000, input_price: 3.0, output_price: 15.0 },
      { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", supports_tools: true, context_length: 200000, input_price: 5.0, output_price: 25.0 },
    ],
  },
};
