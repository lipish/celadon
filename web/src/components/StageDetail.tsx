import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface LogLine {
  type: "info" | "success" | "warn" | "cmd";
  text: string;
  time?: string;
}

interface StageDetailProps {
  stageName: string;
  stageSubtitle: string;
  status: "active" | "done" | "pending";
  logs?: LogLine[];
  output?: string;
  className?: string;
}

const typeStyles: Record<LogLine["type"], string> = {
  info: "text-muted-foreground",
  success: "text-celadon",
  warn: "text-stage-deploy",
  cmd: "text-stage-clarify",
};

const typePrefixes: Record<LogLine["type"], string> = {
  info: "  ",
  success: "✓ ",
  warn: "⚠ ",
  cmd: "$ ",
};

export function StageDetail({
  stageName,
  stageSubtitle,
  status,
  logs = [],
  output,
  className,
}: StageDetailProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface-1 overflow-hidden",
        status === "active" && "border-celadon/30",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors text-left"
      >
        {status === "done" ? (
          <CheckCircle2 size={16} className="text-celadon flex-shrink-0" />
        ) : status === "active" ? (
          <Loader2 size={16} className="text-celadon animate-spin flex-shrink-0" />
        ) : (
          <Circle size={16} className="text-muted-foreground/40 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-foreground">
              {stageName}
            </span>
            <span className="text-xs text-muted-foreground/50 font-mono">
              / {stageSubtitle}
            </span>
          </div>
        </div>

        {expanded ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </button>

      {/* Logs */}
      {expanded && logs.length > 0 && (
        <div className="border-t border-border bg-background/40 p-4 font-mono text-xs space-y-1 max-h-52 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3">
              {log.time && (
                <span className="text-muted-foreground/30 flex-shrink-0 w-14">
                  {log.time}
                </span>
              )}
              <span className={cn("break-all", typeStyles[log.type])}>
                {typePrefixes[log.type]}
                {log.text}
              </span>
            </div>
          ))}
          {status === "active" && (
            <div className="flex gap-3">
              {logs[0]?.time && (
                <span className="text-muted-foreground/30 w-14">now</span>
              )}
              <span className="text-celadon cursor-blink" />
            </div>
          )}
        </div>
      )}

      {/* Output block */}
      {expanded && output && (
        <div className="border-t border-border bg-surface-2 p-4">
          <div className="text-[10px] font-mono text-muted-foreground/50 mb-2 uppercase tracking-wider">
            Output
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{output}</p>
        </div>
      )}
    </div>
  );
}
