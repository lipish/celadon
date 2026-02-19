import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft, Zap, CheckCircle2, Loader2, Code2, Rocket,
  RefreshCw, FileText, MessageSquare, Download, ChevronRight,
  Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { apiGeneratePrd } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TocItem {
  id: string;
  text: string;
  level: number;
}

// ─── Pipeline bar ─────────────────────────────────────────────────────────────

const STAGES = [
  { id: "clarify", sub: "Clarify", Icon: MessageSquare },
  { id: "prd",     sub: "PRD",     Icon: FileText       },
  { id: "dev",     sub: "Dev",     Icon: Code2          },
  { id: "deploy",  sub: "Deploy",  Icon: Rocket         },
  { id: "iterate", sub: "Iterate", Icon: RefreshCw      },
];

function PipelineBar() {
  return (
    <div className="flex items-center gap-0">
      {STAGES.map((s, i) => {
        const done   = i === 0;               // clarify = done
        const active = i === 1;               // prd = active
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
              <div className={cn("w-6 h-px mb-4", i < 1 ? "bg-celadon/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── TOC sidebar ──────────────────────────────────────────────────────────────

function TableOfContents({ items, activeId }: { items: TocItem[]; activeId: string }) {
  return (
    <nav className="space-y-0.5">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className={cn(
            "flex items-start gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all",
            item.level === 1 && "font-semibold",
            item.level === 2 && "pl-5",
            item.level === 3 && "pl-8",
            activeId === item.id
              ? "bg-celadon/12 text-celadon border-l-2 border-celadon"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
          )}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

function PrdMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // H1 — document title
        h1: ({ children }) => {
          const text = String(children);
          return (
            <h1
              id={slugify(text)}
              className="text-2xl font-bold font-mono text-foreground mt-0 mb-2 pb-3 border-b border-border"
            >
              {children}
            </h1>
          );
        },
        // H2 — major sections
        h2: ({ children }) => {
          const text = String(children);
          return (
            <h2
              id={slugify(text)}
              className="text-base font-bold font-mono text-foreground mt-10 mb-3 flex items-center gap-2 scroll-mt-20"
            >
              <span className="w-1 h-4 rounded-full bg-celadon inline-block flex-shrink-0" />
              {children}
            </h2>
          );
        },
        // H3 — sub-sections
        h3: ({ children }) => {
          const text = String(children);
          return (
            <h3
              id={slugify(text)}
              className="text-sm font-semibold font-mono text-foreground mt-6 mb-2 scroll-mt-20"
            >
              {children}
            </h3>
          );
        },
        // H4
        h4: ({ children }) => (
          <h4 className="text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider mt-4 mb-2">
            {children}
          </h4>
        ),
        // Paragraph
        p: ({ children }) => (
          <p className="text-sm text-foreground/85 leading-relaxed mb-3">{children}</p>
        ),
        // Blockquote — metadata/callout
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-celadon/50 pl-4 py-1 my-4 bg-celadon/5 rounded-r-lg">
            <div className="text-xs font-mono text-muted-foreground leading-relaxed">{children}</div>
          </blockquote>
        ),
        // Horizontal rule — section separator
        hr: () => <hr className="border-border my-8" />,
        // Code block
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            const lang = className?.replace("language-", "") ?? "";
            return (
              <div className="my-4 rounded-xl overflow-hidden border border-border">
                {lang && (
                  <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-border">
                    <span className="text-[10px] font-mono text-muted-foreground/60">{lang}</span>
                  </div>
                )}
                <pre className="bg-background p-4 overflow-x-auto">
                  <code className="text-xs font-mono text-foreground/80 leading-relaxed">
                    {children}
                  </code>
                </pre>
              </div>
            );
          }
          return (
            <code
              className="px-1.5 py-0.5 rounded-md bg-surface-2 border border-border text-xs font-mono text-celadon"
              {...props}
            >
              {children}
            </code>
          );
        },
        // Table
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-surface-2 border-b border-border">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2.5 text-left text-xs font-mono font-semibold text-muted-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2.5 text-xs text-foreground/80 border-t border-border/50">
            {children}
          </td>
        ),
        // Ordered / unordered list
        ul: ({ children }) => (
          <ul className="my-3 space-y-1.5 pl-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-3 space-y-1.5 pl-1 list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-celadon/50 flex-shrink-0" />
            <span>{children}</span>
          </li>
        ),
        // Strong
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        // Em
        em: ({ children }) => (
          <em className="italic text-muted-foreground">{children}</em>
        ),
        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-celadon underline underline-offset-2 hover:text-celadon-glow transition-colors"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLocale();
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-1 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all"
    >
      {copied ? <Check size={12} className="text-celadon" /> : <Copy size={12} />}
      {copied ? t("copied") : t("copyMd")}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrdPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale, setLocale } = useLocale();
  const state = location.state as { sessionId?: string; idea?: string } | null;
  const sessionId = state?.sessionId ?? "";
  const idea = state?.idea ?? "未知项目";

  const [prdContent, setPrdContent] = useState("");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [generating, setGenerating] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate("/", { replace: true });
      return;
    }
    setGenerating(true);
    setError("");
    apiGeneratePrd(sessionId)
      .then((res) => {
        const raw = res.content;
        const empty = raw == null || (typeof raw === "string" && raw.trim() === "");
        const content = empty
          ? "# PRD\n\n暂无内容\n\n请确认后端已配置 LLM（如 DEEPSEEK_API_KEY），并重试「生成 PRD」。"
          : (raw as string);
        setPrdContent(content);
        setWordCount(content.split(/\s+/).filter(Boolean).length);
        if (empty) setError("PRD 未返回内容，请检查后端 LLM 配置或重试");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "生成失败");
        setPrdContent("# PRD\n\n生成失败，请返回澄清阶段重试。");
      })
      .finally(() => setGenerating(false));
  }, [sessionId, navigate]);

  // Build TOC from headings in the markdown
  useEffect(() => {
    if (generating) return;
    const lines = prdContent.split("\n");
    const items: TocItem[] = [];
    for (const line of lines) {
      const m = line.match(/^(#{1,3})\s+(.+)/);
      if (m) {
        const level = m[1].length;
        const text  = m[2].replace(/\*\*/g, "").replace(/`/g, "").trim();
        items.push({ id: slugify(text), text, level });
      }
    }
    setToc(items);
  }, [generating, prdContent]);

  // Active TOC tracking via IntersectionObserver
  const observe = useCallback(() => {
    if (!contentRef.current) return;
    const headings = contentRef.current.querySelectorAll("h1,h2,h3");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: "-20% 0% -70% 0%", threshold: 0 }
    );
    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!generating) {
      const cleanup = observe();
      return cleanup;
    }
  }, [generating, observe]);

  const shortTitle = idea.length > 40 ? idea.slice(0, 37) + "..." : idea;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate("/clarify", { state: { idea, sessionId } })}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">{t("clarify")}</span>
          </button>

          <div className="flex-1 flex items-center justify-center">
            <div className="hidden md:block">
              <PipelineBar />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
              <button type="button" onClick={() => setLocale("zh")} className={`px-2 py-0.5 text-xs font-mono rounded ${locale === "zh" ? "bg-celadon text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>中</button>
              <button type="button" onClick={() => setLocale("en")} className={`px-2 py-0.5 text-xs font-mono rounded ${locale === "en" ? "bg-celadon text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>EN</button>
            </div>
            {!generating && <CopyButton text={prdContent} />}
            <button
              onClick={() => navigate("/dev", { state: { idea, sessionId } })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow"
            >
              <Code2 size={12} />
              <span>{t("enterDev")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex pt-14">

        {/* ── Left sidebar: 当前项目 + 文档章节目录 ───────────────────────────── */}
        <aside className="hidden xl:flex flex-col w-64 flex-shrink-0 border-r border-border bg-surface-1/40 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="p-4 border-b border-border">
            <div className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-1">
              {t("currentProject")}
            </div>
            <div className="text-xs font-mono text-foreground truncate">{shortTitle}</div>
          </div>
          <div className="p-3 flex-1">
            <div className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2 px-1">
              {t("sections")}
            </div>
            {generating ? (
              <div className="flex flex-col gap-2 mt-2">
                {[60, 45, 50, 35, 55, 40].map((w, i) => (
                  <div key={i} className="h-3 rounded bg-surface-3 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : (
              <TableOfContents items={toc} activeId={activeId} />
            )}
          </div>
          {!generating && (
            <div className="p-4 border-t border-border">
              <div className="text-[10px] font-mono text-muted-foreground/40">{wordCount.toLocaleString()} 词 · v0.1.0</div>
            </div>
          )}
        </aside>

        {/* ── Main PRD content ──────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-6 py-10">

            {error && (
              <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {generating ? (
              /* Skeleton loader */
              <div className="space-y-6 animate-pulse">
                <div className="flex items-center gap-3 mb-8">
                  <Loader2 size={16} className="text-celadon animate-spin" />
                  <span className="text-sm font-mono text-celadon">正在生成 PRD 文档...</span>
                </div>
                <div className="h-8 bg-surface-2 rounded-lg w-3/4" />
                <div className="h-4 bg-surface-2 rounded w-1/2" />
                <div className="h-px bg-border w-full" />
                {[80, 65, 90, 70, 55, 85, 60, 75].map((w, i) => (
                  <div key={i} className="h-3 bg-surface-2 rounded" style={{ width: `${w}%`, animationDelay: `${i * 0.08}s` }} />
                ))}
                <div className="h-6 bg-surface-2 rounded w-1/3 mt-8" />
                {[70, 55, 80, 60].map((w, i) => (
                  <div key={i} className="h-3 bg-surface-2 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <div ref={contentRef} className="animate-fade-in">
                {/* Doc meta bar */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-celadon/10 border border-celadon/25">
                    <div className="w-1.5 h-1.5 rounded-full bg-celadon animate-pulse" />
                    <span className="text-[10px] font-mono text-celadon">已生成 · 草稿</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/40">
                    {wordCount.toLocaleString()} 词 · {toc.length} 个章节
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Download size={11} className="text-muted-foreground/40" />
                    <span className="text-[10px] font-mono text-muted-foreground/40">prd-v0.1.0.md</span>
                  </div>
                </div>

                {/* PRD Markdown */}
                <PrdMarkdown content={prdContent} />

                {/* Bottom CTA */}
                <div className="mt-16 pt-8 border-t border-border">
                  <div className="rounded-2xl border border-celadon/25 bg-celadon/6 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-mono font-semibold text-foreground mb-1">PRD 已就绪</div>
                      <div className="text-xs text-muted-foreground">确认需求文档后，Celadon 将启动 Zene 执行开发任务</div>
                    </div>
                    <button
                      onClick={() => navigate("/dev", { state: { idea, sessionId } })}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-celadon text-primary-foreground text-sm font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow flex-shrink-0"
                    >
                      <Code2 size={14} />
                      <span>启动开发</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── Right meta panel ──────────────────────────────────────────────── */}
        <aside className="hidden 2xl:flex flex-col w-56 flex-shrink-0 border-l border-border bg-surface-1/40 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto p-4 gap-4">
          <div>
            <div className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">文档信息</div>
            <div className="space-y-2 text-xs font-mono">
              {[
                ["版本", "v0.1.0"],
                ["状态", "草稿"],
                ["生成方式", "Celadon AI"],
                ["模板", "Standard PRD"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground/50">{k}</span>
                  <span className="text-foreground">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">章节</div>
            <div className="space-y-1">
              {generating ? (
                [60, 75, 50].map((w, i) => (
                  <div key={i} className="h-2.5 rounded bg-surface-3 animate-pulse" style={{ width: `${w}%` }} />
                ))
              ) : (
                toc.filter((t) => t.level === 2).map((item) => (
                  <div key={item.id} className="text-[10px] font-mono text-muted-foreground/60 truncate">
                    · {item.text}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-auto">
            <div className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">快速操作</div>
            <div className="space-y-1.5">
              {!generating && <CopyButton text={prdContent} />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
