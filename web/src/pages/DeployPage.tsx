import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Loader2, Code2, Rocket, RefreshCw,
  FileText, MessageSquare, ExternalLink, Globe, Server, Shield,
  Cpu, Activity, Clock, AlertCircle, XCircle, ChevronRight,
  Copy, Check, Zap, Eye, Radio, Layers, Box, Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiDeploy } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type LogType = "cmd" | "info" | "success" | "warn" | "error";
type EnvTarget = "staging" | "production";
type StepStatus = "pending" | "active" | "done" | "error";

interface LogLine {
  id: string;
  type: LogType;
  text: string;
  time: string;
}

interface BuildStep {
  id: string;
  label: string;
  sublabel: string;
  status: StepStatus;
  duration?: string;
}

interface HealthCheck {
  id: string;
  label: string;
  endpoint: string;
  status: "checking" | "pass" | "fail" | "pending";
  latency?: number;
}

interface EnvVar {
  key: string;
  value: string;
  secret: boolean;
}

// ─── Pipeline bar ─────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: "clarify", sub: "Clarify", Icon: MessageSquare },
  { id: "prd",     sub: "PRD",     Icon: FileText       },
  { id: "dev",     sub: "Dev",     Icon: Code2          },
  { id: "deploy",  sub: "Deploy",  Icon: Rocket         },
  { id: "iterate", sub: "Iterate", Icon: RefreshCw      },
];

function PipelineBar({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center gap-0">
      {PIPELINE_STAGES.map((s, i) => {
        const done   = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-7 h-7 rounded-full border flex items-center justify-center transition-all",
                done   && "border-celadon bg-celadon/15",
                active && "border-stage-deploy bg-stage-deploy/10",
                !done && !active && "border-border bg-surface-2",
              )}>
                {done   ? <CheckCircle2 size={13} className="text-celadon" /> :
                 active ? <Loader2 size={13} className="text-stage-deploy animate-spin" /> :
                          <s.Icon size={12} className="text-muted-foreground/30" />}
              </div>
              <span className={cn(
                "text-[9px] font-mono",
                done ? "text-celadon" : active ? "text-stage-deploy" : "text-muted-foreground/30",
              )}>
                {s.sub}
              </span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={cn(
                "w-6 h-px mb-4",
                i < activeIndex ? "bg-celadon/40" : i === activeIndex - 1 ? "bg-celadon/40" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Build step component ─────────────────────────────────────────────────────

function BuildStepRow({ step, index }: { step: BuildStep; index: number }) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-3 px-4 border-b border-border/50 last:border-0 transition-all",
      step.status === "active" && "bg-stage-deploy/4",
      step.status === "done"   && "bg-transparent",
      step.status === "error"  && "bg-destructive/4",
    )}>
      {/* Step number / status icon */}
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
        {step.status === "done"    && <CheckCircle2 size={15} className="text-celadon" />}
        {step.status === "active"  && <Loader2 size={15} className="text-stage-deploy animate-spin" />}
        {step.status === "error"   && <XCircle size={15} className="text-destructive" />}
        {step.status === "pending" && (
          <span className="text-[10px] font-mono text-muted-foreground/30 font-semibold">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-xs font-mono font-semibold",
          step.status === "done"    && "text-foreground",
          step.status === "active"  && "text-stage-deploy",
          step.status === "error"   && "text-destructive",
          step.status === "pending" && "text-muted-foreground/40",
        )}>
          {step.label}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">
          {step.sublabel}
        </div>
      </div>

      {/* Duration */}
      {step.duration && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Clock size={9} className="text-muted-foreground/30" />
          <span className="text-[10px] font-mono text-muted-foreground/40">{step.duration}</span>
        </div>
      )}

      {/* Active progress bar */}
      {step.status === "active" && (
        <div className="w-16 h-0.5 rounded-full bg-surface-3 overflow-hidden flex-shrink-0">
          <div className="h-full bg-stage-deploy rounded-full animate-pulse w-1/2" />
        </div>
      )}
    </div>
  );
}

