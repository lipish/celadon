import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Loader2, Code2, Rocket, RefreshCw,
  FileText, MessageSquare, ChevronRight, Plus, Minus, Send,
  GitBranch, Tag, Clock, Zap, Sparkles, History,
  ChevronDown, ArrowRight, Globe, CornerDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { apiAppendIdea } from "@/lib/api";

// ─── Pipeline bar ─────────────────────────────────────────────────────────────

const STAGE_LABELS = {
  clarify: "stageClarify",
  prd: "stagePrd",
  dev: "stageDev",
  deploy: "stageDeploy",
  iterate: "stageIterate",
} as const;

function PipelineBar({ activeIndex }: { activeIndex: number }) {
  const { t } = useLocale();
  const PIPELINE_STAGES = [
    { id: "clarify", sub: t(STAGE_LABELS.clarify), Icon: MessageSquare },
    { id: "prd", sub: t(STAGE_LABELS.prd), Icon: FileText },
    { id: "dev", sub: t(STAGE_LABELS.dev), Icon: Code2 },
    { id: "deploy", sub: t(STAGE_LABELS.deploy), Icon: Rocket },
    { id: "iterate", sub: t(STAGE_LABELS.iterate), Icon: RefreshCw },
  ];
  return (
    <div className="flex items-center gap-0">
      {PIPELINE_STAGES.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-7 h-7 rounded-full border flex items-center justify-center transition-all",
                done && "border-celadon bg-celadon/15",
                active && "border-stage-iterate bg-stage-iterate/10",
                !done && !active && "border-border bg-surface-2",
              )}>
                {done ? <CheckCircle2 size={13} className="text-celadon" /> :
                  active ? <Loader2 size={13} className="text-stage-iterate animate-spin" /> :
                    <s.Icon size={12} className="text-muted-foreground/30" />}
              </div>
              <span className={cn(
                "text-[9px] font-mono",
                done ? "text-celadon" : active ? "text-stage-iterate" : "text-muted-foreground/30",
              )}>
                {s.sub}
              </span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={cn(
                "w-6 h-px mb-4",
                i < activeIndex ? "bg-celadon/40" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DiffLine = {
  type: "add" | "remove" | "context" | "hunk";
  content: string;
  lineOld?: number;
  lineNew?: number;
};

type DiffFile = {
  path: string;
  language: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
  collapsed?: boolean;
};

type VersionTag = {
  version: string;
  label: string;
  date: string;
  commits: number;
  deployUrl: string;
  active: boolean;
};

type Suggestion = {
  id: string;
  title: string;
  description: string;
  type: "feature" | "fix" | "perf" | "ux";
};

// ─── Diff data ────────────────────────────────────────────────────────────────

const DIFF_FILES: DiffFile[] = [
  {
    path: "components/BillingTable.tsx",
    language: "tsx",
    additions: 34,
    deletions: 8,
    lines: [
      { type: "hunk", content: "@@ -42,8 +42,34 @@ export function BillingTable({ data }: Props) {" },
      { type: "context", content: "  const [sort, setSort] = useState<SortKey>('date');", lineOld: 42, lineNew: 42 },
      { type: "context", content: "  const [page, setPage] = useState(1);", lineOld: 43, lineNew: 43 },
      { type: "context", content: "  const [filter, setFilter] = useState('');", lineOld: 44, lineNew: 44 },
      { type: "remove", content: "  // TODO: add search", lineOld: 45 },
      { type: "remove", content: "  // TODO: add export", lineOld: 46 },
      { type: "add", content: "  const [search, setSearch] = useState('');", lineNew: 45 },
      { type: "add", content: "  const filtered = useMemo(() => data.filter(r =>", lineNew: 46 },
      { type: "add", content: "    r.customer.toLowerCase().includes(search.toLowerCase())", lineNew: 47 },
      { type: "add", content: "  ), [data, search]);", lineNew: 48 },
      { type: "add", content: "", lineNew: 49 },
      { type: "add", content: "  const handleExport = () => {", lineNew: 50 },
      { type: "add", content: "    exportToCSV(filtered, 'billing-export.csv');", lineNew: 51 },
      { type: "add", content: "  };", lineNew: 52 },
      { type: "hunk", content: "@@ -98,6 +112,18 @@ export function BillingTable({ data }: Props) {" },
      { type: "context", content: "  return (", lineOld: 98, lineNew: 112 },
      { type: "context", content: "    <div className=\"space-y-4\">", lineOld: 99, lineNew: 113 },
      { type: "remove", content: "      <Table data={sorted} />", lineOld: 100 },
      { type: "add", content: "      <div className=\"flex items-center gap-2 mb-2\">", lineNew: 114 },
      { type: "add", content: "        <SearchInput value={search} onChange={setSearch} />", lineNew: 115 },
      { type: "add", content: "        <Button onClick={handleExport} variant=\"outline\">", lineNew: 116 },
      { type: "add", content: "          Export CSV", lineNew: 117 },
      { type: "add", content: "        </Button>", lineNew: 118 },
      { type: "add", content: "      </div>", lineNew: 119 },
      { type: "add", content: "      <Table data={filtered} sort={sort} onSort={setSort} />", lineNew: 120 },
    ],
  },
  {
    path: "app/api/subscriptions/route.ts",
    language: "ts",
    additions: 22,
    deletions: 3,
    lines: [
      { type: "hunk", content: "@@ -15,3 +15,22 @@ export async function GET(req: Request) {" },
      { type: "context", content: "  const session = await getServerSession(authOptions);", lineOld: 15, lineNew: 15 },
      { type: "context", content: "  if (!session) return new Response('Unauthorized', { status: 401 });", lineOld: 16, lineNew: 16 },
      { type: "remove", content: "  const data = await prisma.subscription.findMany();", lineOld: 17 },
      { type: "remove", content: "  return Response.json(data);", lineOld: 18 },
      { type: "remove", content: "}", lineOld: 19 },
      { type: "add", content: "  const { searchParams } = new URL(req.url);", lineNew: 17 },
      { type: "add", content: "  const status  = searchParams.get('status');", lineNew: 18 },
      { type: "add", content: "  const page    = parseInt(searchParams.get('page') ?? '1');", lineNew: 19 },
      { type: "add", content: "  const perPage = 25;", lineNew: 20 },
      { type: "add", content: "", lineNew: 21 },
      { type: "add", content: "  const [data, total] = await Promise.all([", lineNew: 22 },
      { type: "add", content: "    prisma.subscription.findMany({", lineNew: 23 },
      { type: "add", content: "      where: status ? { status } : undefined,", lineNew: 24 },
      { type: "add", content: "      skip: (page - 1) * perPage, take: perPage,", lineNew: 25 },
      { type: "add", content: "    }),", lineNew: 26 },
      { type: "add", content: "    prisma.subscription.count(),", lineNew: 27 },
      { type: "add", content: "  ]);", lineNew: 28 },
      { type: "add", content: "  return Response.json({ data, total, page, perPage });", lineNew: 29 },
      { type: "add", content: "}", lineNew: 30 },
    ],
  },
  {
    path: "lib/export.ts",
    language: "ts",
    additions: 28,
    deletions: 0,
    collapsed: true,
    lines: [
      { type: "hunk", content: "@@ -0,0 +1,28 @@" },
      { type: "add", content: "export function exportToCSV(data: Record<string, unknown>[], filename: string) {", lineNew: 1 },
      { type: "add", content: "  if (!data.length) return;", lineNew: 2 },
      { type: "add", content: "  const keys = Object.keys(data[0]);", lineNew: 3 },
      { type: "add", content: "  const csv  = [keys.join(','),", lineNew: 4 },
      { type: "add", content: "    ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))", lineNew: 5 },
      { type: "add", content: "  ].join('\\n');", lineNew: 6 },
      { type: "add", content: "  const blob = new Blob([csv], { type: 'text/csv' });", lineNew: 7 },
      { type: "add", content: "  const url  = URL.createObjectURL(blob);", lineNew: 8 },
      { type: "add", content: "  Object.assign(document.createElement('a'), { href: url, download: filename }).click();", lineNew: 9 },
      { type: "add", content: "  URL.revokeObjectURL(url);", lineNew: 10 },
      { type: "add", content: "}", lineNew: 11 },
    ],
  },
];

// Mock data moved inside component

const TYPE_COLORS: Record<Suggestion["type"], string> = {
  feature: "bg-stage-clarify/10 text-stage-clarify border-stage-clarify/25",
  fix: "bg-destructive/10 text-destructive border-destructive/25",
  perf: "bg-stage-deploy/10 text-stage-deploy border-stage-deploy/25",
  ux: "bg-stage-prd/10 text-stage-prd border-stage-prd/25",
};

const TYPE_LABELS: Record<Suggestion["type"], string> = {
  feature: "feature",
  fix: "fix",
  perf: "perf",
  ux: "ux",
};

// ─── Diff viewer ──────────────────────────────────────────────────────────────

function DiffFileCard({ file }: { file: DiffFile }) {
  const [collapsed, setCollapsed] = useState(file.collapsed ?? false);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors text-left"
      >
        <ChevronDown
          size={13}
          className={cn("text-muted-foreground/50 transition-transform flex-shrink-0", collapsed && "-rotate-90")}
        />
        <span className="text-xs font-mono text-foreground flex-1 truncate">{file.path}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {file.additions > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-mono text-celadon">
              <Plus size={9} />
              {file.additions}
            </span>
          )}
          {file.deletions > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-mono text-destructive">
              <Minus size={9} />
              {file.deletions}
            </span>
          )}
          <span className="text-[9px] font-mono text-muted-foreground/30 border border-border px-1.5 py-px rounded">
            {file.language}
          </span>
        </div>
      </button>

      {/* Diff lines */}
      {!collapsed && (
        <div className="bg-background/70 overflow-x-auto">
          {file.lines.map((line, i) => {
            if (line.type === "hunk") {
              return (
                <div key={i} className="flex items-center gap-0 bg-surface-2/60 border-y border-border/50 select-none">
                  <div className="w-10 flex-shrink-0" />
                  <div className="w-10 flex-shrink-0" />
                  <span className="px-4 py-1 text-[10px] font-mono text-muted-foreground/40">{line.content}</span>
                </div>
              );
            }
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-0 group",
                  line.type === "add" && "bg-celadon/6 border-l-2 border-celadon/40",
                  line.type === "remove" && "bg-destructive/6 border-l-2 border-destructive/30",
                  line.type === "context" && "border-l-2 border-transparent",
                )}
              >
                {/* Old line number */}
                <span className="w-10 flex-shrink-0 py-0.5 px-2 text-right text-[10px] font-mono text-muted-foreground/20 select-none border-r border-border/30">
                  {line.lineOld ?? ""}
                </span>
                {/* New line number */}
                <span className="w-10 flex-shrink-0 py-0.5 px-2 text-right text-[10px] font-mono text-muted-foreground/20 select-none border-r border-border/30">
                  {line.lineNew ?? ""}
                </span>
                {/* Gutter symbol */}
                <span className={cn(
                  "w-5 flex-shrink-0 py-0.5 text-center text-[11px] font-mono select-none",
                  line.type === "add" && "text-celadon",
                  line.type === "remove" && "text-destructive",
                )}>
                  {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
                </span>
                {/* Content */}
                <span className={cn(
                  "flex-1 py-0.5 pr-4 text-[11px] font-mono leading-relaxed whitespace-pre",
                  line.type === "add" && "text-celadon/90",
                  line.type === "remove" && "text-destructive/80 line-through opacity-60",
                  line.type === "context" && "text-foreground/60",
                )}>
                  {line.content}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Version history row ──────────────────────────────────────────────────────

function VersionRow({ v, onSelect, selected }: { v: VersionTag; onSelect: () => void; selected: boolean }) {
  const { t } = useLocale();
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 text-left transition-all hover:bg-surface-2/50",
        selected && "bg-surface-2/80"
      )}
    >
      <div className={cn(
        "mt-0.5 flex-shrink-0",
        v.active ? "text-celadon" : "text-muted-foreground/30"
      )}>
        <Tag size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-mono font-semibold",
            v.active ? "text-celadon" : selected ? "text-foreground" : "text-muted-foreground/60"
          )}>
            {v.version}
          </span>
          {v.active && (
            <span className="text-[9px] font-mono px-1.5 py-px rounded-full bg-celadon/15 text-celadon border border-celadon/25">
              {t("mockLogLive")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock size={9} className="text-muted-foreground/30" />
          <span className="text-[10px] font-mono text-muted-foreground/40">{v.date}</span>
          <span className="text-[10px] font-mono text-muted-foreground/25">· {v.commits} {t("commits")}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Suggestion chip ──────────────────────────────────────────────────────────

function SuggestionChip({ s, onAdd }: { s: Suggestion; onAdd: (text: string) => void }) {
  const { t } = useLocale();
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-3 flex items-start gap-3 hover:border-muted-foreground/25 transition-colors group">
      <span className={cn(
        "text-[9px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5",
        TYPE_COLORS[s.type]
      )}>
        {t(TYPE_LABELS[s.type])}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono font-semibold text-foreground mb-0.5">{s.title}</div>
        <div className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed">{s.description}</div>
      </div>
      <button
        onClick={() => onAdd(`${s.title}：${s.description}`)}
        className="flex-shrink-0 w-6 h-6 rounded-lg border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:border-celadon/40 hover:bg-celadon/8"
      >
        <Plus size={11} className="text-muted-foreground group-hover:text-celadon" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IteratePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale } = useLocale();

  const state = location.state as { idea?: string; sessionId?: string } | null;
  const idea = state?.idea ?? t("mockDefaultIdea");
  const sessionId = state?.sessionId ?? "";

  const VERSIONS: VersionTag[] = [
    { version: "v0.3.0", label: t("currentVersion"), date: t("justNow"), commits: 6, deployUrl: "https://staging-saas-billing.vercel.app", active: true },
    { version: "v0.2.0", label: t("previousVersion"), date: t("mockLog2hAgo"), commits: 12, deployUrl: "https://v2-saas-billing.vercel.app", active: false },
    { version: "v0.1.0", label: t("initialVersion"), date: t("mockLogYesterday"), commits: 47, deployUrl: "https://v1-saas-billing.vercel.app", active: false },
  ];

  const AI_SUGGESTIONS: Suggestion[] = [
    { id: "s1", type: "feature", title: t("mockLogPdfExport"), description: t("mockLogPdfExportDesc") },
    { id: "s2", type: "ux", title: t("mockLogDarkMode"), description: t("mockLogDarkModeDesc") },
    { id: "s3", type: "perf", title: t("mockLogVirtualScroll"), description: t("mockLogVirtualScrollDesc") },
    { id: "s4", type: "feature", title: t("mockLogWebhookLog"), description: t("mockLogWebhookLogDesc") },
    { id: "s5", type: "fix", title: t("mockLogStripeRefund"), description: t("mockLogStripeRefundDesc") },
  ];

  const [selectedVersion, setSelectedVersion] = useState("v0.3.0");
  const [activeTab, setActiveTab] = useState<"diff" | "history">("diff");
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [collectedReqs, setCollectedReqs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Summarise total diff stats
  const totalAdd = DIFF_FILES.reduce((a, f) => a + f.additions, 0);
  const totalDel = DIFF_FILES.reduce((a, f) => a + f.deletions, 0);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [feedback]);

  const addSuggestion = (text: string) => {
    setFeedback((prev) => (prev ? `${prev}\n${text}` : text));
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    setCollectedReqs((prev) => [...prev, feedback.trim()]);
    setFeedback("");
    setSubmitted(true);
  };

  const startNewLoop = async () => {
    const fullIdea = collectedReqs.length
      ? `${t("mockIterateMsg")} ${collectedReqs[collectedReqs.length - 1]}`
      : `${t("mockIterateMsg")} ${idea}`;
    if (sessionId) {
      setSubmitting(true);
      try {
        await apiAppendIdea(sessionId, fullIdea);
        navigate("/clarify", { state: { idea: fullIdea, sessionId } });
      } catch {
        navigate("/clarify", { state: { idea: fullIdea, sessionId } });
      } finally {
        setSubmitting(false);
      }
    } else {
      navigate("/", { state: { idea: fullIdea } });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate("/deploy", { state: { idea, sessionId } })}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">{t("deploy")}</span>
          </button>

          <div className="flex-1 flex items-center justify-center">
            <div className="hidden md:block">
              <PipelineBar activeIndex={4} />
            </div>
          </div>

          {/* Start new loop CTA */}
          <button
            onClick={startNewLoop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stage-iterate/20 border border-stage-iterate/30 text-stage-iterate text-xs font-mono font-semibold hover:bg-stage-iterate/30 transition-all"
          >
            <RefreshCw size={11} />
            <span>{t("startNewIterate")}</span>
          </button>
        </div>
      </header>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="pt-14 border-b border-border bg-surface-1/60">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-celadon animate-pulse" />
            <span className="text-xs font-mono text-foreground font-semibold">v0.3.0</span>
            <span className="text-[10px] font-mono text-muted-foreground/40">· {t("mockLogLive")}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-celadon">
              <Plus size={10} /> {totalAdd} {t("mockLogAdded")}
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <Minus size={10} /> {totalDel} {t("mockLogDeleted")}
            </span>
            <span className="text-muted-foreground/40">
              · {DIFF_FILES.length} {t("mockLogFileChanges")}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Globe size={11} className="text-muted-foreground/40" />
            <a
              href="https://staging-saas-billing.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-celadon hover:text-celadon-glow transition-colors underline underline-offset-2"
            >
              staging-saas-billing.vercel.app
            </a>
          </div>
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden max-w-screen-2xl w-full mx-auto">

        {/* ── Left: Diff / history ────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-border">

          {/* Tab bar */}
          <div className="flex items-center border-b border-border bg-surface-1/60 flex-shrink-0">
            {(["diff", "history"] as const).map((tab) => (
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
                {tab === "diff" ? <GitBranch size={11} /> : <History size={11} />}
                {{ diff: t("codeChanges"), history: t("versionHistory") }[tab]}
              </button>
            ))}
            <div className="ml-auto mr-4 flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-muted-foreground/30">
                v0.2.0 → v0.3.0
              </span>
            </div>
          </div>

          {/* Diff tab */}
          {activeTab === "diff" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {DIFF_FILES.map((file, i) => (
                <DiffFileCard key={i} file={file} />
              ))}
            </div>
          )}

          {/* History tab */}
          {activeTab === "history" && (
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-border/30">
                {VERSIONS.map((v) => (
                  <VersionRow
                    key={v.version}
                    v={v}
                    selected={selectedVersion === v.version}
                    onSelect={() => setSelectedVersion(v.version)}
                  />
                ))}
              </div>

              {/* Compare block */}
              <div className="p-4 border-t border-border mt-2">
                <div className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-3">
                  {t("versionCompare")}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg border border-border bg-surface-1 px-3 py-2">
                    <div className="text-[10px] font-mono text-muted-foreground/40 mb-0.5">{t("baseline")}</div>
                    <div className="text-xs font-mono text-foreground">v0.2.0</div>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground/30 flex-shrink-0" />
                  <div className="flex-1 rounded-lg border border-celadon/25 bg-celadon/6 px-3 py-2">
                    <div className="text-[10px] font-mono text-muted-foreground/40 mb-0.5">{t("current")}</div>
                    <div className="text-xs font-mono text-celadon">{selectedVersion}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
                  {[
                    ["新增文件", "3"],
                    ["修改文件", "4"],
                    ["提交次数", "6"],
                    ["代码行数", "+34 / -8"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between px-3 py-2 rounded-lg bg-surface-1 border border-border">
                      <span className="text-muted-foreground/40">{k}</span>
                      <span className="text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── Right: Feedback + AI suggestions ────────────────────────────── */}
        <aside className="flex flex-col w-full max-w-sm xl:max-w-md flex-shrink-0 overflow-hidden">

          {/* Feedback header */}
          <div className="p-4 border-b border-border bg-surface-1/40">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-stage-iterate/15 border border-stage-iterate/30 flex items-center justify-center">
                <Sparkles size={11} className="text-stage-iterate" />
              </div>
              <span className="text-xs font-mono font-semibold text-foreground">{t("nextRoundReqs")}</span>
              <span className="ml-auto text-[9px] font-mono text-muted-foreground/30">v0.3.0 → v0.4.0</span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed">
              {t("nextRoundSubtitle")}
            </p>
          </div>

          {/* Collected reqs */}
          {collectedReqs.length > 0 && (
            <div className="px-4 pt-3 pb-0 space-y-2">
              {collectedReqs.map((req, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-celadon/20 bg-celadon/6 px-3 py-2">
                  <CheckCircle2 size={11} className="text-celadon mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-mono text-foreground/80 leading-relaxed">{req}</p>
                </div>
              ))}
            </div>
          )}

          {/* Feedback input */}
          <div className="p-4 border-b border-border">
            {!submitted ? (
              <div className={cn(
                "rounded-xl border bg-surface-1 transition-colors",
                feedback ? "border-stage-iterate/35 bg-stage-iterate/4" : "border-border"
              )}>
                <textarea
                  ref={textareaRef}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                  }}
                  placeholder={t("mockLogNextReqPlaceholder")}
                  rows={4}
                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 outline-none leading-relaxed font-sans px-4 pt-3 pb-2"
                />
                <div className="flex items-center justify-between px-3 pb-3">
                  <span className="text-[10px] font-mono text-muted-foreground/25">
                    {t("mockLogCmdEnterHint")}
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!feedback.trim()}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all",
                      feedback.trim()
                        ? "bg-stage-iterate/20 border border-stage-iterate/35 text-stage-iterate hover:bg-stage-iterate/30"
                        : "bg-surface-3 text-muted-foreground/30 cursor-not-allowed"
                    )}
                  >
                    <Send size={11} />
                    {t("mockLogConfirmReq")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-celadon/25 bg-celadon/6 px-4 py-3 flex items-center gap-3">
                <CheckCircle2 size={14} className="text-celadon flex-shrink-0" />
                <div>
                  <div className="text-xs font-mono font-semibold text-celadon">{t("reqsRecorded")}</div>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-[10px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    + {t("continueAdding")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI suggestions */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <Zap size={10} className="text-muted-foreground/40" />
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                {t("celadonSuggestions")}
              </span>
              <span className="ml-auto text-[9px] font-mono text-muted-foreground/25">
                {t("basedOnAnalysis")}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {AI_SUGGESTIONS.map((s) => (
                <SuggestionChip key={s.id} s={s} onAdd={addSuggestion} />
              ))}
            </div>
          </div>

          {/* Launch loop CTA */}
          <div className="p-4 border-t border-border bg-surface-1/40">
            <div className={cn(
              "rounded-xl border p-4 mb-3 transition-all",
              collectedReqs.length > 0
                ? "border-stage-iterate/30 bg-stage-iterate/6"
                : "border-border bg-surface-1"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <CornerDownRight size={12} className={collectedReqs.length > 0 ? "text-stage-iterate" : "text-muted-foreground/30"} />
                <span className="text-xs font-mono font-semibold text-foreground">{t("startNewIterateLoop")}</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed mb-3">
                {collectedReqs.length > 0
                  ? `${t("reqCollected")} ${collectedReqs.length}, ${t("prdReadyDesc")}`
                  : t("nextRoundSubtitle")}
              </p>
              <button
                onClick={startNewLoop}
                disabled={submitting}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all",
                  collectedReqs.length > 0
                    ? "bg-stage-iterate text-background hover:opacity-90"
                    : "border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
                  submitting && "opacity-50 cursor-wait"
                )}
                style={collectedReqs.length > 0
                  ? { background: "hsl(var(--stage-iterate))" }
                  : undefined}
              >
                <RefreshCw size={12} />
                {collectedReqs.length > 0 ? t("enterClarifyStage") : t("iterate")}
                <ChevronRight size={11} />
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                [t("iterateCount"), "3"],
                [t("totalCommits"), "65"],
                [t("onlineTime"), "14h"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border bg-surface-1 px-2 py-2 text-center">
                  <div className="text-sm font-mono font-bold text-foreground">{v}</div>
                  <div className="text-[9px] font-mono text-muted-foreground/40">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
