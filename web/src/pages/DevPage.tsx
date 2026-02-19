import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Zap, CheckCircle2, Loader2, Code2, Rocket,
  RefreshCw, FileText, MessageSquare, ChevronRight, Terminal,
  GitBranch, GitCommit, Play, Pause, SkipForward, AlertCircle,
  Folder, FolderOpen, File, ChevronDown, Package, Database,
  Cpu, Activity, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiDevRun } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentRole = "Planner" | "Executor" | "Reflector";
type LogType = "cmd" | "info" | "success" | "warn" | "error" | "agent";

interface LogLine {
  id: string;
  type: LogType;
  text: string;
  time: string;
  agent?: AgentRole;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  status?: "new" | "modified" | "unchanged";
  language?: string;
}

interface AgentState {
  role: AgentRole;
  task: string;
  status: "idle" | "thinking" | "working" | "done";
  loopCount: number;
}

interface CommitRecord {
  hash: string;
  message: string;
  time: string;
  files: number;
}

// ─── Pipeline bar ─────────────────────────────────────────────────────────────

const STAGES = [
  { id: "clarify", sub: "Clarify", Icon: MessageSquare },
  { id: "prd",     sub: "PRD",     Icon: FileText       },
  { id: "dev",     sub: "Dev",     Icon: Code2          },
  { id: "deploy",  sub: "Deploy",  Icon: Rocket         },
  { id: "iterate", sub: "Iterate", Icon: RefreshCw      },
];