// ─── Health check row ─────────────────────────────────────────────────────────

function HealthRow({ check }: { check: HealthCheck }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 border-b border-border/50 last:border-0">
      <div className="flex-shrink-0">
        {check.status === "pass"     && <CheckCircle2 size={13} className="text-celadon" />}
        {check.status === "fail"     && <XCircle size={13} className="text-destructive" />}
        {check.status === "checking" && <Loader2 size={13} className="text-stage-deploy animate-spin" />}
        {check.status === "pending"  && <div className="w-3 h-3 rounded-full border border-border bg-surface-2" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-xs font-mono font-semibold",
          check.status === "pass"     && "text-foreground",
          check.status === "fail"     && "text-destructive",
          check.status === "checking" && "text-stage-deploy",
          check.status === "pending"  && "text-muted-foreground/40",
        )}>
          {check.label}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/30 mt-0.5">{check.endpoint}</div>
      </div>
      {check.latency !== undefined && (
        <span className={cn(
          "text-[10px] font-mono flex-shrink-0",
          check.latency < 200 ? "text-celadon" : check.latency < 600 ? "text-stage-deploy" : "text-destructive"
        )}>
          {check.latency}ms
        </span>
      )}
    </div>
  );
}

// ─── Log line ─────────────────────────────────────────────────────────────────

const logStyles: Record<LogType, string> = {
  cmd:     "text-stage-clarify",
  info:    "text-muted-foreground/65",
  success: "text-celadon",
  warn:    "text-stage-deploy",
  error:   "text-destructive",
};

function LogRow({ log }: { log: LogLine }) {
  return (
    <div className="flex items-start gap-2 py-0.5 hover:bg-surface-2/30 px-2 rounded">
      <span className="text-muted-foreground/20 font-mono text-[10px] flex-shrink-0 w-16 mt-px select-none">
        {log.time}
      </span>
      <span className={cn("text-[11px] font-mono break-all leading-relaxed", logStyles[log.type])}>
        {log.type === "cmd"     && <span className="text-muted-foreground/35 mr-1.5">$</span>}
        {log.type === "success" && <span className="mr-1">✓</span>}
        {log.type === "warn"    && <span className="mr-1">⚠</span>}
        {log.type === "error"   && <span className="mr-1">✗</span>}
        {log.text}
      </span>
    </div>
  );
}

// ─── Env var row ──────────────────────────────────────────────────────────────

function EnvRow({ env }: { env: EnvVar }) {
  return (
    <div className="flex items-center gap-3 py-2 px-4 border-b border-border/50 last:border-0 group">
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-mono text-stage-clarify">{env.key}</span>
      </div>
      <div className="flex items-center gap-2">
        {env.secret ? (
          <div className="flex items-center gap-1.5">
            <Shield size={10} className="text-stage-prd/60" />
            <span className="text-[10px] font-mono text-muted-foreground/30 tracking-widest">••••••••</span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground/50 truncate max-w-[120px]">{env.value}</span>
        )}
      </div>
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
    >
      {copied ? <Check size={10} className="text-celadon" /> : <Copy size={10} />}
      {copied ? "已复制" : label}
    </button>
  );
}

// ─── Data / simulation ────────────────────────────────────────────────────────

const makeTime = (offsetSec: number) => {
  const d = new Date(Date.now() - offsetSec * 1000);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
};

