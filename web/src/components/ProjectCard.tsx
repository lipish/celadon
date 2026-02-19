import { cn } from "@/lib/utils";
import { PipelineStages } from "./PipelineStages";
import { ExternalLink, Clock, GitCommit } from "lucide-react";

interface ProjectCardProps {
  name: string;
  description: string;
  activeStage?: string;
  completedStages?: string[];
  lastActivity: string;
  commitCount?: number;
  deployUrl?: string;
  className?: string;
  onClick?: () => void;
}

export function ProjectCard({
  name,
  description,
  activeStage,
  completedStages = [],
  lastActivity,
  commitCount = 0,
  deployUrl,
  className,
  onClick,
}: ProjectCardProps) {
  const stageLabels: Record<string, string> = {
    clarify: "澄清中",
    prd: "生成 PRD",
    dev: "开发中",
    deploy: "部署中",
    iterate: "迭代中",
  };

  const activeLabel = activeStage ? stageLabels[activeStage] : "待启动";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-xl border border-border bg-gradient-card p-5 cursor-pointer",
        "transition-all duration-200 hover:border-celadon/40 hover:bg-surface-1",
        "hover:shadow-celadon",
        className
      )}
    >
      {/* Active indicator */}
      {activeStage && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-celadon/10 border border-celadon/25">
            <div className="w-1.5 h-1.5 rounded-full bg-celadon animate-pulse-dot" />
            <span className="text-[10px] font-mono text-celadon font-medium">
              {activeLabel}
            </span>
          </div>
        </div>
      )}

      {/* Project name */}
      <div className="mb-1">
        <h3 className="font-mono font-semibold text-sm text-foreground group-hover:text-celadon transition-colors">
          {name}
        </h3>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
        {description}
      </p>

      {/* Pipeline */}
      <PipelineStages
        activeStage={activeStage}
        completedStages={completedStages}
        compact
        className="mb-4"
      />

      {/* Footer meta */}
      <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground/60">
        <div className="flex items-center gap-1">
          <Clock size={10} />
          <span>{lastActivity}</span>
        </div>
        {commitCount > 0 && (
          <div className="flex items-center gap-1">
            <GitCommit size={10} />
            <span>{commitCount} commits</span>
          </div>
        )}
        {deployUrl && (
          <div className="ml-auto flex items-center gap-1 text-celadon/60 hover:text-celadon transition-colors">
            <ExternalLink size={10} />
            <span>查看部署</span>
          </div>
        )}
      </div>
    </div>
  );
}
