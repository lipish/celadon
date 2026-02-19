import { useState, useEffect, useRef } from "react";
import { Send, Zap, CheckCircle2, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PipelineStages } from "@/components/PipelineStages";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
}

interface ClarifyChatProps {
  idea: string;
  onClarificationDone: (summary: string) => void;
  onReset: () => void;
}

// Simulated clarification questions based on the idea
const buildQuestionFlow = (idea: string): string[] => [
  `我已收到你的想法：「${idea}」\n\n在开始生成 PRD 之前，我需要了解几个关键点。\n\n**首先，关于目标用户：** 这个产品主要面向哪类用户？是个人开发者、企业团队，还是特定行业的用户？对技术能力有要求吗？`,
  "明白了。**关于核心功能边界：** 你希望 MVP（最小可行版本）包含哪些功能？哪些是「必须有」，哪些是「未来再说」？",
  "好的。**关于技术约束：** 有没有偏好的技术栈、部署方式或需要集成的第三方服务？比如认证方式、数据库、云平台等。",
  "最后，**关于验收标准：** 你认为什么情况下可以说这个产品「做完了」？有没有具体的性能指标、用户行为或功能里程碑？",
];

const buildSummary = (idea: string, answers: string[]): string =>
  `目标用户：${answers[0]?.slice(0, 60)}... | 核心功能已确认 | 技术栈：${answers[2]?.slice(0, 40)}... | 验收标准已记录`;

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-celadon/60"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={cn("flex gap-3", isAssistant ? "flex-row" : "flex-row-reverse")}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isAssistant ? (
          <div className="w-6 h-6 rounded-lg bg-celadon/15 border border-celadon/30 flex items-center justify-center">
            <Zap size={11} className="text-celadon" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-lg bg-surface-3 border border-border flex items-center justify-center">
            <span className="text-[9px] font-mono text-muted-foreground">me</span>
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[80%] group", isAssistant ? "" : "items-end")}>
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isAssistant
              ? "bg-surface-1 border border-border text-foreground"
              : "bg-celadon/15 border border-celadon/25 text-foreground"
          )}
        >
          {/* Render markdown-like bold */}
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: message.content
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
                .replace(/「(.*?)」/g, '<span class="font-mono text-celadon/90">「$1」</span>')
                .replace(/\n/g, "<br/>"),
            }}
          />
        </div>
        <div className={cn(
          "text-[10px] font-mono text-muted-foreground/30 mt-1 px-1",
          isAssistant ? "text-left" : "text-right"
        )}>
          {message.timestamp}
        </div>
      </div>
    </div>
  );
}

export function ClarifyChat({ idea, onClarificationDone, onReset }: ClarifyChatProps) {
  const questions = buildQuestionFlow(idea);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const now = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const addAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content, timestamp: now() },
    ]);
  };

  // First message on mount
  useEffect(() => {
    setIsTyping(true);
    const t = setTimeout(() => {
      setIsTyping(false);
      addAssistantMessage(questions[0]);
      setQuestionIndex(1);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping || isDone) return;

    const newAnswers = [...userAnswers, text];
    setUserAnswers(newAnswers);

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text, timestamp: now() },
    ]);
    setInput("");

    if (questionIndex < questions.length) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addAssistantMessage(questions[questionIndex]);
        setQuestionIndex((i) => i + 1);
      }, 800 + Math.random() * 600);
    } else {
      // All questions answered
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addAssistantMessage(
          "✓ 澄清完成。我已记录所有关键信息：\n\n- 目标用户与使用场景\n- MVP 功能边界\n- 技术栈与集成约束\n- 验收标准与里程碑\n\n正在生成 PRD..."
        );
        setTimeout(() => {
          setIsDone(true);
        }, 1500);
      }, 900);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const progress = Math.min(100, Math.round((userAnswers.length / questions.length) * 100));

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="rounded-t-xl border border-border border-b-0 bg-surface-1 px-4 py-3 flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-celadon/15 border border-celadon/30 flex items-center justify-center">
          <Zap size={11} className="text-celadon" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-foreground">celadon / clarify</span>
            {!isDone && (
              <span className="flex items-center gap-1">
                <Loader2 size={10} className="text-stage-clarify animate-spin" />
                <span className="text-[10px] font-mono text-stage-clarify">运行中</span>
              </span>
            )}
            {isDone && (
              <span className="flex items-center gap-1">
                <CheckCircle2 size={10} className="text-celadon" />
                <span className="text-[10px] font-mono text-celadon">完成</span>
              </span>
            )}
          </div>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-celadon transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/50">{userAnswers.length}/{questions.length}</span>
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="border border-border border-b-0 border-t-0 bg-background/30 px-4 py-2">
        <PipelineStages activeStage="clarify" completedStages={[]} compact />
      </div>

      {/* Messages */}
      <div className="border border-border border-b-0 bg-background/20 h-72 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-lg bg-celadon/15 border border-celadon/30 flex items-center justify-center flex-shrink-0 mt-1">
              <Zap size={11} className="text-celadon" />
            </div>
            <div className="bg-surface-1 border border-border rounded-xl px-4 py-3">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isDone ? (
        <div className="border border-border rounded-b-xl bg-surface-1">
          <div className="flex items-end gap-3 p-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的回答..."
              disabled={isTyping}
              rows={2}
              className={cn(
                "flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40",
                "outline-none font-sans leading-relaxed",
                isTyping && "opacity-40 cursor-not-allowed"
              )}
            />
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  input.trim() && !isTyping
                    ? "bg-celadon text-primary-foreground hover:bg-celadon-glow shadow-glow"
                    : "bg-surface-3 text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                <Send size={13} />
              </button>
              <span className="text-[9px] font-mono text-muted-foreground/30">↵ 发送</span>
            </div>
          </div>
        </div>
      ) : (
        /* Done state */
        <div className="border border-border rounded-b-xl bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-celadon" />
              <span className="text-xs font-mono text-celadon">澄清已完成 · 正在生成 PRD</span>
            </div>
            <button
              onClick={() => onClarificationDone(buildSummary(idea, userAnswers))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow"
            >
              <span>进入 PRD</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Reset */}
      <div className="mt-3 text-center">
        <button
          onClick={onReset}
          className="text-xs font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          ← 重新输入想法
        </button>
      </div>
    </div>
  );
}