const INITIAL_LOGS: LogLine[] = [
  { id: "l1",  type: "cmd",     text: "celadon deploy --env staging --provider vercel",          time: makeTime(95) },
  { id: "l2",  type: "info",    text: "读取部署配置 deploy.config.ts...",                         time: makeTime(93) },
  { id: "l3",  type: "info",    text: "连接到 Vercel 项目 saas-billing-dashboard...",             time: makeTime(91) },
  { id: "l4",  type: "success", text: "认证成功，token 有效",                                     time: makeTime(90) },
  { id: "l5",  type: "cmd",     text: "npm run build",                                            time: makeTime(88) },
  { id: "l6",  type: "info",    text: "Next.js 14.2 编译中...",                                   time: makeTime(85) },
  { id: "l7",  type: "info",    text: "  ✦ 收集页面和组件...",                                    time: makeTime(80) },
  { id: "l8",  type: "info",    text: "  ✦ 运行 TypeScript 类型检查...",                          time: makeTime(75) },
  { id: "l9",  type: "success", text: "  类型检查通过，0 错误",                                   time: makeTime(72) },
  { id: "l10", type: "info",    text: "  ✦ 打包 JS 模块 (tree-shaking)...",                      time: makeTime(68) },
  { id: "l11", type: "info",    text: "  ✦ 优化图片资源...",                                     time: makeTime(60) },
  { id: "l12", type: "info",    text: "  ✦ 生成静态页面 /dashboard, /billing, /settings...",     time: makeTime(55) },
  { id: "l13", type: "success", text: "构建成功 · 耗时 23.4s · 产物大小 847 kB",                 time: makeTime(50) },
  { id: "l14", type: "cmd",     text: "vercel deploy --prebuilt --token $VERCEL_TOKEN",          time: makeTime(48) },
  { id: "l15", type: "info",    text: "上传构建产物到 Vercel CDN...",                             time: makeTime(44) },
  { id: "l16", type: "info",    text: "分配边缘节点：sin1, nrt1, hkg1, sfo1...",                  time: makeTime(38) },
  { id: "l17", type: "success", text: "构建产物已部署到 4 个边缘节点",                            time: makeTime(32) },
  { id: "l18", type: "info",    text: "注入环境变量 (Staging)...",                               time: makeTime(28) },
  { id: "l19", type: "success", text: "16 个环境变量已注入",                                      time: makeTime(25) },
  { id: "l20", type: "cmd",     text: "prisma migrate deploy --schema ./prisma/schema.prisma",  time: makeTime(22) },
  { id: "l21", type: "success", text: "数据库迁移完成 (1 个 migration)",                         time: makeTime(18) },
];

const STREAM_LOGS: LogLine[] = [
  { id: "s1", type: "info",    text: "运行健康检查...",                                time: "" },
  { id: "s2", type: "info",    text: "  GET /api/health → 200 OK (42ms)",             time: "" },
  { id: "s3", type: "info",    text: "  GET /api/auth/session → 200 OK (89ms)",       time: "" },
  { id: "s4", type: "info",    text: "  GET /api/subscriptions → 200 OK (131ms)",     time: "" },
  { id: "s5", type: "success", text: "全部健康检查通过 (3/3)",                          time: "" },
  { id: "s6", type: "success", text: "SSL 证书已签发 (Let's Encrypt · 90天)",          time: "" },
  { id: "s7", type: "success", text: "CDN 缓存预热完成 (12个节点)",                    time: "" },
  { id: "s8", type: "success", text: "Staging 部署成功 · https://staging-saas-billing.vercel.app", time: "" },
];

const INITIAL_STEPS: BuildStep[] = [
  { id: "install",  label: "安装依赖",        sublabel: "npm ci --frozen-lockfile",         status: "done", duration: "18.2s" },
  { id: "typecheck",label: "类型检查",        sublabel: "tsc --noEmit",                     status: "done", duration: "4.1s"  },
  { id: "lint",     label: "代码规范",        sublabel: "eslint + prettier",                status: "done", duration: "2.8s"  },
  { id: "build",    label: "构建产物",        sublabel: "next build --prod",                status: "done", duration: "23.4s" },
  { id: "upload",   label: "上传 CDN",        sublabel: "vercel deploy --prebuilt",         status: "done", duration: "6.7s"  },
  { id: "migrate",  label: "数据库迁移",      sublabel: "prisma migrate deploy",            status: "done", duration: "3.1s"  },
  { id: "health",   label: "健康检查",        sublabel: "GET /api/health × 3",             status: "active" },
  { id: "ssl",      label: "SSL 证书",        sublabel: "Let's Encrypt 签发",              status: "pending" },
  { id: "cdn",      label: "CDN 预热",        sublabel: "全球边缘节点同步",                  status: "pending" },
];