function PipelineBar({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center gap-0">
      {STAGES.map((s, i) => {
        const done   = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-7 h-7 rounded-full border flex items-center justify-center transition-all",
                done   && "border-celadon bg-celadon/15",
                active && "border-celadon bg-celadon/10",
                !done && !active && "border-border bg-surface-2",
              )}>
                {done   ? <CheckCircle2 size={13} className="text-celadon" /> :
                 active ? <Loader2 size={13} className="text-celadon animate-spin" /> :
                          <s.Icon size={12} className="text-muted-foreground/30" />}
              </div>
              <span className={cn(
                "text-[9px] font-mono",
                (done || active) ? "text-celadon" : "text-muted-foreground/30",
              )}>
                {s.sub}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={cn("w-6 h-px mb-4", i < activeIndex ? "bg-celadon/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── File Tree ────────────────────────────────────────────────────────────────

const FILE_TREE: FileNode[] = [
  {
    name: "src", type: "folder", children: [
      { name: "app", type: "folder", children: [
        { name: "layout.tsx", type: "file", status: "new", language: "tsx" },
        { name: "page.tsx",   type: "file", status: "new", language: "tsx" },
      ]},
      { name: "components", type: "folder", children: [
        { name: "ui",        type: "folder", children: [
          { name: "button.tsx", type: "file", status: "unchanged" },
          { name: "card.tsx",   type: "file", status: "unchanged" },
        ]},
        { name: "BillingTable.tsx",    type: "file", status: "new",      language: "tsx" },
        { name: "SubscriptionCard.tsx", type: "file", status: "new",     language: "tsx" },
        { name: "RevenueChart.tsx",    type: "file", status: "modified", language: "tsx" },
      ]},
      { name: "lib", type: "folder", children: [
        { name: "stripe.ts",  type: "file", status: "new",      language: "ts" },
        { name: "prisma.ts",  type: "file", status: "new",      language: "ts" },
        { name: "utils.ts",   type: "file", status: "unchanged",              },
      ]},
      { name: "middleware", type: "folder", children: [
        { name: "auth.ts",    type: "file", status: "new", language: "ts" },
        { name: "rateLimit.ts", type: "file", status: "new", language: "ts" },
      ]},
    ],
  },
  { name: "prisma", type: "folder", children: [
    { name: "schema.prisma", type: "file", status: "new", language: "prisma" },
    { name: "migrations",    type: "folder", children: [
      { name: "20240118_init.sql", type: "file", status: "new" },
    ]},
  ]},
  { name: ".env.example",    type: "file", status: "new"       },
  { name: "package.json",    type: "file", status: "modified"  },
  { name: "tsconfig.json",   type: "file", status: "unchanged" },
];

const statusColors: Record<string, string> = {
  new:       "text-celadon",
  modified:  "text-stage-deploy",
  unchanged: "text-muted-foreground/30",
};

function FileTreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === "folder";

  return (
    <div>
      <button
        onClick={() => isFolder && setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-surface-2 transition-colors group text-left"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isFolder ? (
          open ? <FolderOpen size={12} className="text-stage-deploy/70 flex-shrink-0" /> 
               : <Folder    size={12} className="text-stage-deploy/50 flex-shrink-0" />
        ) : (
          <File size={12} className="text-muted-foreground/40 flex-shrink-0" />
        )}
        <span className={cn(
          "text-[11px] font-mono truncate flex-1",
          node.status ? statusColors[node.status] : "text-muted-foreground/60"
        )}>
          {node.name}
        </span>
        {node.status === "new"      && <span className="text-[9px] font-mono text-celadon/60 flex-shrink-0">N</span>}
        {node.status === "modified" && <span className="text-[9px] font-mono text-stage-deploy/60 flex-shrink-0">M</span>}
      </button>
      {isFolder && open && node.children?.map((child, i) => (
        <FileTreeNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─── Log line renderer ────────────────────────────────────────────────────────

const logStyles: Record<LogType, string> = {
  cmd:     "text-stage-clarify",
  info:    "text-muted-foreground/70",
  success: "text-celadon",
  warn:    "text-stage-deploy",
  error:   "text-destructive",
  agent:   "text-stage-prd",
};

const agentBadgeColors: Record<AgentRole, string> = {
  Planner:   "bg-stage-prd/15 text-stage-prd border-stage-prd/30",
  Executor:  "bg-stage-dev/15 text-stage-dev border-stage-dev/30",
  Reflector: "bg-stage-deploy/15 text-stage-deploy border-stage-deploy/30",
};

function LogRow({ log }: { log: LogLine }) {
  return (
    <div className="flex items-start gap-2 group py-0.5 hover:bg-surface-2/40 px-2 rounded">
      <span className="text-muted-foreground/25 font-mono text-[10px] flex-shrink-0 w-12 mt-px select-none">
        {log.time}
      </span>
      {log.agent && (
        <span className={cn(
          "text-[9px] font-mono px-1.5 py-px rounded border flex-shrink-0 mt-0.5",
          agentBadgeColors[log.agent]
        )}>
          {log.agent}
        </span>
      )}
      <span className={cn("text-[11px] font-mono break-all leading-relaxed", logStyles[log.type])}>
        {log.type === "cmd"     && <span className="text-muted-foreground/40 mr-1">$</span>}
        {log.type === "success" && <span className="mr-1">✓</span>}
        {log.type === "warn"    && <span className="mr-1">⚠</span>}
        {log.type === "error"   && <span className="mr-1">✗</span>}
        {log.text}
      </span>
    </div>
  );
}

// ─── Agent card ───────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentState }) {
  const colors: Record<AgentRole, { ring: string; dot: string; label: string }> = {
    Planner:   { ring: "border-stage-prd/30 bg-stage-prd/5",     dot: "bg-stage-prd",     label: "text-stage-prd"     },
    Executor:  { ring: "border-stage-dev/30 bg-stage-dev/5",     dot: "bg-stage-dev",     label: "text-stage-dev"     },
    Reflector: { ring: "border-stage-deploy/30 bg-stage-deploy/5", dot: "bg-stage-deploy", label: "text-stage-deploy" },
  };
  const c = colors[agent.role];

  return (
    <div className={cn("rounded-xl border p-3 transition-all", c.ring)}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          agent.status === "working"  && `${c.dot} animate-pulse`,
          agent.status === "thinking" && `${c.dot} opacity-60 animate-pulse`,
          agent.status === "done"     && "bg-celadon",
          agent.status === "idle"     && "bg-muted-foreground/20",
        )} />
        <span className={cn("text-xs font-mono font-semibold", c.label)}>{agent.role}</span>
        <span className="ml-auto text-[9px] font-mono text-muted-foreground/40">
          loop {agent.loopCount}
        </span>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
        {agent.task}
      </p>
      {agent.status !== "idle" && (
        <div className="mt-2 h-0.5 rounded-full bg-surface-3 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              agent.status === "done" ? "w-full bg-celadon" : `w-2/3 ${c.dot}`,
              agent.status === "working" && "animate-pulse"
            )}
          />
        </div>
      )}
    </div>
  );
}

// ─── Commits ──────────────────────────────────────────────────────────────────

function CommitList({ commits }: { commits: CommitRecord[] }) {
  return (
    <div className="space-y-2">
      {commits.map((c, i) => (
        <div key={i} className="flex items-start gap-2.5 group">
          <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
            <GitCommit size={12} className="text-celadon/60" />
            {i < commits.length - 1 && <div className="w-px h-4 bg-border" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-mono text-foreground/80 leading-relaxed truncate">
              {c.message}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono text-muted-foreground/30 font-semibold">{c.hash}</span>
              <span className="text-[9px] font-mono text-muted-foreground/25">· {c.files}个文件 · {c.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatItem({ icon: Icon, label, value, color = "text-foreground" }: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-2 border-r border-border last:border-0">
      <Icon size={12} className="text-muted-foreground/40" />
      <span className={cn("text-sm font-mono font-bold", color)}>{value}</span>
      <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Simulated log data ───────────────────────────────────────────────────────

const makeTime = (offsetSec: number) => {
  const d = new Date(Date.now() - offsetSec * 1000);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
};

const INITIAL_LOGS: LogLine[] = [
  { id: "1",  type: "cmd",     text: "zene start --prd prd-v0.1.0.md --model claude-3.5",    time: makeTime(310), agent: undefined },
  { id: "2",  type: "info",    text: "读取 PRD 文档，识别 12 个功能模块...",                    time: makeTime(308), agent: "Planner"  },
  { id: "3",  type: "agent",   text: "任务分解：[schema] [auth] [api] [stripe] [dashboard]",  time: makeTime(305), agent: "Planner"  },
  { id: "4",  type: "cmd",     text: "prisma init --datasource-provider postgresql",           time: makeTime(290), agent: undefined },
  { id: "5",  type: "success", text: "schema.prisma 初始化完成",                               time: makeTime(289), agent: "Executor" },
  { id: "6",  type: "info",    text: "生成数据模型：User, Subscription, Invoice, Plan...",     time: makeTime(285), agent: "Executor" },
  { id: "7",  type: "success", text: "prisma/schema.prisma 已写入 (89 行)",                   time: makeTime(280), agent: "Executor" },
  { id: "8",  type: "cmd",     text: "prisma migrate dev --name init",                         time: makeTime(275), agent: undefined },
  { id: "9",  type: "success", text: "迁移完成：20240118_init",                                time: makeTime(270), agent: "Executor" },
  { id: "10", type: "info",    text: "构建 NextAuth 认证系统 + JWT 策略...",                   time: makeTime(260), agent: "Executor" },
  { id: "11", type: "success", text: "middleware/auth.ts 已写入",                              time: makeTime(255), agent: "Executor" },
  { id: "12", type: "agent",   text: "校验 auth 中间件，发现缺少 rate limiting，触发修复",     time: makeTime(250), agent: "Reflector"},
  { id: "13", type: "warn",    text: "安全警告：/api 路由未受保护，自动添加中间件",              time: makeTime(248), agent: "Reflector"},
  { id: "14", type: "success", text: "middleware/rateLimit.ts 已写入",                         time: makeTime(244), agent: "Executor" },
  { id: "15", type: "info",    text: "构建 Stripe webhook handler...",                         time: makeTime(230), agent: "Executor" },
  { id: "16", type: "success", text: "lib/stripe.ts 已写入 (156 行)",                         time: makeTime(225), agent: "Executor" },
  { id: "17", type: "info",    text: "构建 API 路由：/subscriptions, /invoices, /plans...",    time: makeTime(200), agent: "Executor" },
  { id: "18", type: "success", text: "app/api/subscriptions/route.ts (243 行)",               time: makeTime(188), agent: "Executor" },
  { id: "19", type: "success", text: "app/api/invoices/route.ts (178 行)",                    time: makeTime(175), agent: "Executor" },
  { id: "20", type: "agent",   text: "Executor 完成 API 层，移交 Planner 确认前端结构",        time: makeTime(170), agent: "Planner"  },
  { id: "21", type: "info",    text: "规划 Dashboard 组件树：BillingTable, RevenueChart...",   time: makeTime(165), agent: "Planner"  },
  { id: "22", type: "info",    text: "构建 BillingTable 组件（虚拟滚动 + 排序）",              time: makeTime(140), agent: "Executor" },
  { id: "23", type: "success", text: "components/BillingTable.tsx 已写入 (312 行)",            time: makeTime(128), agent: "Executor" },
  { id: "24", type: "info",    text: "构建 RevenueChart (Recharts, 日/月/年视图)...",          time: makeTime(110), agent: "Executor" },
  { id: "25", type: "success", text: "components/RevenueChart.tsx 已写入 (201 行)",            time: makeTime(95),  agent: "Executor" },
  { id: "26", type: "agent",   text: "Reflector 审查：BillingTable 缺少 empty state，补充",   time: makeTime(85),  agent: "Reflector"},
  { id: "27", type: "success", text: "BillingTable empty state 已添加",                        time: makeTime(80),  agent: "Executor" },
  { id: "28", type: "info",    text: "运行 TypeScript 类型检查...",                             time: makeTime(60),  agent: undefined  },
  { id: "29", type: "success", text: "tsc --noEmit 通过，0 错误",                              time: makeTime(55),  agent: undefined  },
  { id: "30", type: "info",    text: "运行 ESLint...",                                          time: makeTime(50),  agent: undefined  },
  { id: "31", type: "warn",    text: "2 个 warning（unused import），自动修复",                 time: makeTime(48),  agent: "Reflector"},
  { id: "32", type: "success", text: "Lint 通过，代码质量检查完成",                             time: makeTime(44),  agent: undefined  },
];

const STREAM_LOGS: LogLine[] = [
  { id: "s1", type: "info",    text: "构建 SubscriptionCard 组件...",                          time: "",            agent: "Executor"  },
  { id: "s2", type: "success", text: "components/SubscriptionCard.tsx 已写入 (134 行)",        time: "",            agent: "Executor"  },
  { id: "s3", type: "info",    text: "集成 Stripe 计费周期与 webhook 事件处理...",             time: "",            agent: "Executor"  },
  { id: "s4", type: "agent",   text: "校验：webhook 签名验证逻辑正确，批准",                   time: "",            agent: "Reflector" },
  { id: "s5", type: "info",    text: "构建账单导出功能（CSV / PDF）...",                       time: "",            agent: "Executor"  },
  { id: "s6", type: "success", text: "lib/export.ts 已写入 (89 行)",                           time: "",            agent: "Executor"  },
  { id: "s7", type: "info",    text: "运行集成测试...",                                         time: "",            agent: undefined   },
  { id: "s8", type: "success", text: "12/12 测试通过 ✓",                                       time: "",            agent: undefined   },
];

const INITIAL_COMMITS: CommitRecord[] = [
  { hash: "a3f2d1",  message: "feat: initialize prisma schema with User, Subscription, Invoice",  time: "5分前",  files: 3 },
  { hash: "b7e4c2",  message: "feat: add NextAuth middleware + JWT strategy",                      time: "4分前",  files: 2 },
  { hash: "c1d8a3",  message: "feat: stripe webhook handler + lib/stripe.ts",                     time: "3分前",  files: 4 },
  { hash: "d2f5b4",  message: "feat: REST API endpoints /subscriptions /invoices",                time: "2分前",  files: 5 },
  { hash: "e9a3c5",  message: "feat: BillingTable + RevenueChart components",                     time: "1分前",  files: 3 },
  { hash: "f4b2d6",  message: "fix: add rate limiting middleware, eslint auto-fix",               time: "刚刚",   files: 2 },
];

const INITIAL_AGENTS: AgentState[] = [
  { role: "Planner",   task: "规划 Dashboard UI 结构，分配前端组件任务", status: "done",    loopCount: 4 },
  { role: "Executor",  task: "构建 SubscriptionCard 组件 + CSV 导出",    status: "working", loopCount: 7 },
  { role: "Reflector", task: "等待 Executor 完成，准备代码审查",          status: "idle",    loopCount: 4 },
];

const IDLE_AGENTS: AgentState[] = [
  { role: "Planner",   task: "等待启动开发", status: "idle", loopCount: 0 },
  { role: "Executor",  task: "等待启动开发", status: "idle", loopCount: 0 },
  { role: "Reflector", task: "等待启动开发", status: "idle", loopCount: 0 },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DevPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { idea?: string; sessionId?: string } | null;
  const idea = state?.idea ?? "未知项目";
  const sessionId = state?.sessionId ?? "";

  const [logs, setLogs]           = useState<LogLine[]>([]);
  const [commits, setCommits]     = useState<CommitRecord[]>([]);
  const [agents, setAgents]       = useState<AgentState[]>(IDLE_AGENTS);
  const [streamIdx, setStreamIdx] = useState(0);
  const [paused, setPaused]       = useState(false);
  const [activeTab, setActiveTab] = useState<"terminal" | "files" | "commits">("terminal");
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [loopCount, setLoopCount]   = useState(0);
  const [devStarted, setDevStarted] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError]     = useState("");

  const logsEndRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId && state?.idea) navigate("/", { replace: true });
  }, [sessionId, state, navigate]);

  const handleStartDev = async () => {
    if (!sessionId || devLoading) return;
    setDevLoading(true);
    setDevError("");
    try {
      await apiDevRun(sessionId, undefined, false);
      setDevStarted(true);
      setLogs(INITIAL_LOGS);
      setCommits(INITIAL_COMMITS);
      setAgents(INITIAL_AGENTS);
      setTotalFiles(14);
      setTotalLines(1347);
      setLoopCount(7);
    } catch (e) {
      setDevError(e instanceof Error ? e.message : "启动失败");
    } finally {
      setDevLoading(false);
    }
  };
  const streamTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Stream new log lines（仅在实际点击「启动开发」后）
  useEffect(() => {
    if (!devStarted || paused || streamIdx >= STREAM_LOGS.length) return;

    streamTimer.current = setTimeout(() => {
      const log = {
        ...STREAM_LOGS[streamIdx],
        time: makeTime(0),
        id: `s-${streamIdx}`,
      };
      setLogs((prev) => [...prev, log]);
      setStreamIdx((i) => i + 1);

      // Update stats
      if (log.type === "success") {
        setTotalFiles((f) => f + 1);
        setTotalLines((l) => l + Math.floor(50 + Math.random() * 150));
      }
      if (log.agent === "Reflector") {
        setLoopCount((c) => c + 1);
      }

      // Evolve agent states
      if (streamIdx === 1) {
        setAgents((prev) => prev.map((a) =>
          a.role === "Executor" ? { ...a, task: "集成 Stripe 计费周期 webhook 事件" } : a
        ));
      }
      if (streamIdx === 3) {
        setAgents((prev) => prev.map((a) =>
          a.role === "Reflector" ? { ...a, status: "working", task: "审查 webhook 签名验证逻辑" } : a
        ));
      }
      if (streamIdx === 5) {
        setAgents((prev) => prev.map((a) =>
          a.role === "Reflector" ? { ...a, status: "idle", task: "等待下一批代码提交" } : a
        ));
        setCommits((prev) => [
          ...prev,
          { hash: "g7c1e8", message: "feat: SubscriptionCard + export lib/export.ts", time: "刚刚", files: 2 },
        ]);
      }
      if (streamIdx === 7) {
        setAgents((prev) => prev.map((a) =>
          a.role === "Executor" ? { ...a, status: "done", task: "所有任务完成，等待部署" } : a
        ));
      }
    }, 1800 + Math.random() * 1000);

    return () => {
      if (streamTimer.current) clearTimeout(streamTimer.current);
    };
  }, [devStarted, streamIdx, paused]);

  const isDone = devStarted && streamIdx >= STREAM_LOGS.length;
  const progress = devStarted ? Math.round((streamIdx / STREAM_LOGS.length) * 100) : 0;

  const shortIdea = idea.length > 36 ? idea.slice(0, 33) + "..." : idea;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Back */}
          <button
            onClick={() => navigate("/prd", { state: { idea, sessionId } })}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">PRD</span>
          </button>

          {/* Pipeline */}
          <div className="flex-1 flex items-center justify-center">
            <div className="hidden md:block">
              <PipelineBar activeIndex={2} />
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {sessionId && !devStarted && (
              <button
                onClick={handleStartDev}
                disabled={devLoading}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all",
                  devLoading
                    ? "bg-surface-3 text-muted-foreground cursor-wait"
                    : "bg-celadon text-primary-foreground hover:bg-celadon-glow shadow-glow"
                )}
              >
                {devLoading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                {devLoading ? "启动中..." : "启动开发"}
              </button>
            )}
            {devError && <span className="text-xs text-destructive">{devError}</span>}
            {/* Pause/resume */}
            <button
              onClick={() => setPaused((p) => !p)}
              disabled={!devStarted || isDone}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all",
                !devStarted || isDone
                  ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                  : paused
                  ? "border-celadon/40 text-celadon bg-celadon/5 hover:bg-celadon/10"
                  : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
              )}
            >
              {paused ? <Play size={11} /> : <Pause size={11} />}
              {paused ? "继续" : "暂停"}
            </button>

            {/* Deploy CTA */}
            <button
              onClick={() => navigate("/deploy", { state: { idea, sessionId } })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow"
            >
              <Rocket size={11} />
              <span>部署</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col pt-14">

        {/* Stats strip */}
        <div className="border-b border-border bg-surface-1/60">
          <div className="max-w-screen-2xl mx-auto flex items-stretch">
            <StatItem icon={Cpu}      label="Zene 循环"  value={`${loopCount}x`}  color="text-stage-prd"     />
            <StatItem icon={File}     label="生成文件"    value={`${totalFiles}`}  color="text-celadon"       />
            <StatItem icon={Activity} label="代码行数"    value={totalLines.toLocaleString()} color="text-foreground" />
            <StatItem icon={GitBranch}label="提交"        value={`${commits.length}`} color="text-stage-deploy" />
            <StatItem icon={Package}  label="依赖"        value="23"              color="text-muted-foreground" />
            <div className="flex-1 flex items-center px-4 py-2">
              <div className="w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
                    {!devStarted ? "未启动" : isDone ? "开发完成" : paused ? "已暂停" : "进行中"}
                  </span>
                  <span className={cn(
                    "text-[9px] font-mono",
                    isDone ? "text-celadon" : "text-muted-foreground/50"
                  )}>{progress}%</span>
                </div>
                <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      isDone ? "bg-celadon" : "bg-stage-dev"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Three-column layout */}
        <div className="flex-1 flex overflow-hidden max-w-screen-2xl w-full mx-auto">

          {/* ── Left: File tree + project info ──────────────────────────────── */}
          <aside className="hidden xl:flex flex-col w-56 flex-shrink-0 border-r border-border bg-surface-1/40 overflow-hidden">
            {/* Project header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <GitBranch size={11} className="text-celadon/60 flex-shrink-0" />
                <span className="text-[10px] font-mono text-celadon truncate">main</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-celadon animate-pulse" />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/50 truncate">{shortIdea}</div>
            </div>

            {/* Legend */}
            <div className="px-3 py-2 border-b border-border flex items-center gap-3">
              <span className="text-[9px] font-mono text-celadon flex items-center gap-1"><span className="font-bold">N</span> 新建</span>
              <span className="text-[9px] font-mono text-stage-deploy flex items-center gap-1"><span className="font-bold">M</span> 修改</span>
            </div>

            {/* File tree */}
            <div className="flex-1 overflow-y-auto py-2">
              {devStarted ? (
                FILE_TREE.map((node, i) => (
                  <FileTreeNode key={i} node={node} />
                ))
              ) : (
                <div className="px-3 py-4 text-[11px] font-mono text-muted-foreground/50 text-center">
                  启动开发后将显示工作区
                </div>
              )}
            </div>
          </aside>

          {/* ── Center: Terminal + tabs ──────────────────────────────────────── */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-border">
            {/* Tab bar */}
            <div className="flex items-center gap-0 border-b border-border bg-surface-1/60 flex-shrink-0">
              {(["terminal", "files", "commits"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono border-r border-border transition-colors",
                    activeTab === tab
                      ? "bg-background text-foreground border-b border-b-background"
                      : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-surface-2/40"
                  )}
                >
                  {tab === "terminal" && <Terminal size={11} />}
                  {tab === "files"    && <FolderOpen size={11} />}
                  {tab === "commits"  && <GitCommit size={11} />}
                  {{
                    terminal: "终端",
                    files:    "文件",
                    commits:  "提交",
                  }[tab]}
                </button>
              ))}
              {/* Live indicator */}
              {devStarted && !isDone && !paused && (
                <div className="ml-auto mr-3 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-celadon animate-pulse" />
                  <span className="text-[9px] font-mono text-celadon">LIVE</span>
                </div>
              )}
            </div>

            {/* Terminal tab */}
            {activeTab === "terminal" && (
              <div className="flex-1 overflow-y-auto bg-background/60 p-3 font-mono">
                <div className="space-y-0.5">
                  {logs.length === 0 ? (
                    <div className="flex items-center gap-2 py-2 px-2 text-muted-foreground/60 text-[11px]">
                      <span className="text-muted-foreground/25 text-[10px] w-12 select-none">$</span>
                      <span>点击右上角「启动开发」开始 Zene 开发任务</span>
                    </div>
                  ) : (
                    <>
                      {logs.map((log) => <LogRow key={log.id} log={log} />)}
                      {!isDone && !paused && (
                        <div className="flex items-center gap-2 py-0.5 px-2">
                          <span className="text-muted-foreground/25 text-[10px] w-12 select-none">now</span>
                          <span className="text-celadon cursor-blink" />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div ref={logsEndRef} />
              </div>
            )}

            {/* Files tab */}
            {activeTab === "files" && (
              <div className="flex-1 overflow-y-auto bg-background/60 p-4">
                <div className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-4">
                  已生成文件 · {totalFiles} 个
                </div>
                {devStarted ? (
                  FILE_TREE.map((node, i) => (
                    <FileTreeNode key={i} node={node} depth={0} />
                  ))
                ) : (
                  <div className="text-[11px] font-mono text-muted-foreground/50 py-4 text-center">
                    启动开发后将显示
                  </div>
                )}
              </div>
            )}

            {/* Commits tab */}
            {activeTab === "commits" && (
              <div className="flex-1 overflow-y-auto bg-background/60 p-4">
                <div className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-4">
                  提交历史 · {commits.length} 个
                </div>
                <CommitList commits={[...commits].reverse()} />
              </div>
            )}
          </main>

          {/* ── Right: Agent states + activity ──────────────────────────────── */}
          <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 overflow-hidden">

            {/* Agent states */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={11} className="text-muted-foreground/40" />
                <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                  Zene Agent 状态
                </span>
              </div>
              <div className="space-y-2">
                {agents.map((agent) => (
                  <AgentCard key={agent.role} agent={agent} />
                ))}
              </div>
            </div>

            {/* Recent commits */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 mb-3">
                <GitCommit size={11} className="text-muted-foreground/40" />
                <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                  近期提交
                </span>
              </div>
              <CommitList commits={[...commits].reverse().slice(0, 5)} />
            </div>

            {/* Bottom: deploy CTA */}
            <div className="p-4 border-t border-border bg-surface-1/40">
              {isDone ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-celadon" />
                    <span className="text-xs font-mono text-celadon font-semibold">开发完成</span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed">
                    {commits.length} 次提交 · {totalFiles} 个文件 · {totalLines.toLocaleString()} 行代码
                  </div>
                  <button
                    onClick={() => navigate("/deploy", { state: { idea, sessionId } })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow"
                  >
                    <Rocket size={12} />
                    <span>部署到生产环境</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 size={11} className="text-stage-dev animate-spin" />
                    <span className="text-[10px] font-mono text-stage-dev">
                      {paused ? "已暂停" : "开发进行中..."}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate("/deploy", { state: { idea, sessionId } })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-celadon/30 text-celadon text-xs font-mono hover:bg-celadon/8 transition-colors"
                  >
                    <SkipForward size={11} />
                    <span>跳过，直接部署</span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
