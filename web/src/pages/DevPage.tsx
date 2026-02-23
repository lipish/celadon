import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Zap, CheckCircle2, Loader2, Code2, Rocket,
  RefreshCw, FileText, MessageSquare, ChevronRight, Terminal,
  GitBranch, GitCommit, Play, Pause, SkipForward, AlertCircle,
  Folder, FolderOpen, File, ChevronDown, Package, Database,
  Cpu, Activity, Eye, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiDevRun, apiDevStream, apiDevFiles, apiDevFileContent } from "@/lib/api";
import { useLocale } from "@/contexts/LocaleContext";

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
  path: string;
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
  { id: "clarify", sub: "stageClarify", Icon: MessageSquare },
  { id: "prd", sub: "stagePrd", Icon: FileText },
  { id: "dev", sub: "stageDev", Icon: Code2 },
  { id: "deploy", sub: "stageDeploy", Icon: Rocket },
  { id: "iterate", sub: "stageIterate", Icon: RefreshCw },
];

function PipelineBar({ activeIndex }: { activeIndex: number }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-0">
      {STAGES.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-7 h-7 rounded-full border flex items-center justify-center transition-all",
                done && "border-celadon bg-celadon/15",
                active && "border-celadon bg-celadon/10",
                !done && !active && "border-border bg-surface-2",
              )}>
                {done ? <CheckCircle2 size={13} className="text-celadon" /> :
                  active ? <Loader2 size={13} className="text-celadon animate-spin" /> :
                    <s.Icon size={12} className="text-muted-foreground/30" />}
              </div>
              <span className={cn(
                "text-[9px] font-mono",
                (done || active) ? "text-celadon" : "text-muted-foreground/30",
              )}>
                {t(s.sub)}
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

// ─── File Tree Initialized by Backend ──────────────────────────────────────

const statusColors: Record<string, string> = {
  new: "text-celadon",
  modified: "text-stage-deploy",
  unchanged: "text-muted-foreground/30",
};

function FileTreeNode({ node, depth = 0, onFileClick }: { node: FileNode; depth?: number; onFileClick?: (node: FileNode) => void }) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === "folder";

  return (
    <div className="mb-0.5">
      <button
        onClick={() => isFolder ? setOpen(!open) : onFileClick?.(node)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-secondary/80 transition-all group text-left relative"
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
        <div className="flex-shrink-0 w-4 flex justify-center">
          {isFolder ? (
            open ? <FolderOpen size={14} className="text-primary/70" />
              : <Folder size={14} className="text-primary/50" />
          ) : (
            <File size={14} className="text-muted-foreground/40" />
          )}
        </div>
        <span className={cn(
          "text-xs font-sans font-medium truncate flex-1 tracking-tight",
          node.status ? statusColors[node.status] : "text-foreground/80 group-hover:text-primary transition-colors"
        )}>
          {node.name}
        </span>
        {node.status === "new" && <span className="text-[9px] font-mono font-bold text-green-500 bg-green-50 px-1 rounded flex-shrink-0">NEW</span>}
        {node.status === "modified" && <span className="text-[9px] font-mono font-bold text-blue-500 bg-blue-50 px-1 rounded flex-shrink-0">MOD</span>}
      </button>
      {isFolder && open && node.children?.map((child, i) => (
        <FileTreeNode key={i} node={child} depth={depth + 1} onFileClick={onFileClick} />
      ))}
    </div>
  );
}

// ─── Log line renderer ────────────────────────────────────────────────────────

const logStyles: Record<LogType, string> = {
  cmd: "text-stage-clarify",
  info: "text-muted-foreground/70",
  success: "text-celadon",
  warn: "text-stage-deploy",
  error: "text-destructive",
  agent: "text-stage-prd",
};

const agentBadgeColors: Record<AgentRole, string> = {
  Planner: "bg-stage-prd/15 text-stage-prd border-stage-prd/30",
  Executor: "bg-stage-dev/15 text-stage-dev border-stage-dev/30",
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
        {log.type === "cmd" && <span className="text-muted-foreground/40 mr-1">$</span>}
        {log.type === "success" && <span className="mr-1">✓</span>}
        {log.type === "warn" && <span className="mr-1">⚠</span>}
        {log.type === "error" && <span className="mr-1">✗</span>}
        {log.text}
      </span>
    </div>
  );
}