const INITIAL_HEALTH: HealthCheck[] = [
  { id: "hc1", label: "服务健康",      endpoint: "GET /api/health",          status: "pass",     latency: 42  },
  { id: "hc2", label: "认证服务",      endpoint: "GET /api/auth/session",    status: "checking"              },
  { id: "hc3", label: "订阅 API",      endpoint: "GET /api/subscriptions",   status: "pending"               },
  { id: "hc4", label: "数据库连接",    endpoint: "prisma.$connect()",        status: "pending"               },
  { id: "hc5", label: "Stripe Webhook",endpoint: "POST /api/stripe/webhook", status: "pending"               },
];

const ENV_VARS: EnvVar[] = [
  { key: "NODE_ENV",              value: "production",             secret: false },
  { key: "NEXT_PUBLIC_APP_URL",   value: "https://staging-saas-billing.vercel.app", secret: false },
  { key: "DATABASE_URL",          value: "",                       secret: true  },
  { key: "NEXTAUTH_SECRET",       value: "",                       secret: true  },
  { key: "STRIPE_SECRET_KEY",     value: "",                       secret: true  },
  { key: "STRIPE_WEBHOOK_SECRET", value: "",                       secret: true  },
  { key: "NEXTAUTH_URL",          value: "https://staging-saas-billing.vercel.app", secret: false },
];

// ─── Stat item ────────────────────────────────────────────────────────────────

