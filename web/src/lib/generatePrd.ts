/**
 * Generates a realistic PRD markdown document from the submitted idea.
 * In production, this would be replaced by a real AI call.
 */
import { Locale } from "./i18n";

export function generatePrd(idea: string, answers: string[], locale: Locale = "zh"): string {
  const date = new Date().toISOString().split("T")[0];
  const shortIdea = idea.length > 60 ? idea.slice(0, 57) + "..." : idea;

  if (locale === "en") {
    const targetUserEn = answers[0] || "Indie developers / SMB teams";
    const mvpScopeEn = answers[1] || "MVP version with core features";
    const techStackEn = answers[2] || "Modern web stack (Next.js + PostgreSQL)";
    const acceptanceEn = answers[3] || "Core features functional, basic tests passed";

    return `# PRD · ${shortIdea}

> **Version** v0.1.0 &nbsp;·&nbsp; **Date** ${date} &nbsp;·&nbsp; **Status** Draft  
> Generated automatically by Celadon · Zene

---

## 1. Project Overview

### 1.1 Background & Motivation

${idea}

As demand continues to grow, the market needs a focused, easy-to-use, and scalable solution to help target users solve core problems at lower costs and higher speed.

### 1.2 Goals

- **Primary Goal**: Deliver a functional MVP within 8 weeks.
- **Secondary Goal**: Validate core assumptions and collect real user feedback.
- **Long-term Goal**: Continuously iterate based on data to expand functional boundaries.

---

## 2. Target Users

### 2.1 Primary User Groups

${targetUserEn}

### 2.2 User Personas

**Primary Role: Core User**

| Attribute | Description |
|-----------|-------------|
| Technical Skill | Intermediate+, familiar with basic web operations |
| Usage Frequency | 3–5 times per week |
| Core Pain Points | Existing tools are inefficient, steep learning curve, hard to integrate |
| Expected Benefits | Save time, reduce error rate, improve team collaboration |

---

## 3. Functional Requirements

### 3.1 MVP Scope

${mvpScopeEn}

#### 3.1.1 Core Features (Must-Have)

- **User Authentication System**
  - Email + Password Register/Login
  - OAuth login (GitHub / Google)
  - Session management and secure logout

- **Core Business Logic**
  - Create, edit, and delete primary entities
  - State machine management (Draft → In Progress → Done)
  - Real-time status updates and notifications

- **Data Management**
  - List view + Search/Filtering
  - Pagination (20 items per page)
  - Data Export (CSV / JSON)

#### 3.1.2 Enhancement Features (Optional)

- Team collaboration and RBAC
- Webhooks and third-party integrations
- Advanced analytics and charts
- Mobile responsiveness

### 3.2 User Stories

**Epic 1: User Management**

\`\`\`
As a new user,
I want to register with my email,
So that I can start using the core features.

Acceptance Criteria:
- Registration form includes email, password, confirm password fields
- Password strength validation (min 8 chars, incl. upper/lower case and numbers)
- Auto-redirect to Dashboard after successful registration
- Duplicate email registration is blocked with friendly error
\`\`\`

**Epic 2: Core Business**

\`\`\`
As a logged-in user,
I want to quickly create a new item,
So that I can track my work progress.

Acceptance Criteria:
- Creation takes no more than 3 steps
- Form validation responds immediately (< 100ms)
- List refreshes in real-time after creation
- Support shortcut keys (Cmd/Ctrl + N) to trigger creation
\`\`\`

**Epic 3: Data Management**

\`\`\`
As a user,
I want to quickly search and filter my data,
So that I can find target content in large datasets.

Acceptance Criteria:
- Search response time < 300ms
- Support filtering by status, date, and keywords
- Filter conditions can be combined
- URL parameters remember filter state for sharing
\`\`\`

---

## 4. Technical Specifications

### 4.1 Tech Stack

${techStackEn}

#### Recommended Architecture

\`\`\`
Frontend         Backend          Infrastructure
──────────       ──────────       ──────────────
Next.js 14   →  API Routes    →  Vercel / Railway
TypeScript       Prisma ORM       PostgreSQL (Supabase)
Tailwind CSS     Auth.js          Redis (Cache)
shadcn/ui        Zod (Validation) S3 (File Storage)
\`\`\`

### 4.2 Non-Functional Requirements

| metric | requirement |
|--------|-------------|
| Page Load Time | LCP < 2s |
| API Latency | P99 < 500ms |
| Availability | 99.5% (monthly) |
| Concurrent Users | Support 500 CCU |
| Data Security | HTTPS everywhere, bcrypt password hashing |

### 4.3 Data Model (Draft)

\`\`\`prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  items     Item[]
}

model Item {
  id        String   @id @default(cuid())
  title     String
  status    Status   @default(DRAFT)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Status {
  DRAFT
  ACTIVE
  DONE
}
\`\`\`

---

## 5. Roadmap

### 5.1 Development Cycle (8 weeks)

| Milestone | Time | Content | Deliverable |
|-----------|------|---------|-------------|
| M1 · Infra | Week 1–2 | Project init, Auth system, DB schema | Loginable Shell |
| M2 · Core | Week 3–5 | Core business logic, CRUD, Lists | Alpha Version |
| M3 · Polish | Week 6–7 | UI optimization, error handling, tests | Beta Version |
| M4 · Launch | Week 8 | Production deploy, monitoring, docs | **v1.0 Release** |

### 5.2 Acceptance Criteria

${acceptanceEn}

**General Acceptance Criteria:**
- [ ] All core user story acceptance criteria passed
- [ ] Unit test coverage ≥ 70%
- [ ] Lighthouse performance score ≥ 85
- [ ] Fully mobile responsive (iOS / Android)
- [ ] Security scan passed, no high-risk vulnerabilities

---

## 6. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tech complexity | Medium | High | Weekly tech reviews, trim non-core features |
| Scope creep | High | Medium | Bi-weekly demos, gather feedback early |
| Dependency issues | Low | Medium | Use mature libraries, avoid single points of failure |

---

## 7. Appendix

### 7.1 Glossary

- **MVP**: Minimum Viable Product
- **PRD**: Product Requirements Document
- **LCP**: Largest Contentful Paint

### 7.2 References

- [System Design Primer](https://github.com/donnemartin/system-design-primer)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

---

*This document was automatically generated by Celadon · Zene based on your idea and clarification. To request changes, please submit an update via the iteration process.*
`;
  }

  const targetUser = answers[0] || "独立开发者 / 中小型团队";
  const mvpScope = answers[1] || "核心功能的 MVP 版本";
  const techStack = answers[2] || "现代 Web 技术栈（Next.js + PostgreSQL）";
  const acceptance = answers[3] || "核心功能可用，完成基础测试";

  return `# PRD · ${shortIdea}

> **版本** v0.1.0 &nbsp;·&nbsp; **日期** ${date} &nbsp;·&nbsp; **状态** 草稿  
> 由 Celadon · Zene 自动生成

---

## 1. 项目概述

### 1.1 背景与动机

${idea}

随着需求持续增长，市场需要一个专注、易用且可扩展的解决方案，帮助目标用户以更低的成本和更快的速度解决核心问题。

### 1.2 目标

- **主要目标**：在 8 周内交付可用的 MVP 版本
- **次要目标**：验证核心假设并收集真实用户反馈
- **长期目标**：基于数据驱动持续迭代，扩展功能边界

---

## 2. 目标用户

### 2.1 主要用户群体

${targetUser}

### 2.2 用户画像

**主要角色：核心用户**

| 属性 | 描述 |
|------|------|
| 技术能力 | 中级偏上，熟悉基本 Web 操作 |
| 使用频率 | 每周 3–5 次 |
| 核心痛点 | 现有工具效率低、学习曲线陡、集成困难 |
| 期望收益 | 节省时间、降低错误率、提升团队协作效率 |

---

## 3. 功能需求

### 3.1 MVP 功能范围

${mvpScope}

#### 3.1.1 核心功能（必须有）

- **用户认证系统**
  - 邮箱 + 密码注册/登录
  - OAuth 第三方登录（GitHub / Google）
  - Session 管理与安全退出

- **核心业务流程**
  - 创建、编辑、删除主要实体
  - 状态机管理（草稿 → 进行中 → 完成）
  - 实时状态更新与通知

- **数据管理**
  - 列表视图 + 搜索过滤
  - 分页加载（每页 20 条）
  - 数据导出（CSV / JSON）

#### 3.1.2 增强功能（可选）

- 团队协作与权限管理
- Webhook 与第三方集成
- 高级数据分析与图表
- 移动端适配

### 3.2 用户故事

**Epic 1：用户管理**

\`\`\`
作为一个新用户，
我希望可以通过邮箱注册账号，
以便开始使用产品的核心功能。

验收标准：
- 注册表单包含邮箱、密码、确认密码字段
- 密码强度校验（最少 8 位，含大小写和数字）
- 注册成功后自动跳转至 Dashboard
- 同一邮箱无法重复注册，提示友好错误信息
\`\`\`

**Epic 2：核心业务**

\`\`\`
作为已登录用户，
我希望可以快速创建一个新条目，
以便记录和跟踪我的工作进展。

验收标准：
- 创建操作不超过 3 步
- 表单校验即时响应（< 100ms）
- 创建成功后列表实时刷新
- 支持快捷键 (Cmd/Ctrl + N) 触发创建
\`\`\`

**Epic 3：数据查看与管理**

\`\`\`
作为用户，
我希望可以快速搜索和过滤我的数据，
以便在大量条目中找到目标内容。

验收标准：
- 搜索响应时间 < 300ms
- 支持按状态、日期、关键词过滤
- 过滤条件可组合使用
- URL 参数记忆过滤状态，支持分享
\`\`\`

---

## 4. 技术规格

### 4.1 技术栈

${techStack}

#### 推荐架构

\`\`\`
Frontend         Backend          Infrastructure
──────────       ──────────       ──────────────
Next.js 14   →  API Routes    →  Vercel / Railway
TypeScript       Prisma ORM       PostgreSQL (Supabase)
Tailwind CSS     Auth.js          Redis (缓存)
shadcn/ui        Zod (验证)       S3 (文件存储)
\`\`\`

### 4.2 非功能性要求

| 指标 | 要求 |
|------|------|
| 页面加载时间 | 首屏 < 2s (LCP) |
| API 响应时间 | P99 < 500ms |
| 可用性 | 99.5% (月均) |
| 并发用户 | 支持 500 同时在线 |
| 数据安全 | HTTPS 全程加密，密码 bcrypt 哈希 |

### 4.3 数据模型（草稿）

\`\`\`prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  items     Item[]
}

model Item {
  id        String   @id @default(cuid())
  title     String
  status    Status   @default(DRAFT)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Status {
  DRAFT
  ACTIVE
  DONE
}
\`\`\`

---

## 5. 里程碑计划

### 5.1 开发周期（8 周）

| 里程碑 | 时间 | 内容 | 交付物 |
|--------|------|------|--------|
| M1 · 基础架构 | Week 1–2 | 项目初始化、认证系统、数据库 schema | 可登录的空 Shell |
| M2 · 核心功能 | Week 3–5 | 主要业务流程、CRUD、列表页 | Alpha 内测版本 |
| M3 · 打磨与测试 | Week 6–7 | UI 优化、错误处理、单元测试 | Beta 版本 |
| M4 · 上线 | Week 8 | 生产部署、监控、文档 | **v1.0 正式版** |

### 5.2 验收标准

${acceptance}

**通用验收标准：**
- [ ] 所有核心用户故事的验收标准通过
- [ ] 单元测试覆盖率 ≥ 70%
- [ ] Lighthouse 性能评分 ≥ 85
- [ ] 移动端适配完整（iOS / Android）
- [ ] 安全扫描通过，无高危漏洞

---

## 6. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 技术复杂度超预期 | 中 | 高 | 每周技术评审，及时裁减非核心功能 |
| 用户需求变化 | 高 | 中 | 每两周 Demo，快速获取反馈 |
| 第三方依赖问题 | 低 | 中 | 优先使用成熟库，避免单点依赖 |

---

## 7. 附录

### 7.1 术语表

- **MVP**：最小可行产品（Minimum Viable Product）
- **PRD**：产品需求文档（Product Requirements Document）
- **LCP**：最大内容绘制时间（Largest Contentful Paint）

### 7.2 参考资料

- [系统设计最佳实践](https://github.com/donnemartin/system-design-primer)
- [Next.js 官方文档](https://nextjs.org/docs)
- [Prisma 官方文档](https://www.prisma.io/docs)

---

*本文档由 Celadon · Zene 自动生成，基于用户提交的想法和澄清信息。如需修改，请通过迭代流程提交更新请求。*
`;
}
