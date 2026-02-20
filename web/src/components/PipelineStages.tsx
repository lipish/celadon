import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, MessageSquare, FileText, Code2, Rocket, RefreshCw } from "lucide-react";

export type StageStatus = "pending" | "active" | "done" | "error";

interface PipelineStagesProps {
  activeStage?: string;
  completedStages?: string[];
  className?: string;
  compact?: boolean;
}

export function PipelineStages({
  activeStage,
  completedStages = [],
  className,
  compact = false,
}: PipelineStagesProps) {
  const { t } = useLocale();

  const stageConfig = [
    {
      id: "clarify",
      label: t("stageClarify"),
      sublabel: "Clarify",
      icon: <MessageSquare size={16} />,
      color: "text-stage-clarify",
      bgColor: "bg-stage-clarify/10",
      borderColor: "border-stage-clarify/30",
    },
    {
      id: "prd",
      label: t("stagePrd"),
      sublabel: "PRD",
      icon: <FileText size={16} />,
      color: "text-stage-prd",
      bgColor: "bg-stage-prd/10",
      borderColor: "border-stage-prd/30",
    },
    {
      id: "dev",
      label: t("stageDev"),
      sublabel: "Development",
      icon: <Code2 size={16} />,
      color: "text-stage-dev",
      bgColor: "bg-stage-dev/10",
      borderColor: "border-stage-dev/30",
    },
    {
      id: "deploy",
      label: t("stageDeploy"),
      sublabel: "Deploy",
      icon: <Rocket size={16} />,
      color: "text-stage-deploy",
      bgColor: "bg-stage-deploy/10",
      borderColor: "border-stage-deploy/30",
    },
    {
      id: "iterate",
      label: t("stageIterate"),
      sublabel: "Iterate",
      icon: <RefreshCw size={16} />,
      color: "text-stage-iterate",
      bgColor: "bg-stage-iterate/10",
      borderColor: "border-stage-iterate/30",
    },
  ];
  const stages = stageConfig.map((s) => ({
    ...s,
    status: completedStages.includes(s.id)
      ? "done"
      : s.id === activeStage
        ? "active"
        : "pending",
  })) as (typeof stageConfig[0] & { status: StageStatus })[];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-1">
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                stage.status === "done" && "bg-celadon",
                stage.status === "active" && "bg-celadon animate-pulse-dot",
                stage.status === "pending" && "bg-muted-foreground/30"
              )}
            />
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "w-4 h-px",
                  stage.status === "done" ? "bg-celadon/40" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-0", className)}>
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-2 flex-1">
            {/* Stage node */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                  stage.status === "done" && "border-celadon bg-celadon/15",
                  stage.status === "active" &&
                  "border-celadon bg-celadon/10 animate-pulse-glow",
                  stage.status === "pending" &&
                  "border-border bg-surface-2"
                )}
              >
                {stage.status === "done" ? (
                  <CheckCircle2 size={18} className="text-celadon" />
                ) : stage.status === "active" ? (
                  <Loader2 size={18} className="text-celadon animate-spin" />
                ) : (
                  <span
                    className={cn(
                      "transition-colors",
                      stage.status === "pending"
                        ? "text-muted-foreground"
                        : stage.color
                    )}
                  >
                    {stage.icon}
                  </span>
                )}
              </div>
              <div className="text-center">
                <div
                  className={cn(
                    "text-xs font-mono font-semibold",
                    stage.status === "done" && "text-celadon",
                    stage.status === "active" && "text-celadon",
                    stage.status === "pending" && "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </div>
                <div className="text-[10px] text-muted-foreground/60 font-mono">
                  {stage.sublabel}
                </div>
              </div>
            </div>
          </div>

          {/* Connector line */}
          {i < stages.length - 1 && (
            <div className="flex-shrink-0 w-8 h-px mt-[-24px] relative">
              <div className="absolute inset-0 bg-border" />
              {stage.status === "done" && (
                <div className="absolute inset-0 bg-celadon/50" />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