function StatItem({ icon: Icon, label, value, color = "text-foreground" }: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-2 border-r border-border last:border-0">
      <Icon size={12} className="text-muted-foreground/40" />
      <span className={cn("text-sm font-mono font-bold tabular-nums", color)}>{value}</span>
      <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider whitespace-nowrap">{label}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DeployPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { idea?: string; sessionId?: string } | null;
  const idea = state?.idea ?? "未知项目";
  const sessionId = state?.sessionId ?? "";

  const [envTarget, setEnvTarget]     = useState<EnvTarget>("staging");
  const [logs, setLogs]               = useState<LogLine[]>(INITIAL_LOGS);
  const [steps, setSteps]             = useState<BuildStep[]>(INITIAL_STEPS);
  const [health, setHealth]           = useState<HealthCheck[]>(INITIAL_HEALTH);
  const [streamIdx, setStreamIdx]     = useState(0);
  const [deployDone, setDeployDone]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"logs" | "env">("logs");
  const [buildTime]                   = useState("58.3s");
  const [deployUrl, setDeployUrl] = useState("");

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Stream log lines + evolve state
  useEffect(() => {
    if (streamIdx >= STREAM_LOGS.length) return;

    const timer = setTimeout(() => {
      const log = {
        ...STREAM_LOGS[streamIdx],
        time: makeTime(0),
        id: `stream-${streamIdx}`,
      };
      setLogs((p) => [...p, log]);
      setStreamIdx((i) => i + 1);

      // Evolve health checks
      if (streamIdx === 0) {
        setHealth((prev) => prev.map((h) =>
          h.id === "hc2" ? { ...h, status: "checking" } : h
        ));
      }
      if (streamIdx === 1) {
        setHealth((prev) => prev.map((h) =>
          h.id === "hc2" ? { ...h, status: "pass", latency: 89 } :
          h.id === "hc3" ? { ...h, status: "checking" } : h
        ));
      }
      if (streamIdx === 2) {
        setHealth((prev) => prev.map((h) =>
          h.id === "hc3" ? { ...h, status: "pass", latency: 131 } :
          h.id === "hc4" ? { ...h, status: "checking" } : h
        ));
      }
      if (streamIdx === 3) {
        setHealth((prev) => prev.map((h) =>
          h.id === "hc4" ? { ...h, status: "pass", latency: 28 } :
          h.id === "hc5" ? { ...h, status: "checking" } : h
        ));
      }
      if (streamIdx === 4) {
        setHealth((prev) => prev.map((h) =>
          h.id === "hc5" ? { ...h, status: "pass", latency: 55 } : h
        ));
        setSteps((prev) => prev.map((s) =>
          s.id === "health" ? { ...s, status: "done", duration: "3.2s" } :
          s.id === "ssl"    ? { ...s, status: "active" } : s
        ));
      }
      if (streamIdx === 5) {
        setSteps((prev) => prev.map((s) =>
          s.id === "ssl" ? { ...s, status: "done", duration: "1.4s" } :
          s.id === "cdn" ? { ...s, status: "active" } : s
        ));
      }
      if (streamIdx === 6) {
        setSteps((prev) => prev.map((s) =>
          s.id === "cdn" ? { ...s, status: "done", duration: "2.1s" } : s
        ));
      }
      if (streamIdx === 7) {
        setDeployDone(true);
        setDeployUrl("https://staging-saas-billing.vercel.app");
        if (sessionId) {
          apiDeploy(sessionId, envTarget).catch(() => {});
        }
      }
    }, 1400 + Math.random() * 800);

    return () => clearTimeout(timer);
  }, [streamIdx]);

  const completedSteps = steps.filter((s) => s.status === "done").length;
  const totalSteps     = steps.length;
  const progress       = Math.round((completedSteps / totalSteps) * 100);

  const shortIdea = idea.length > 32 ? idea.slice(0, 29) + "..." : idea;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-4">
            <button
              onClick={() => navigate("/dev", { state: { idea, sessionId } })}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">开发</span>
          </button>

          <div className="flex-1 flex items-center justify-center">
            <div className="hidden md:block">
              <PipelineBar activeIndex={3} />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Environment switcher */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              {(["staging", "production"] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => setEnvTarget(env)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono transition-colors",
                    envTarget === env
                      ? env === "production"
                        ? "bg-stage-deploy/20 text-stage-deploy border-r-0"
                        : "bg-surface-2 text-foreground"
                      : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-surface-2/50",
                    env === "staging" && "border-r border-border"
                  )}
                >
                  {env === "staging" ? "Staging" : "Production"}
                </button>
              ))}
            </div>

            {/* Iterate CTA */}
            <button
              onClick={() => navigate("/iterate", { state: { idea, answers } })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all"
            >
              <RefreshCw size={11} />
              <span>迭代</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col pt-14">

        {/* Stats strip */}
        <div className="border-b border-border bg-surface-1/60">
          <div className="max-w-screen-2xl mx-auto flex items-stretch flex-wrap">
            <StatItem icon={Clock}    label="构建耗时" value={buildTime}          color="text-foreground"     />
            <StatItem icon={Layers}   label="步骤完成" value={`${completedSteps}/${totalSteps}`} color="text-stage-deploy" />
            <StatItem icon={Globe}    label="边缘节点" value="4"                  color="text-stage-clarify"  />
            <StatItem icon={Cpu}      label="包大小"   value="847 kB"             color="text-foreground"     />
            <StatItem icon={Shield}   label="环境变量" value={`${ENV_VARS.length}`} color="text-stage-prd"   />
            <div className="flex-1 flex items-center px-4 py-2 min-w-[120px]">
              <div className="w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
                    {deployDone ? "部署完成" : "部署中"}
                  </span>
                  <span className={cn(
                    "text-[9px] font-mono",
                    deployDone ? "text-celadon" : "text-stage-deploy"
                  )}>{progress}%</span>
                </div>
                <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      deployDone ? "bg-celadon" : "bg-stage-deploy"
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

          {/* ── Left: Build pipeline steps ──────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-border bg-surface-1/40 overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Box size={11} className="text-stage-deploy/70" />
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                构建流水线
              </span>
              <div className={cn(
                "ml-auto flex items-center gap-1",
                deployDone ? "text-celadon" : "text-stage-deploy"
              )}>
                {deployDone
                  ? <CheckCircle2 size={11} />
                  : <Loader2 size={11} className="animate-spin" />}
                <span className="text-[9px] font-mono">
                  {deployDone ? "完成" : "进行中"}
                </span>
              </div>
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto">
              {steps.map((step, i) => (
                <BuildStepRow key={step.id} step={step} index={i} />
              ))}
            </div>

            {/* Summary footer */}
            <div className="p-3 border-t border-border bg-surface-1/40">
              <div className="text-[10px] font-mono text-muted-foreground/40 space-y-1">
                <div className="flex justify-between">
                  <span>提供商</span><span className="text-foreground/60">Vercel</span>
                </div>
                <div className="flex justify-between">
                  <span>区域</span><span className="text-foreground/60">Edge Global</span>
                </div>
                <div className="flex justify-between">
                  <span>运行时</span><span className="text-foreground/60">Node.js 20.x</span>
                </div>
                <div className="flex justify-between">
                  <span>环境</span>
                  <span className={envTarget === "production" ? "text-stage-deploy" : "text-stage-clarify"}>
                    {envTarget === "production" ? "Production" : "Staging"}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Center: Logs / Env ──────────────────────────────────────────── */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-border">

            {/* Tab bar */}
            <div className="flex items-center gap-0 border-b border-border bg-surface-1/60 flex-shrink-0">
              {(["logs", "env"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono border-r border-border transition-colors",
                    activeTab === tab
                      ? "bg-background text-foreground"
                      : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-surface-2/40"
                  )}
                >
                  {tab === "logs" ? <Activity size={11} /> : <Shield size={11} />}
                  {{ logs: "部署日志", env: "环境变量" }[tab]}
                </button>
              ))}
              {!deployDone && (
                <div className="ml-auto mr-3 flex items-center gap-1.5">
                  <Radio size={10} className="text-stage-deploy animate-pulse" />
                  <span className="text-[9px] font-mono text-stage-deploy">LIVE</span>
                </div>
              )}
              {deployDone && (
                <div className="ml-auto mr-3 flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-celadon" />
                  <span className="text-[9px] font-mono text-celadon">SUCCESS</span>
                </div>
              )}
            </div>

            {/* Logs tab */}
            {activeTab === "logs" && (
              <div className="flex-1 overflow-y-auto bg-background/60 p-3 font-mono">
                <div className="space-y-0.5">
                  {logs.map((log) => <LogRow key={log.id} log={log} />)}
                  {!deployDone && (
                    <div className="flex items-center gap-2 py-0.5 px-2">
                      <span className="text-muted-foreground/20 text-[10px] w-16 select-none">now</span>
                      <span className="cursor-blink-deploy" />
                    </div>
                  )}
                </div>
                <div ref={logsEndRef} />
              </div>
            )}

            {/* Env tab */}
            {activeTab === "env" && (
              <div className="flex-1 overflow-y-auto bg-background/60">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono font-semibold text-foreground mb-0.5">
                        {envTarget === "staging" ? "Staging" : "Production"} 环境变量
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/40">
                        {ENV_VARS.length} 个变量 · {ENV_VARS.filter((e) => e.secret).length} 个加密
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-stage-prd/25 bg-stage-prd/8">
                      <Shield size={10} className="text-stage-prd/70" />
                      <span className="text-[9px] font-mono text-stage-prd/70">端对端加密</span>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-border/30">
                  {ENV_VARS.map((env) => (
                    <EnvRow key={env.key} env={env} />
                  ))}
                </div>
              </div>
            )}

            {/* Live preview banner */}
            {deployDone && (
              <div className="flex-shrink-0 border-t border-celadon/25 bg-celadon/6 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-celadon/15 border border-celadon/30 flex items-center justify-center flex-shrink-0">
                    <Globe size={14} className="text-celadon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-semibold text-foreground mb-0.5">
                      部署成功 · 实时预览
                    </div>
                    <a
                      href={deployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-celadon hover:text-celadon-glow transition-colors truncate block underline underline-offset-2"
                    >
                      {deployUrl}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CopyBtn text={deployUrl} label="复制" />
                    <a
                      href={deployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow"
                    >
                      <ExternalLink size={11} />
                      <span>打开预览</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* ── Right: Health checks + promote ──────────────────────────────── */}
          <aside className="hidden xl:flex flex-col w-72 flex-shrink-0 overflow-hidden">

            {/* Health checks */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-border flex items-center gap-2">
                <Wifi size={11} className="text-muted-foreground/40" />
                <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                  健康检查
                </span>
                <div className={cn(
                  "ml-auto flex items-center gap-1",
                  health.every((h) => h.status === "pass") ? "text-celadon" :
                  health.some((h) => h.status === "fail")  ? "text-destructive" :
                  "text-stage-deploy"
                )}>
                  {health.every((h) => h.status === "pass")
                    ? <><CheckCircle2 size={11} /><span className="text-[9px] font-mono">全部通过</span></>
                    : health.some((h) => h.status === "fail")
                    ? <><AlertCircle size={11} /><span className="text-[9px] font-mono">异常</span></>
                    : <><Loader2 size={11} className="animate-spin" /><span className="text-[9px] font-mono">检查中</span></>
                  }
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {health.map((check) => (
                  <HealthRow key={check.id} check={check} />
                ))}
              </div>

              {/* Deploy info card */}
              <div className="m-3 rounded-xl border border-border bg-surface-1/60 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                    部署信息
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2 text-[11px] font-mono">
                  {[
                    ["目标环境", envTarget === "staging" ? "Staging" : "Production"],
                    ["触发方式", "Celadon AI"],
                    ["Git Ref",  "main@f4b2d6"],
                    ["部署 ID",  "dpl_8x2k3n"],
                    ["时间戳",   new Date().toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" })],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground/40">{k}</span>
                      <span className={cn(
                        "text-right truncate",
                        k === "目标环境" && envTarget === "production" ? "text-stage-deploy" :
                        k === "目标环境" ? "text-stage-clarify" : "text-foreground/60"
                      )}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Promote to production CTA */}
            <div className="p-4 border-t border-border bg-surface-1/40 space-y-3">
              {deployDone ? (
                <>
                  <div className="rounded-xl border border-celadon/20 bg-celadon/6 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={12} className="text-celadon" />
                      <span className="text-xs font-mono text-celadon font-semibold">Staging 已就绪</span>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed">
                      所有检查通过，可以推送到生产环境
                    </p>
                  </div>
                  {envTarget === "staging" ? (
                    <button
                      onClick={() => setEnvTarget("production")}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stage-deploy text-background text-xs font-mono font-semibold hover:opacity-90 transition-all"
                      style={{ background: "hsl(var(--stage-deploy))" }}
                    >
                      <Rocket size={12} />
                      <span>推送到 Production</span>
                      <ChevronRight size={11} />
                    </button>
                  ) : (
                    <button
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow"
                    >
                      <CheckCircle2 size={12} />
                      <span>已部署到 Production</span>
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/iterate", { state: { idea, sessionId } })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all"
                  >
                    <RefreshCw size={11} />
                    <span>开始迭代</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 size={11} className="text-stage-deploy animate-spin" />
                    <span className="text-[10px] font-mono text-stage-deploy">正在部署到 Staging...</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full bg-stage-deploy rounded-full transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/30">{progress}% · {completedSteps}/{totalSteps} 步骤完成</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
