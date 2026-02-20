# Celadon 部署指南 (Full Stack Deployment)

本指南详细介绍了如何将 Celadon 应用部署到生产环境。Celadon 采用了现代化的 Serverless + 边缘计算 + 容器化后端架构。

---

## 架构概览

- **前端 (Frontend)**: [Cloudflare Pages](https://pages.cloudflare.com/)
- **等候名单 API (Waitlist)**: [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) (基于 D1 数据库)
- **主后端 (Backend API)**: [Fly.io](https://fly.io/) (Rust Axum 容器)
- **数据库 (Database)**: [Neon PostgreSQL](https://neon.tech/) (Serverless Postgres)

---

## 1. 数据库设置 (Neon PostgreSQL)

Celadon 的主应用状态和用户系统存储在 Neon 中。

1.  **创建项目**: 在 [Neon.tech](https://neon.tech/) 创建一个新的项目。
2.  **获取连接字符串**: 
    - 点击 **Connect** 按钮。
    - 选择 **Pooled connection** (主机名带 `-pooler`)。
    - 复制 `DATABASE_URL`，格式如下：
      `postgresql://[user]:[password]@[hostname]/neondb?sslmode=require`
3.  **注意**: Celadon 的 Rust 后端会自动执行数据库迁移 (Migrations)，无需手动建表。

---

## 2. 后端部署 (Fly.io)

后端处理 AI 逻辑、项目状态管理和用户鉴权。

### 准备工作
- 安装 Fly.io CLI (`flyctl`)。
- 在项目**根目录**下进行操作。

### 部署步骤
1.  **初始化**: `fly launch` (如果已存在 `fly.toml` 则跳过)。
2.  **设置机密信息 (Secrets)**:
    - 将 Neon 的连接字符串安全地存入 Fly.io：
      ```bash
      fly secrets set DATABASE_URL="你的_NEON_连接字符串"
      ```
3.  **部署命令**:
    ```bash
    fly deploy
    ```
4.  **环境要求**: 
    - 编译环境必须使用 **Rust 1.88+** 以支持 Rust 2024 Edition。
    - 确保 `Dockerfile` 中的基础镜像是最新的。

---

## 3. 前端部署 (Cloudflare Pages)

### 步骤
1.  **连接仓库**: 在 Cloudflare Dashboard 中连接你的 GitHub 仓库。
2.  **构建设置**:
    - **Root directory**: `web`
    - **Build command**: `npm run build`
    - **Build output directory**: `dist`
    - **Framework preset**: `None`
3.  **绑定 D1 数据库 (用于等候名单)**:
    - 在 **Settings -> Functions -> D1 database bindings** 中，绑定一个名为 `DB` 的 D1 实例。
    - 初始化 D1 表：
      ```sql
      CREATE TABLE waiting_list (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, idea TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      ```
4.  **配置环境变量 (Environment Variables)**:
    - **`VITE_API_BASE_URL`**: 填入你的 Fly.io 后端地址 (例如 `https://web-withered-fog-5580.fly.dev`)。
    - **`DATABASE_URL`**: 填入你的 Neon 连接字符串（作为备份或某些共享逻辑使用）。

---

## 4. 常见问题排查 (Troubleshooting)

### CORS 错误
如果前端报错 `Access-Control-Allow-Origin`，请检查 `src/api.rs` 中的 CORS 配置是否允许了你的前端域名。目前的后端配置已默认 permissive（全开放）。

### 405 Method Not Allowed
通常是因为前端请求路径错误。请确保 `VITE_API_BASE_URL` 没有末尾斜杠，且后端路由已正确注册。

### 路由 Panic (Startup Failure)
Axum 路由语法非常严格。请确保 `{capture}` 语法正确：
- **正确**: `/api/status/{session_id}`
- **错误**: `/api/status/:session_id` (取决于 Axum 具体版本)

### 数据库迁移失败
确保 `migrations/` 下的 SQL 语法与目标数据库匹配。例如，PostgreSQL 使用 `SERIAL PRIMARY KEY` 而不是 SQLite 的 `AUTOINCREMENT`。

---

## 5. 持续集成与自动化部署 (CI/CD)

为了让你在推送代码到 GitHub 后自动更新 Fly.io，我们配置了 GitHub Actions。

### 自动化流程
- 每当你向 `main` 分支执行 `git push` 时，GitHub 会自动触发构建并运行 `fly deploy`。

### 初始设置 (必须手动完成一次)
1. **获取 Fly Token**:
   - 在终端运行：`fly auth token`
   - 或者访问 [Fly.io Tokens 页面](https://web.fly.io/user/tokens) 创建一个名为 `GITHUB_ACTIONS` 的新 Token。
2. **在 GitHub 后台配置**:
   - 进入你的 GitHub 仓库 -> **Settings** -> **Secrets and variables** -> **Actions**。
   - 点击 **New repository secret**。
   - Name: **`FLY_API_TOKEN`**
   - Value: 填入你刚才获取的 Token。
3. **完成**: 以后你只需 `git push`，剩下的都由 GitHub 完成。

### 手动更新方式
如果你不想等待 GitHub Actions，或者只是想快速测试，随时可以在根目录下运行：
```bash
fly deploy
```
