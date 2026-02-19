import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IdeaInput } from "@/components/IdeaInput";
import { apiStart } from "@/lib/api";
import { PipelineStages } from "@/components/PipelineStages";
import { ProjectCard } from "@/components/ProjectCard";
import { StageDetail } from "@/components/StageDetail";
import { Zap, Github, Terminal, ChevronRight, ArrowUpRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const DEMO_PROJECTS = [
  {
    name: "saas-billing-dashboard",
    description: "帮助独立开发者管理 SaaS 订阅与账单的后台管理系统，支持多货币与税率配置",
    activeStage: "dev",
    completedStages: ["clarify", "prd"],
    lastActivity: "3 分钟前",
    commitCount: 12,
  },
  {
    name: "ai-code-reviewer",
    description: "基于大模型的代码审查工具，自动检测安全漏洞、性能问题和代码规范",
    activeStage: undefined,
    completedStages: ["clarify", "prd", "dev", "deploy"],
    lastActivity: "2 小时前",
    commitCount: 47,
    deployUrl: "https://example.com",
  },
  {
    name: "openapi-collab",
    description: "实时协作的 API 设计平台，支持团队共同编写 OpenAPI 3.1 规范",
    activeStage: "clarify",
    completedStages: [],
    lastActivity: "刚刚",
    commitCount: 0,
  },
];

const DEMO_LOGS = [
  { type: "cmd" as const, text: "zene plan --task 'Implement billing module'", time: "12:01" },
  { type: "info" as const, text: "Planner: 分解任务为 8 个子任务", time: "12:01" },
  { type: "info" as const, text: "Executor: 生成数据库 schema (users, subscriptions, invoices)", time: "12:02" },
  { type: "success" as const, text: "schema.prisma 已写入", time: "12:02" },
  { type: "cmd" as const, text: "zene exec --subtask 'Build REST API endpoints'", time: "12:03" },
  { type: "info" as const, text: "Executor: 编写 /api/subscriptions CRUD", time: "12:03" },
  { type: "success" as const, text: "routes/subscriptions.ts 已写入 (243 行)", time: "12:04" },
  { type: "info" as const, text: "Reflector: 检测到缺少认证中间件，自动修复...", time: "12:04" },
  { type: "success" as const, text: "middleware/auth.ts 已写入", time: "12:05" },
];

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const clarificationDone = (location.state as { clarificationDone?: boolean })?.clarificationDone;
  const returnedIdea = (location.state as { idea?: string })?.idea ?? "";

  const [selectedProject, setSelectedProject] = useState<string | null>("saas-billing-dashboard");
  const [showPipeline, setShowPipeline] = useState(!!clarificationDone);
  const [idea, setIdea] = useState(returnedIdea);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  const handleIdeaSubmit = async (newIdea: string) => {
    setStarting(true);
    setStartError("");
    try {
      const res = await apiStart(newIdea);
      navigate("/clarify", {
        state: {
          idea: newIdea,
          sessionId: res.session_id,
          projectName: res.project_name,
          initialConversation: res.conversation,
        },
      });
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "启动失败");
    } finally {
      setStarting(false);
    }
  };

  const handleReset = () => {
    setIdea("");
    setShowPipeline(false);
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-celadon flex items-center justify-center">
              <Zap size={14} className="text-primary-foreground" />
            </div>
            <span className="font-mono font-bold text-sm text-foreground tracking-tight">
              celadon
            </span>
            <span className="font-mono text-xs text-muted-foreground/50 border border-border px-1.5 py-0.5 rounded">
              v0.1.0
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              文档
            </a>
            <a href="#" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              API
            </a>
            <a
              href="#"
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github size={13} />
              <span>GitHub</span>
            </a>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow">
              <Terminal size={12} />
              开始使用
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-14 overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--surface-border) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--surface-border) / 0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-celadon/30 bg-celadon/8 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-celadon animate-pulse-dot" />
            <span className="text-xs font-mono text-celadon">
              持续交互式开发流程 · Continuous Interactive Dev
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-tight">
            <span className="text-foreground">把</span>
            <span className="text-celadon font-mono"> 想法 </span>
            <span className="text-foreground">变成</span>
            <br />
            <span className="text-foreground">可部署的软件</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
            提交一个想法，Celadon 自动完成需求澄清、PRD 生成、AI 驱动开发与部署。
            <br />
            <span className="text-muted-foreground/60 text-sm font-mono">
              Powered by Zene · Planner / Executor / Reflector loop
            </span>
          </p>

          {/* Idea Input / Post-clarification result */}
          {!showPipeline ? (
            <div className="max-w-2xl mx-auto animate-fade-in">
              {startError && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {startError}
                </div>
              )}
              <IdeaInput onSubmit={handleIdeaSubmit} disabled={starting} />
              <p className="text-xs font-mono text-muted-foreground/40 mt-3 text-center">
                支持中英文描述 · 无需精确规格 · AI 会帮你澄清
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="rounded-xl border border-celadon/40 bg-surface-1 p-5 shadow-celadon text-left mb-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-6 h-6 rounded-full bg-celadon/15 border border-celadon/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap size={12} className="text-celadon" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{idea}</p>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-celadon">pipeline 已启动 · 澄清完成</span>
                  </div>
                  <PipelineStages activeStage="prd" completedStages={["clarify"]} />
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-xs font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                ← 重新输入
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Pipeline overview */}
      <section className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              流程概览
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <PipelineStages
            activeStage="dev"
            completedStages={["clarify", "prd"]}
            className="max-w-2xl"
          />
        </div>
      </section>

      {/* Main content: Projects + Detail */}
      <section className="py-8 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects sidebar */}
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  项目
                </span>
                <button className="flex items-center gap-1 text-xs font-mono text-celadon/70 hover:text-celadon transition-colors">
                  <span>查看全部</span>
                  <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-3">
                {DEMO_PROJECTS.map((project) => (
                  <ProjectCard
                    key={project.name}
                    {...project}
                    onClick={() => setSelectedProject(project.name)}
                    className={
                      selectedProject === project.name
                        ? "border-celadon/40 bg-surface-1"
                        : ""
                    }
                  />
                ))}
              </div>
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  {selectedProject ?? "选择项目"}
                </span>
                {selectedProject && (
                  <button className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                    <span>查看仓库</span>
                    <ArrowUpRight size={12} />
                  </button>
                )}
              </div>

              {selectedProject === "saas-billing-dashboard" ? (
                <div className="space-y-3">
                  <StageDetail
                    stageName="澄清"
                    stageSubtitle="Clarify"
                    status="done"
                    logs={[
                      { type: "cmd", text: "clarify --idea 'SaaS billing dashboard'", time: "11:58" },
                      { type: "info", text: "识别到 3 个模糊点，发起澄清对话...", time: "11:58" },
                      { type: "success", text: "验收标准已确认：多货币、Stripe 集成、角色权限", time: "12:00" },
                    ]}
                    output="范围：独立开发者后台，支持 Stripe webhook，多角色（Admin/Viewer）。技术栈：Next.js 14 + Prisma + PostgreSQL。"
                  />
                  <StageDetail
                    stageName="需求文档"
                    stageSubtitle="PRD"
                    status="done"
                    logs={[
                      { type: "cmd", text: "generate-prd --from clarification.json", time: "12:00" },
                      { type: "success", text: "PRD v1.0 生成完成 (1,847 words)", time: "12:01" },
                    ]}
                    output="PRD 包含 12 个功能模块、5 个非功能性要求、3 个 Milestone。已导出为 docs/prd.md。"
                  />
                  <StageDetail
                    stageName="开发"
                    stageSubtitle="Development · Zene"
                    status="active"
                    logs={DEMO_LOGS}
                  />
                  <StageDetail
                    stageName="部署"
                    stageSubtitle="Deploy"
                    status="pending"
                    logs={[]}
                  />
                  <StageDetail
                    stageName="迭代"
                    stageSubtitle="Iterate"
                    status="pending"
                    logs={[]}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-surface-1 h-64 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground font-mono">
                    ← 选择一个项目查看详情
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-celadon flex items-center justify-center">
              <Zap size={11} className="text-primary-foreground" />
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              celadon · idea → software
            </span>
          </div>
          <span className="text-xs font-mono text-muted-foreground/40">
            powered by Zene
          </span>
        </div>
      </footer>
    </div>
  );
}
