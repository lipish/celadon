import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { IdeaInput } from "@/components/IdeaInput";
import { apiStart, apiProjects, getStoredToken, clearStoredToken, type ProjectItem } from "@/lib/api";
import { PipelineStages } from "@/components/PipelineStages";
import { useLocale } from "@/contexts/LocaleContext";
import { Zap, Github, Terminal, ChevronRight, ArrowUpRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

function stageToRoute(stage: string): string {
  switch (stage) {
    case "CLARIFYING":
      return "/clarify";
    case "PRD_CONFIRMED":
      return "/prd";
    case "DEVELOPING":
    case "TESTING":
      return "/dev";
    case "DEPLOYING":
      return "/deploy";
    case "DELIVERED":
      return "/iterate";
    default:
      return "/clarify";
  }
}

function formatUpdatedAt(updated_at: string, t: (k: string) => string): string {
  if (!updated_at) return t("justNow");
  const d = new Date(updated_at);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return t("justNow");
  if (diff < 60) return `${Math.floor(diff)} ${t("minutesAgo")}`;
  return `${Math.floor(diff / 60)} ${t("hoursAgo")}`;
}

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale, setLocale } = useLocale();
  const clarificationDone = (location.state as { clarificationDone?: boolean })?.clarificationDone;
  const returnedIdea = (location.state as { idea?: string })?.idea ?? "";

  const [recentProjects, setRecentProjects] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showPipeline, setShowPipeline] = useState(!!clarificationDone);
  const [idea, setIdea] = useState(returnedIdea);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    apiProjects()
      .then((r) => setRecentProjects(r.projects))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("需要登录")) {
          clearStoredToken();
          navigate("/login", { replace: true });
        }
      })
      .finally(() => setProjectsLoading(false));
  }, [navigate]);

  const handleIdeaSubmit = async (newIdea: string) => {
    setStarting(true);
    setStartError("");
    try {
      const res = await apiStart(newIdea);
      navigate("/clarify", {
        state: {
          idea: newIdea,
          sessionId: res.session_id,
          projectName: res.project_name,
          initialConversation: res.conversation,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "启动失败";
      if (msg.includes("需要登录")) {
        clearStoredToken();
        navigate("/login", { replace: true });
        return;
      }
      setStartError(msg);
    } finally {
      setStarting(false);
    }
  };

  const handleResume = (p: ProjectItem) => {
    const route = stageToRoute(p.stage);
    navigate(route, {
      state: { idea: p.name, sessionId: p.session_id },
    });
  };

  const handleReset = () => {
    setIdea("");
    setShowPipeline(false);
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-celadon flex items-center justify-center">
              <Zap size={14} className="text-primary-foreground" />
            </div>
            <span className="font-mono font-bold text-sm text-foreground tracking-tight">
              {t("appName").toLowerCase()}
            </span>
            <span className="font-mono text-xs text-muted-foreground/50 border border-border px-1.5 py-0.5 rounded">
              v0.1.0
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
              <button
                onClick={() => setLocale("zh")}
                className={`px-2 py-0.5 text-xs font-mono rounded ${locale === "zh" ? "bg-celadon text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                中
              </button>
              <button
                onClick={() => setLocale("en")}
                className={`px-2 py-0.5 text-xs font-mono rounded ${locale === "en" ? "bg-celadon text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                EN
              </button>
            </div>
            <a href="#" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              {t("docs")}
            </a>
            <a href="#" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              {t("api")}
            </a>
            <a href="#" className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              <Github size={13} />
              <span>GitHub</span>
            </a>
            {getStoredToken() ? null : (
              <>
                <Link to="/login" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                  登录
                </Link>
                <Link to="/register" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                  注册
                </Link>
              </>
            )}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-celadon text-primary-foreground text-xs font-mono font-semibold hover:bg-celadon-glow transition-colors shadow-glow">
              <Terminal size={12} />
              {t("getStarted")}
            </button>
          </div>
        </div>
      </nav>

      <section className="relative pt-14 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--surface-border) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--surface-border) / 0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-celadon/30 bg-celadon/8 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-celadon animate-pulse-dot" />
            <span className="text-xs font-mono text-celadon">{t("tagline")}</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-tight">
            <span className="text-foreground">{t("headline1")}</span>
            <span className="text-celadon font-mono"> {t("headline2")} </span>
            <span className="text-foreground">{t("headline3")}</span>
            <br />
            <span className="text-foreground">{t("headline4")}</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
            {t("subtitle")}
            <br />
            <span className="text-muted-foreground/60 text-sm font-mono">{t("poweredBy")}</span>
          </p>

          {!showPipeline ? (
            <div className="max-w-2xl mx-auto animate-fade-in">
              {startError && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {startError}
                </div>
              )}
              <IdeaInput onSubmit={handleIdeaSubmit} disabled={starting} />
              <p className="text-xs font-mono text-muted-foreground/40 mt-3 text-center">{t("hintInput")}</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="rounded-xl border border-celadon/40 bg-surface-1 p-5 shadow-celadon text-left mb-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-6 h-6 rounded-full bg-celadon/15 border border-celadon/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap size={12} className="text-celadon" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{idea}</p>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-celadon">pipeline · {t("clarify")} done</span>
                  </div>
                  <PipelineStages activeStage="prd" completedStages={["clarify"]} />
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-xs font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                ← {t("newIdea")}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Recent projects */}
      <section className="py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {t("recentProjects")}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {projectsLoading ? (
            <div className="text-sm text-muted-foreground font-mono">...</div>
          ) : recentProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground font-mono">{t("noRecentProjects")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.slice(0, 6).map((p) => (
                <div
                  key={p.session_id}
                  className="rounded-xl border border-border bg-surface-1 p-4 hover:border-celadon/40 transition-colors flex flex-col"
                >
                  <div className="font-mono font-semibold text-foreground truncate mb-1">{p.name}</div>
                  <div className="text-xs font-mono text-muted-foreground/60 mb-3">
                    {formatUpdatedAt(p.updated_at, t)}
                  </div>
                  <button
                    onClick={() => handleResume(p)}
                    className="mt-auto flex items-center gap-1.5 text-xs font-mono text-celadon hover:text-celadon-glow"
                  >
                    {t("continueWork")}
                    <ChevronRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Flow overview */}
      <section className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {t("flowOverview")}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <PipelineStages activeStage="dev" completedStages={["clarify", "prd"]} className="max-w-2xl" />
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-celadon flex items-center justify-center">
              <Zap size={11} className="text-primary-foreground" />
            </div>
            <span className="text-xs font-mono text-muted-foreground">{t("appName").toLowerCase()} · idea → software</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground/40">powered by Zene</span>
        </div>
      </footer>
    </div>
  );
}
