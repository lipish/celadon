import { useState, useRef } from "react";
import { ArrowRight, Sparkles, Command, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdeaInputProps {
  onSubmit?: (idea: string) => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  defaultValue?: string;
}

const placeholders = [
  "一个帮助独立开发者管理 SaaS 订阅的后台系统...",
  "基于 AI 的代码审查工具，自动检测安全漏洞...",
  "一个实时协作的 API 设计平台，支持团队共同编写 OpenAPI 规范...",
  "帮助工程师追踪技术债务并自动生成重构建议的工具...",
];

export function IdeaInput({ onSubmit, className, disabled, loading, error, defaultValue }: IdeaInputProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex] = useState(() =>
    Math.floor(Math.random() * placeholders.length)
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (disabled || !value.trim()) return;
    onSubmit?.(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = value.length;
  const isReady = charCount > 10;

  return (
    <div
      className={cn(
        "relative rounded-xl border transition-all duration-300",
        isFocused
          ? "border-celadon/60 shadow-celadon"
          : "border-border hover:border-muted-foreground/30",
        "bg-surface-1",
        className
      )}
    >
      {/* Glow effect when focused */}
      {isFocused && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-celadon/5 to-transparent pointer-events-none" />
      )}

      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles size={14} className="text-celadon" />
        <span className="text-xs font-mono text-muted-foreground">
          idea.md
        </span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-stage-deploy/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-celadon/60" />
        </div>
      </div>

      {/* Textarea */}
      <div className="p-4">
        <div className="flex gap-3">
          <span className="text-xs font-mono text-celadon/50 mt-1 select-none">
            01
          </span>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholders[placeholderIndex]}
            rows={4}
            readOnly={disabled}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40",
              "outline-none font-sans leading-relaxed",
              "scrollbar-thin",
              disabled && "cursor-wait opacity-90"
            )}
          />
        </div>
      </div>

      {/* Footer */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-destructive text-[10px] font-mono">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground/50">
            {charCount > 0 ? `${charCount} chars` : "描述你的想法"}
          </span>
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground/40">
            <Command size={10} />
            <span>+ Enter 提交</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isReady || disabled || loading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all duration-200",
            isReady && !disabled && !loading
              ? "bg-celadon text-primary-foreground hover:bg-celadon-glow shadow-glow cursor-pointer"
              : "bg-surface-3 text-muted-foreground cursor-not-allowed"
          )}
        >
          {loading || disabled ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>正在启动...</span>
            </>
          ) : (
            <>
              <span>启动</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