// ─── Agent card ───────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentState }) {
  const { t } = useLocale();
  const colors: Record<AgentRole, { ring: string; dot: string; label: string; bg: string }> = {
    Planner: { ring: "border-stage-prd/20", dot: "bg-stage-prd", label: "text-stage-prd", bg: "bg-stage-prd/5" },
    Executor: { ring: "border-stage-dev/20", dot: "bg-stage-dev", label: "text-stage-dev", bg: "bg-stage-dev/5" },
    Reflector: { ring: "border-stage-deploy/20", dot: "bg-stage-deploy", label: "text-stage-deploy", bg: "bg-stage-deploy/5" },
  };
  const c = colors[agent.role];

  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-all hover:shadow-card bg-surface-1",
      c.ring
    )}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={cn(
          "w-2.5 h-2.5 rounded-full flex-shrink-0",
          agent.status === "working" && `${c.dot} animate-pulse shadow-glow`,
          agent.status === "thinking" && `${c.dot} opacity-60 animate-pulse`,
          agent.status === "done" && "bg-stage-deploy",
          agent.status === "idle" && "bg-muted-foreground/20",
        )} />
        <span className={cn("text-xs font-sans font-bold tracking-tight", c.label)}>{agent.role}</span>
        <span className="ml-auto text-[10px] font-mono font-bold text-muted-foreground/30">
          Loops: {agent.loopCount}
        </span>
      </div>
      <p className="text-[11px] font-sans font-medium text-foreground/70 leading-relaxed mb-3">
        {agent.task}
      </p>
      {agent.status !== "idle" && (
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              agent.status === "done" ? "w-full bg-stage-deploy" : `w-2/3 ${c.dot}`,
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
  const { t } = useLocale();
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
              <span className="text-[9px] font-mono text-muted-foreground/25">· {c.files}{t("filesCount")} · {c.time}</span>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DevPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale, setLocale } = useLocale();
  const state = location.state as { idea?: string; sessionId?: string } | null;
  const idea = state?.idea ?? t("unknownProject");
  const sessionId = state?.sessionId ?? "";

  // ─── Mock Data Inside Component ─────────────────────────────────────────────
  const IDLE_AGENTS: AgentState[] = [
    { role: "Planner", task: t("mockAgentIdle"), status: "idle", loopCount: 0 },
    { role: "Executor", task: t("mockAgentIdle"), status: "idle", loopCount: 0 },
    { role: "Reflector", task: t("mockAgentIdle"), status: "idle", loopCount: 0 },
  ];

  const INITIAL_LOGS: LogLine[] = [
    { id: "1", type: "cmd", text: "zene start --prd prd-v0.1.0.md --model claude-3.5", time: makeTime(310), agent: undefined },
    { id: "2", type: "info", text: t("mockLogReadPrd"), time: makeTime(308), agent: "Planner" },
    { id: "3", type: "agent", text: t("mockLogTaskSplit"), time: makeTime(305), agent: "Planner" },
    { id: "4", type: "cmd", text: "prisma init --datasource-provider postgresql", time: makeTime(290), agent: undefined },
    { id: "5", type: "success", text: t("mockLogSchemaInit"), time: makeTime(289), agent: "Executor" },
    { id: "6", type: "info", text: t("mockLogGeneratingModels"), time: makeTime(285), agent: "Executor" },
    { id: "7", type: "success", text: t("mockLogSchemaWritten"), time: makeTime(280), agent: "Executor" },
    { id: "8", type: "cmd", text: "prisma migrate dev --name init", time: makeTime(275), agent: undefined },
    { id: "9", type: "success", text: t("mockLogMigrateDone"), time: makeTime(270), agent: "Executor" },
    { id: "10", type: "info", text: t("mockLogAuthSystem"), time: makeTime(260), agent: "Executor" },
    { id: "11", type: "success", text: t("mockLogAuthWritten"), time: makeTime(255), agent: "Executor" },
    { id: "12", type: "agent", text: t("mockLogAuthCheck"), time: makeTime(250), agent: "Reflector" },
    { id: "13", type: "warn", text: t("mockLogSecurityWarn"), time: makeTime(248), agent: "Reflector" },
    { id: "14", type: "success", text: t("mockLogRateLimitWritten"), time: makeTime(244), agent: "Executor" },
    { id: "15", type: "info", text: t("mockLogStripeHandler"), time: makeTime(230), agent: "Executor" },
    { id: "16", type: "success", text: t("mockLogStripeWritten"), time: makeTime(225), agent: "Executor" },
    { id: "17", type: "info", text: t("mockLogBuildApi"), time: makeTime(200), agent: "Executor" },
    { id: "18", type: "success", text: `app/api/subscriptions/route.ts (243 ${t("linesCount")})`, time: makeTime(188), agent: "Executor" },
    { id: "19", type: "success", text: `app/api/invoices/route.ts (178 ${t("linesCount")})`, time: makeTime(175), agent: "Executor" },
    { id: "20", type: "agent", text: t("mockLogApiFinish"), time: makeTime(170), agent: "Planner" },
    { id: "21", type: "info", text: t("mockLogPlanDashboard"), time: makeTime(165), agent: "Planner" },
    { id: "22", type: "info", text: t("mockLogBuildBilling"), time: makeTime(140), agent: "Executor" },
    { id: "23", type: "success", text: t("mockLogBillingWritten"), time: makeTime(128), agent: "Executor" },
    { id: "24", type: "info", text: t("mockLogBuildChart"), time: makeTime(110), agent: "Executor" },
    { id: "25", type: "success", text: t("mockLogChartWritten"), time: makeTime(95), agent: "Executor" },
    { id: "26", type: "agent", text: t("mockLogReflectorReview"), time: makeTime(85), agent: "Reflector" },
    { id: "27", type: "success", text: t("mockLogEmptyStateAdded"), time: makeTime(80), agent: "Executor" },
    { id: "28", type: "info", text: t("mockLogTsc"), time: makeTime(60), agent: undefined },
    { id: "29", type: "success", text: t("mockLogTscPass"), time: makeTime(55), agent: undefined },
    { id: "30", type: "info", text: t("mockLogEslint"), time: makeTime(50), agent: undefined },
    { id: "31", type: "warn", text: t("mockLogLintFix"), time: makeTime(48), agent: "Reflector" },
    { id: "32", type: "success", text: t("mockLogLintDone"), time: makeTime(44), agent: undefined },
  ];



  const INITIAL_COMMITS: CommitRecord[] = [
    { hash: "a3f2d1", message: "feat: initialize prisma schema with User, Subscription, Invoice", time: locale === "zh" ? "5分前" : "5m ago", files: 3 },
    { hash: "b7e4c2", message: "feat: add NextAuth middleware + JWT strategy", time: locale === "zh" ? "4分前" : "4m ago", files: 2 },
    { hash: "c1d8a3", message: "feat: stripe webhook handler + lib/stripe.ts", time: locale === "zh" ? "3分前" : "3m ago", files: 4 },
    { hash: "d2f5b4", message: "feat: REST API endpoints /subscriptions /invoices", time: locale === "zh" ? "2分前" : "2m ago", files: 5 },
    { hash: "e9a3c5", message: "feat: BillingTable + RevenueChart components", time: locale === "zh" ? "1分前" : "1m ago", files: 3 },
    { hash: "f4b2d6", message: "fix: add rate limiting middleware, eslint auto-fix", time: locale === "zh" ? "刚刚" : "just now", files: 2 },
  ];

  const INITIAL_AGENTS: AgentState[] = [
    { role: "Planner", task: t("mockAgentPlanTask"), status: "done", loopCount: 4 },
    { role: "Executor", task: t("mockAgentExecTask"), status: "working", loopCount: 7 },
    { role: "Reflector", task: t("mockAgentReflectTask"), status: "idle", loopCount: 4 },
  ];

  const [logs, setLogs] = useState<LogLine[]>([]);
  const [commits, setCommits] = useState<CommitRecord[]>([]);
  const [agents, setAgents] = useState<AgentState[]>(IDLE_AGENTS);
  const [streamIdx, setStreamIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<"terminal" | "files" | "commits">("terminal");
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [devStarted, setDevStarted] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [previewFile, setPreviewFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (sessionId) {
      apiDevFiles(sessionId).then(res => setFileTree(res as unknown as FileNode[])).catch(console.error);
    }
  }, [sessionId]);

  const handleFileClick = async (node: FileNode) => {
    if (node.type === "folder") return;
    setPreviewLoading(true);
    setPreviewFile({ path: node.path, name: node.name, content: "" });
    try {
      const content = await apiDevFileContent(node.path, sessionId);
      setPreviewFile({ path: node.path, name: node.name, content });
    } catch (e: any) {
      setPreviewFile({ path: node.path, name: node.name, content: `Error: ${e.message}` });
    } finally {
      setPreviewLoading(false);
    }
  };

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
      setLogs([]);
      setCommits([]);
      setAgents(INITIAL_AGENTS);
      setTotalFiles(0);
      setTotalLines(0);
      setLoopCount(0);
    } catch (e) {
      setDevError(e instanceof Error ? e.message : t("startError"));
    } finally {
      setDevLoading(false);
    }
  };
  const streamTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll terminal only if tracking bottom
  useEffect(() => {
    if (autoScrollRef.current && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleTerminalScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    // If user scrolls up more than 30px from bottom, disable auto-scroll
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 30;
  };

  // Stream new log lines from backend SSE
  useEffect(() => {
    if (!devStarted || paused) return;

    const source = apiDevStream(sessionId);

    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        setLogs(prev => {
          let newLogs = [...prev];
          const lastLog = newLogs.length > 0 ? newLogs[newLogs.length - 1] : null;

          switch (event.type) {
            case 'ThoughtDelta':
              if (lastLog && lastLog.type === "agent") {
                newLogs[newLogs.length - 1] = { ...lastLog, text: lastLog.text + event.data };
              } else {
                newLogs.push({
                  id: Math.random().toString(),
                  type: "agent",
                  text: event.data,
                  time: makeTime(0),
                  agent: "Executor"
                });
              }
              break;
            case 'ToolCall':
              const toolName = event.data.name;
              // Provide a fallback if arguments is string or object
              let argsStr = typeof event.data.arguments === 'string'
                ? event.data.arguments
                : JSON.stringify(event.data.arguments || {});
              if (argsStr === "{}" || argsStr === '""' || argsStr === "") argsStr = "";
              const cmd = argsStr ? `${toolName} ${argsStr}` : toolName;

              if (lastLog && lastLog.type === "cmd" && lastLog.text.startsWith(toolName)) {
                // The backend might be streaming the tool call in parts, update in place
                newLogs[newLogs.length - 1] = { ...lastLog, text: cmd };
              } else {
                newLogs.push({
                  id: Math.random().toString(),
                  type: "cmd",
                  text: cmd,
                  time: makeTime(0)
                });
              }
              break;
            case 'ToolResult':
              newLogs.push({
                id: Math.random().toString(),
                type: "info",
                text: (event.data.result || "").substring(0, 150) + "...",
                time: makeTime(0)
              });
              setLoopCount(c => c + 1);
              break;
            case 'FileStateChanged':
              setTotalFiles(f => f + 1);
              setTotalLines(l => l + Math.floor(20 + Math.random() * 50));
              newLogs.push({
                id: Math.random().toString(),
                type: "info",
                text: `[File ${event.data?.change_type}] ${event.data?.path}`,
                time: makeTime(0)
              });
              break;
            case 'Finished':
              setIsDone(true);
              newLogs.push({
                id: Math.random().toString(),
                type: "info",
                text: "✅ Execution Completed!",
                time: makeTime(0)
              });
              source.close();
              break;
            case 'Error':
              setDevError(event.data?.message || "Execution Error");
              setIsDone(true);
              source.close();
              break;
          }
          return newLogs;
        });

      } catch (err) { }
    };

    source.onerror = () => {
      setIsDone(true);
      source.close();
    };

    return () => {
      source.close();
    };
  }, [devStarted, paused, sessionId]);

  const progress = devStarted ? (isDone ? 100 : Math.min(99, Math.round(logs.length * 1.5))) : 0;

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
                {devLoading ? t("devStarting") : t("devStartButton")}
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
              {paused ? t("devContinue") : t("devPause")}
            </button>

            {/* Deploy CTA */}
            <button
              onClick={() => navigate("/deploy", { state: { idea, sessionId } })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow"
            >
              <Rocket size={11} />
              <span>{t("devDeploy")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden pt-14">
        {/* Left Column: Chat & Agent Logs */}
        <aside className="w-80 border-r border-border bg-surface-2 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border bg-background">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={14} className="text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider">{t("devAgents")}</h2>
            </div>
            <div className="space-y-3">
              {agents.map((agent) => (
                <AgentCard key={agent.role} agent={agent} />
              ))}
            </div>
          </div>

          {/* Activity / Chat Log */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("devTerminal")}</span>
              {devStarted && !isDone && !paused && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[9px] font-mono text-primary font-bold">LIVE</span>
                </div>
              )}
            </div>
            <div
              className="flex-1 overflow-y-auto p-2 space-y-0.5 bg-background/50 font-mono"
              ref={terminalRef}
              onScroll={handleTerminalScroll}
            >
              {logs.length === 0 ? (
                <div className="px-2 py-4 text-center text-muted-foreground/40 text-[10px]">
                  {t("devWorkspaceEmpty")}
                </div>
              ) : (
                <>
                  {logs.map((log) => <LogRow key={log.id} log={log} />)}
                  {!isDone && !paused && (
                    <div className="flex items-center gap-2 py-0.5 px-2">
                      <span className="text-primary cursor-blink" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Middle Column: File Tree */}
        <aside className="w-64 border-r border-border bg-surface-1 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-border bg-background flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">{t("devFiles")}</span>
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono font-bold text-muted-foreground">{totalFiles}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {fileTree.length > 0 ? (
              fileTree.map((node, i) => (
                <FileTreeNode key={i} node={node} onFileClick={handleFileClick} />
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground/30 text-[10px] font-mono">
                {t("devWorkspaceEmpty")}
              </div>
            )}
          </div>
          {/* Commit History (minimized) */}
          <div className="p-3 border-t border-border bg-surface-2">
            <div className="flex items-center gap-2 mb-2">
              <GitCommit size={12} className="text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("devActivity")}</span>
            </div>
            <div className="max-h-32 overflow-y-auto">
              <CommitList commits={commits.slice(-3)} />
            </div>
          </div>
        </aside>

        {/* Right Column: Main Workspace */}
        <main className="flex-1 flex flex-col bg-background min-w-0">
          <div className="h-12 border-b border-border bg-surface-1 flex items-center px-2">
            <button
              onClick={() => setActiveTab("terminal")}
              className={cn(
                "h-9 px-4 text-xs font-bold flex items-center gap-2 rounded-lg transition-all mx-1",
                activeTab === "terminal" ? "bg-background text-primary shadow-sm" : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Terminal size={14} />
              <span>Full Output</span>
            </button>
            {previewFile && (
              <div className="h-9 px-4 bg-background text-primary text-xs font-bold flex items-center gap-2 rounded-lg shadow-sm border border-primary/20 mx-1">
                <Code2 size={14} />
                <span>{previewFile.name}</span>
                <button onClick={() => setPreviewFile(null)} className="ml-2 w-5 h-5 rounded-md hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex-1" />
            <div className="px-4 text-[10px] font-mono font-bold text-muted-foreground/40 uppercase tracking-widest">
              {t("devLinesCount")}: {totalLines.toLocaleString()}
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {previewFile ? (
              <div className="absolute inset-0 flex flex-col">
                {previewLoading ? (
                  <div className="flex-1 flex items-center justify-center bg-background/80">
                    <Loader2 size={24} className="animate-spin text-primary/40" />
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto bg-[#f8fafc] p-4 text-sm font-mono leading-relaxed text-foreground/80 selection:bg-primary/20">
                    <pre className="whitespace-pre-wrap">
                      {previewFile.content || "// No content"}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 p-12 text-center">
                <div className="w-16 h-16 rounded-3xl bg-surface-2 border border-border flex items-center justify-center mb-4">
                  <FileText size={32} />
                </div>
                <p className="text-sm font-mono">{t("mockLogEmptyTerminal")}</p>
                <p className="text-xs mt-2 max-w-xs">{t("heroSubtitle")}</p>
              </div>
            )}
          </div>

          {/* Bottom Stats strip integrated */}
          <div className="h-8 border-t border-border bg-surface-1 flex items-center px-4 justify-between text-[10px] font-mono text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Cpu size={10} /> {loopCount} LOOPS</span>
              <span className="flex items-center gap-1"><RefreshCw size={10} className={devStarted && !isDone ? "animate-spin-slow" : ""} /> {progress}%</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-primary font-bold">{!devStarted ? "READY" : isDone ? "COMPLETED" : "EXECUTING"}</span>
            </div>
          </div>
        </main>
      </div>
      {/* Footer */}
      <footer className="h-10 border-t border-border bg-background flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-2 opacity-50">
          <Zap size={12} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Celadon Studio</span>
        </div>
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest">
          v0.1.3 · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
