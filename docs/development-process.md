# Celadon 开发过程（基于 Zene + llm-connector）

本文档描述 Celadon 的持续交互式开发流程：用户先输入想法，系统通过多轮交互澄清需求，确定项目名称与需求文档（PRD），随后进入开发与部署，并支持后续持续迭代交付。

## 1. 流程目标

- 把“模糊想法”转化为“可执行任务与可部署产物”。
- 通过 Planner / Executor / Reflector 的闭环降低一次性实现失败率。
- 支持长期会话：用户可在任意阶段继续补充想法，触发增量迭代与再次部署。

## 2. 架构定位澄清

Celadon 采用三层职责分离，避免双重编排：

1. **流程服务层（Celadon）**
   - 负责想法澄清、PRD 版本、任务过程管理、部署编排、审计追踪。
2. **执行层（Zene）**
   - 负责 Planner / Executor / Reflector 闭环执行，不承担业务流程管理。
3. **模型连接层（llm-connector）**
   - 负责与具体 LLM 提供方交互（模型选择、鉴权、请求路由）。

## 3. Zene 内部核心角色（执行层）

1. **Planner（规划器）**
   - 负责多轮需求澄清、命名建议、PRD 生成与任务拆解（DAG/步骤列表）。
2. **Executor（执行器）**
   - 负责实际开发动作：创建/修改代码、运行命令、构建与测试、产出制品。
3. **Reflector（反思器）**
   - 负责质量回看：分析日志、测试结果与变更风险，发现问题后回流给 Planner/Executor 重试。

## 4. 标准交付流程

### 阶段 A：想法输入与澄清

- 用户输入初始想法（业务目标、目标用户、关键功能）。
- 系统发起若干轮交互，澄清以下信息：
  - 范围（MVP/完整版）
  - 约束（技术栈、预算、上线时间、合规）
  - 成功标准（验收条件、关键指标）

### 阶段 B：项目命名与 PRD 定稿

- 根据上下文生成并确认项目名称。
- 生成 PRD（版本化），至少包含：
  - 背景与目标
  - 用户故事与使用流程
  - 功能清单（Must/Should/Could）
  - 非功能需求（性能、安全、稳定性）
  - 验收标准与里程碑

### 阶段 C：开发执行

- Planner 将 PRD 拆解为可执行任务。
- Executor 按任务实现代码并持续运行构建/测试。
- Reflector 对失败进行定位与回流，直到通过验收门禁。

### 阶段 D：部署与交付

- 按环境执行部署（测试/预发/生产）。
- 输出交付结果：
  - 部署地址与版本号
  - 变更摘要（Changelog）
  - 已知风险与回滚方案

### 阶段 E：持续输入与增量迭代

- 用户可继续输入新想法或修改意见。
- 系统在当前上下文基础上进行“增量 PRD 更新 -> 增量开发 -> 增量部署”。
- 保留版本历史，确保每次迭代可追踪、可回滚、可审计。

## 5. 会话与状态建议

- 为每个项目维护 `session_id`，持久化：
  - 对话历史
  - PRD 版本
  - 任务执行记录
  - 部署记录
- 每次新输入都先进行状态恢复，再做增量规划，避免上下文丢失。

## 6. 质量门禁（建议）

- 代码门禁：lint / build / test 必须通过。
- 安全门禁：基础依赖扫描与密钥检查。
- 发布门禁：生成部署日志与回滚指令。

## 7. 可落地实现蓝图（MVP）

### 7.1 模块划分（按三层）

1. **流程服务层（Celadon）**
   - Idea Intake：接收用户输入（新项目想法/已有项目增量需求）。
   - Session Orchestrator：维护业务状态机与任务编排。
   - PRD Service：生成、版本化与对比 PRD。
   - Deploy Manager：部署触发、回滚与交付汇总。
2. **执行层（Zene）**
   - Dev Agent Runtime：接收执行目标并运行 Planner/Executor/Reflector 闭环。
3. **模型连接层（llm-connector）**
   - Provider Adapter：对接 OpenAI/Anthropic/DeepSeek/Gemini 等模型。

### 7.2 核心数据模型（建议）

- `Project`
  - `id`, `name`, `status`, `created_at`, `updated_at`
- `Session`
  - `session_id`, `project_id`, `stage`, `context_snapshot`
- `IdeaEvent`
  - `event_id`, `session_id`, `user_input`, `created_at`
- `PRDVersion`
  - `prd_id`, `project_id`, `version`, `content`, `diff_from_prev`
- `TaskRun`
  - `task_id`, `project_id`, `plan_json`, `run_status`, `logs`
- `DeploymentRun`
  - `deploy_id`, `project_id`, `env`, `version`, `result`, `rollback_hint`

### 7.3 接口建议（CLI + JSON-RPC）

CLI 示例：

- `celadon start`：创建项目会话并进入澄清阶段
- `celadon idea "<text>"`：提交新想法（可在任意阶段）
- `celadon prd generate`：生成或更新 PRD
- `celadon dev run`：启动开发与测试循环
- `celadon deploy --env staging|prod`：部署并输出交付信息
- `celadon status`：查看当前阶段、任务状态与部署结果

JSON-RPC 示例方法：

- `project.start`
- `idea.append`
- `prd.generate`
- `workflow.start_development`（流程服务层 -> Zene）
- `deploy.run`
- `session.status`

服务层调用 Zene（示意）：

- `zene.agent.run`（携带 `session_id`、`instruction`、`workspace`）
- `zene.session.status`

Zene 通过 llm-connector 调用模型（示意）：

- `provider.invoke(model, prompt, context, tools)`

### 7.4 状态机建议

`IDEA_COLLECTING -> CLARIFYING -> PRD_CONFIRMED -> DEVELOPING -> TESTING -> DEPLOYING -> DELIVERED`

当用户追加新需求时：

`DELIVERED/DEVELOPING/TESTING/DEPLOYING -> IDEA_COLLECTING (增量) -> ... -> DELIVERED`

### 7.5 最小闭环（第一版）

1. 支持创建项目与持续会话（`session_id` 持久化）。
2. 支持 PRD v1 生成与后续增量版本。
3. 支持“开发-测试-反思”自动重试（至少一次失败回流）。
4. 支持 staging 部署与交付摘要输出。
5. 支持用户新增想法后再次进入增量开发与部署。

---

该流程的核心是一个可持续运行的闭环：**输入想法 -> 澄清与规划 -> 开发验证 -> 部署交付 -> 接收新想法并继续迭代**。
