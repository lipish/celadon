import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Send, Zap, CheckCircle2, Loader2, ArrowLeft,
  ChevronRight, MessageSquare, FileText, Code2, Rocket, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { apiAppendIdea, apiStatus } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
}

// ─── Pipeline mini ───────────────────────────────────────────────────────────

const STAGE_ICONS = [
  { id: "clarify", label: "澄清", sub: "Clarify", Icon: MessageSquare },
  { id: "prd", label: "需求", sub: "PRD", Icon: FileText },
  { id: "dev", label: "开发", sub: "Dev", Icon: Code2 },
  { id: "deploy", label: "部署", sub: "Deploy", Icon: Rocket },
  { id: "iterate", label: "迭代", sub: "Iterate", Icon: RefreshCw },
];

function PipelineMini({ done }: { done: number }) {
  return (
    <div className="flex items-center gap-0">
      {STAGE_ICONS.map((s, i) => {
        const status = i < done ? "done" : i === done ? "active" : "pending";
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-500",
                  status === "done" && "border-celadon bg-celadon/15",
                  status === "active" && "border-celadon bg-celadon/10",
                  status === "pending" && "border-border bg-surface-2"
                )}
              >
                {status === "done" ? (
                  <CheckCircle2 size={13} className="text-celadon" />
                ) : status === "active" ? (
                  <Loader2 size={13} className="text-celadon animate-spin" />
                ) : (
                  <s.Icon size={12} className="text-muted-foreground/40" />
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono",
                  status === "pending" ? "text-muted-foreground/30" : "text-celadon"
                )}
              >
                {s.sub}
              </span>
            </div>
            {i < STAGE_ICONS.length - 1 && (
              <div
                className={cn("w-6 h-px mb-4", i < done ? "bg-celadon/40" : "bg-border")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-celadon/50 inline-block"
          style={{ animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite` }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={cn("flex gap-3 group", isAssistant ? "" : "flex-row-reverse")}>
      <div className="flex-shrink-0 mt-1">
        {isAssistant ? (
          <div className="w-7 h-7 rounded-lg bg-celadon/15 border border-celadon/30 flex items-center justify-center">
            <Zap size={12} className="text-celadon" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-surface-3 border border-border flex items-center justify-center">
            <span className="text-[9px] font-mono text-muted-foreground">me</span>
          </div>
        )}
      </div>

      <div className={cn("max-w-[75%]", !isAssistant && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isAssistant
              ? "bg-surface-1 border border-border rounded-tl-sm text-foreground"
              : "bg-celadon/12 border border-celadon/20 rounded-tr-sm text-foreground"
          )}
          dangerouslySetInnerHTML={{
            __html: message.content
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
              .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-celadon/40 pl-3 text-muted-foreground italic my-1">$1</blockquote>')
              .replace(/\n/g, "<br/>"),
          }}
        />
        <span
          className={cn(
            "text-[10px] font-mono text-muted-foreground/30 mt-1 px-1",
            isAssistant ? "text-left" : "text-right"
          )}
        >
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}

function convToMessages(conv: Array<{ role: string; content: string }>): Message[] {
  const now = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };
  const t = now();
  return conv.map((c) => ({
    id: crypto.randomUUID(),
    role: c.role as "user" | "assistant",
    content: c.content,
    timestamp: t,
  }));
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClarifyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale, setLocale } = useLocale();
  const state = location.state as {
    idea?: string;
    sessionId?: string;
    projectName?: string;
    initialConversation?: Array<{ role: string; content: string }>;
  } | null;
  const idea = state?.idea ?? "";
  const sessionId = state?.sessionId ?? "";
  const initialConversation = state?.initialConversation;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const now = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      navigate("/", { replace: true });
      return;
    }
    if (initialConversation?.length) {
      setMessages(convToMessages(initialConversation));
    } else {
      // Fetch status to get conversation
      apiStatus(sessionId)
        .then((s) => {
          if (s.conversation?.length) {
            setMessages(convToMessages(s.conversation));
          }
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    }
    if (initialConversation?.length) setLoaded(true);
  }, [sessionId, navigate, initialConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || !sessionId) return;

    setError("");
    setInput("");
    setMessages((p) => [...p, { id: crypto.randomUUID(), role: "user", content: text, timestamp: now() }]);
    setIsTyping(true);

    try {
      const res = await apiAppendIdea(sessionId, text);
      setMessages((p) => [
        ...p,
        { id: crypto.randomUUID(), role: "assistant", content: res.assistant_reply, timestamp: now() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setIsTyping(false);
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const goToPrd = () => {
    navigate("/prd", { state: { sessionId, idea } });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={13} />
            <span>{t("back")}</span>
          </button>
          <div className="hidden sm:flex items-center">
            <PipelineMini done={0} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
              <button type="button" onClick={() => setLocale("zh")} className={`px-2 py-0.5 text-xs font-mono rounded ${locale === "zh" ? "bg-celadon text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>中</button>
              <button type="button" onClick={() => setLocale("en")} className={`px-2 py-0.5 text-xs font-mono rounded ${locale === "en" ? "bg-celadon text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>EN</button>
            </div>
            <div className="w-6 h-6 rounded-md bg-celadon flex items-center justify-center">
              <Zap size={12} className="text-primary-foreground" />
            </div>
            <span className="text-xs font-mono font-bold text-foreground hidden sm:inline">celadon</span>
            <button
              onClick={goToPrd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow"
            >
              <FileText size={12} />
              <span>{t("generatePrd")}</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex pt-14">
        {/* Left sidebar */}
        <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-surface-1/50 p-6 gap-6 flex-shrink-0">
          <div>
            <div className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">
              原始想法
            </div>
            <div className="rounded-xl border border-celadon/20 bg-celadon/5 p-4">
              <p className="text-sm text-foreground leading-relaxed">{idea || "（无内容）"}</p>
            </div>
          </div>
        </aside>

        {/* Center — chat */}
        <main className="flex-1 flex flex-col min-h-0 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
            <div className="w-8 h-8 rounded-xl bg-celadon/15 border border-celadon/30 flex items-center justify-center">
              <Zap size={15} className="text-celadon" />
            </div>
            <div>
              <div className="text-sm font-mono font-semibold text-foreground">Celadon · {t("clarifyTitle")}</div>
              <div className="text-[10px] font-mono text-muted-foreground/50">
                {isTyping ? t("thinking") : t("clarifySubtitle")}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {!loaded && messages.length === 0 && (
              <div className="flex items-center gap-3">
                <Loader2 size={16} className="text-celadon animate-spin" />
                <span className="text-sm font-mono text-muted-foreground">加载对话...</span>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-celadon/15 border border-celadon/30 flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap size={12} className="text-celadon" />
                </div>
                <div className="bg-surface-1 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border bg-surface-1/60 backdrop-blur-sm">
            {error && (
              <div className="px-6 pt-3 text-sm text-destructive">{error}</div>
            )}
            <div className="max-w-3xl mx-auto px-6 py-4">
              <div className="flex items-end gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-3 focus-within:border-celadon/40 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isTyping ? "Celadon 正在思考..." : "输入你的回答... (Enter 发送，Shift+Enter 换行)"}
                  disabled={isTyping}
                  rows={3}
                  className={cn(
                    "flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none leading-relaxed font-sans",
                    isTyping && "opacity-40 cursor-not-allowed"
                  )}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                    input.trim() && !isTyping
                      ? "bg-celadon text-primary-foreground hover:bg-celadon-glow shadow-glow"
                      : "bg-surface-3 text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  <Send size={14} />
                </button>
              </div>
              <div className="mt-2 px-1">
                <span className="text-[10px] font-mono text-muted-foreground/30">
                  Enter 发送 · Shift+Enter 换行
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
