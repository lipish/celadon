import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { IdeaInput } from "@/components/IdeaInput";
import { apiStart, apiProjects, apiJoinWaitingList, type ProjectItem } from "@/lib/api";
import { PipelineStages } from "@/components/PipelineStages";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Zap,
  Terminal,
  ChevronRight,
  LogOut,
  User,
  Languages,
  ChevronDown,
  Settings,
  Key,
  LifeBuoy,
  MessageSquare,
  Code2,
  RefreshCw,
  Rocket,
  FileText,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale, setLocale } = useLocale();
  const { email, logout } = useAuth();
  const returnedIdea = (location.state as { idea?: string })?.idea ?? "";

  const [recentProjects, setRecentProjects] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [waitingListEmail, setWaitingListEmail] = useState("");
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [tempIdea, setTempIdea] = useState("");
  const [waitingListSuccess, setWaitingListSuccess] = useState(false);

  useEffect(() => {
    if (email) {
      apiProjects()
        .then((r) => setRecentProjects(r.projects))
        .catch(() => { /* Auth context handles 401 */ })
        .finally(() => setProjectsLoading(false));
    } else {
      setProjectsLoading(false);
    }
  }, [email]);

  const handleIdeaSubmit = async (newIdea: string) => {
    if (!email) {
      setTempIdea(newIdea);
      setShowWaitingList(true);
      return;
    }

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
      setStartError(e instanceof Error ? e.message : "启动失败");
    } finally {
      setStarting(false);
    }
  };

  const handleWaitingListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitingListEmail.trim() || !tempIdea) return;

    setStarting(true);
    setStartError("");
    try {
      await apiJoinWaitingList(waitingListEmail, tempIdea);
      setWaitingListSuccess(true);
      setTimeout(() => {
        setShowWaitingList(false);
        setWaitingListSuccess(false);
        setWaitingListEmail("");
      }, 3000);
    } catch (e) {
      setStartError(t("waitingListError"));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header / Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-celadon flex items-center justify-center">
              <Zap size={14} className="text-primary-foreground" />
            </div>
            <span className="font-mono font-bold text-sm text-foreground tracking-tight">
              {t("appName").toLowerCase()}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg bg-background/50 focus:outline-none">
                  <Languages size={14} className="text-celadon" />
                  <span>{locale === "zh" ? "中文" : "EN"}</span>
                  <ChevronDown size={12} className="opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[120px] font-mono">
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1.5">
                  {t("language")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLocale("zh")}
                  className={`text-xs ${locale === "zh" ? "text-celadon font-bold" : ""}`}
                >
                  {t("chinese")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocale("en")}
                  className={`text-xs ${locale === "en" ? "text-celadon font-bold" : ""}`}
                >
                  {t("english")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {email ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 group focus:outline-none">
                    <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted-foreground group-hover:border-celadon/50 transition-colors">
                      <User size={16} />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 font-mono p-1">
                  <DropdownMenuLabel className="px-2 py-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-foreground font-bold truncate">{email}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Standard Account</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs py-2">
                    <User size={14} className="mr-2" />
                    <span>{t("profile")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs py-2">
                    <Settings size={14} className="mr-2" />
                    <span>{t("settings")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs py-2">
                    <Key size={14} className="mr-2" />
                    <span>{t("changePassword")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs py-2">
                    <LifeBuoy size={14} className="mr-2" />
                    <span>Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => { await logout(); navigate("/login", { replace: true }); }}
                    className="text-xs py-2 text-destructive focus:text-destructive"
                  >
                    <LogOut size={14} className="mr-2" />
                    <span>{t("logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className="px-4 py-1.5 rounded-lg bg-celadon text-primary-foreground text-xs font-mono font-bold hover:bg-celadon-glow transition-all shadow-glow">
                {t("getStartedButton")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden border-b border-border">
        <div className="absolute inset-0 z-0 opacity-20 bg-[url('@/assets/hero-bg.jpg')] bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0" />

        <div className="container relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border mb-8">
            <span className="flex h-2 w-2 rounded-full bg-celadon animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-muted-foreground">
              {t("tagline")}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tighter mb-6">
            <span className="text-foreground">{t("headline1")}</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-celadon via-celadon-glow to-celadon bg-[length:200%_auto] animate-gradient">
              {t("headline2")}
            </span>{" "}
            <span className="text-foreground">{t("headline3")}</span>{" "}
            <br className="hidden md:block" />
            <span className="text-foreground">{t("headline4")}</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-muted-foreground font-mono leading-relaxed mb-10 text-balance">
            {t("heroSubtitle")}
          </p>

          <IdeaInput
            onSubmit={handleIdeaSubmit}
            loading={starting}
            error={startError}
            defaultValue={returnedIdea}
          />

          {/* Waiting List Overlay/Modal */}
          {showWaitingList && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="w-full max-w-md p-8 rounded-3xl border border-border bg-surface-2 shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-celadon/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                <div className="space-y-2">
                  <h3 className="text-2xl font-mono font-bold text-foreground">{t("waitingListTitle")}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{t("waitingListSubtitle")}</p>
                </div>

                {waitingListSuccess ? (
                  <div className="py-8 text-center space-y-4 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 rounded-full bg-celadon/20 border border-celadon/40 flex items-center justify-center mx-auto text-celadon">
                      <CheckCircle2 size={32} />
                    </div>
                    <p className="font-mono font-bold text-celadon">{t("waitingListSuccess")}</p>
                  </div>
                ) : (
                  <form onSubmit={handleWaitingListSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground ml-1">
                        {t("waitingListEmailPlaceholder")}
                      </label>
                      <input
                        type="email"
                        required
                        value={waitingListEmail}
                        onChange={(e) => setWaitingListEmail(e.target.value)}
                        placeholder="hello@example.com"
                        className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-celadon/50 focus:ring-1 focus:ring-celadon/50 outline-none font-mono text-sm transition-all"
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowWaitingList(false)}
                        className="flex-1 h-12 rounded-xl border border-border font-mono text-sm font-bold hover:bg-surface-3 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={starting}
                        className="flex-2 h-12 px-8 rounded-xl bg-celadon text-primary-foreground font-mono font-bold hover:bg-celadon-glow transition-all shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {starting && <Loader2 size={16} className="animate-spin" />}
                        {t("waitingListSubmit")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container max-w-7xl mx-auto px-6 py-16">
        {email ? (
          /* WORKBENCH MODE */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-celadon" />
                  <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground">
                    {t("recentProjects")}
                  </h2>
                </div>
                <button className="text-[10px] font-mono text-muted-foreground hover:text-celadon transition-colors uppercase tracking-widest">
                  {t("viewAll")}
                </button>
              </div>

              <div className="space-y-4">
                {projectsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse border border-border/50" />
                  ))
                ) : recentProjects.length > 0 ? (
                  recentProjects.map((project) => (
                    <button
                      key={project.project_id}
                      onClick={() => navigate(stageToRoute(project.stage), { state: { sessionId: project.session_id } })}
                      className="w-full text-left p-4 rounded-xl bg-surface-2 border border-border/50 hover:border-celadon/40 hover:bg-surface-3 transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-mono font-bold text-sm text-foreground truncate max-w-[150px]">
                          {project.name}
                        </h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/50 border border-border text-muted-foreground">
                          {project.stage}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Terminal size={10} className="text-celadon" />
                          {project.status === "ACTIVE" ? "Active" : "Paused"}
                        </span>
                      </div>
                      <ChevronRight
                        size={14}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                      />
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center rounded-xl border border-dashed border-border">
                    <p className="text-xs font-mono text-muted-foreground">{t("noRecentProjects")}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-celadon" />
                <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground">
                  {t("flowOverview")}
                </h2>
              </div>
              <PipelineStages />
            </div>
          </div>
        ) : (
          /* MARKETING MODE */
          <div className="space-y-32">
            {/* Examples Section */}
            <div className="space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-mono font-bold">{t("examplesTitle")}</h2>
                <p className="text-muted-foreground font-mono">{t("examplesSubtitle")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <ExampleCard
                  title={t("saasBillingTitle")}
                  desc={t("saasBillingDesc")}
                  status="DEVELOPING"
                  commits={12}
                  time="3m ago"
                />
                <ExampleCard
                  title={t("aiReviewerTitle")}
                  desc={t("aiReviewerDesc")}
                  status="COMPLETED"
                  commits={47}
                  time="2h ago"
                />
                <ExampleCard
                  title={t("apiCollabTitle")}
                  desc={t("apiCollabDesc")}
                  status="CLARIFYING"
                  commits={0}
                  time="just now"
                />
              </div>
            </div>

            {/* DEEP OPTIMIZATION: Interactive Loop Feature (Restored & Improved) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 py-1 rounded-full text-celadon text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Sparkles size={12} />
                  <span>The Core Engine</span>
                </div>
                <h3 className="text-4xl font-mono font-bold tracking-tight">{t("interactiveLoopTitle")}</h3>
                <p className="text-muted-foreground font-mono leading-relaxed text-lg">
                  {t("interactiveLoopSubtitle")}
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    t("loopItem1"),
                    t("loopItem2"),
                    t("loopItem3"),
                    t("loopItem4")
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-mono text-sm text-foreground group">
                      <div className="w-6 h-6 rounded-lg bg-celadon/10 border border-celadon/30 flex items-center justify-center flex-shrink-0 group-hover:bg-celadon group-hover:text-primary-foreground transition-all">
                        <CheckCircle2 size={14} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual Mock: The Process Showcase (Screenshots) */}
              <div className="relative">
                <div className="aspect-[4/3] bg-surface-2 rounded-3xl border border-border shadow-2xl p-4 overflow-hidden group">
                  <div className="w-full h-full bg-background rounded-2xl border border-border relative overflow-hidden">
                    {/* Mock UI: Tabs */}
                    <div className="absolute top-0 left-0 right-0 h-10 border-b border-border bg-muted/30 flex items-center px-4 gap-2">
                      <div className="w-20 h-4 rounded bg-celadon/20" />
                      <div className="w-20 h-4 rounded bg-border/40" />
                      <div className="w-20 h-4 rounded bg-border/40" />
                    </div>

                    {/* Mock UI: Content progression overlay */}
                    <div className="mt-10 p-6 flex flex-col gap-6 font-mono">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-celadon flex-shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted/60 rounded w-3/4" />
                          <div className="h-4 bg-muted/60 rounded w-1/2" />
                        </div>
                      </div>

                      <div className="ml-12 p-4 rounded-xl border border-celadon/30 bg-celadon/5 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={12} className="text-celadon" />
                          <span className="text-[10px] font-bold text-celadon">GENERATED PRD</span>
                        </div>
                        <div className="h-2 bg-celadon/20 rounded w-full" />
                        <div className="h-2 bg-celadon/20 rounded w-[90%]" />
                      </div>

                      <div className="ml-12 p-4 rounded-xl border border-border bg-surface-2 animate-pulse space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Code2 size={12} className="text-muted-foreground" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">EXECUTING ZENE...</span>
                        </div>
                        <div className="h-2 bg-muted/40 rounded w-full" />
                        <div className="h-2 bg-muted/40 rounded w-[70%]" />
                      </div>
                    </div>
                  </div>

                  {/* Highlighting circular loop icon overlay */}
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-celadon/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-12 right-12 w-16 h-16 rounded-3xl bg-celadon flex items-center justify-center shadow-glow animate-bounce">
                    <RefreshCw size={32} className="text-primary-foreground" />
                  </div>
                </div>
              </div>
            </section>

            {/* Feature Cards Section (Restored & Localized) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: MessageSquare, title: t("processClarify"), desc: t("clarifySubtitle") },
                { icon: Code2, title: t("processDev"), desc: t("loopItem3") },
                { icon: Rocket, title: t("processDeploy"), desc: t("loopItem4") },
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-2xl bg-surface-2 border border-border hover:border-celadon/30 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-celadon">
                    <item.icon size={24} />
                  </div>
                  <h4 className="font-mono font-bold text-lg mb-3">{item.title}</h4>
                  <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Persistence & Technical Detail Section */}
            <div className="bg-surface-2 rounded-3xl border border-border p-8 md:p-16 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-celadon/5 to-transparent pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-celadon/10 border border-celadon/20">
                    <RefreshCw size={12} className="text-celadon animate-spin-slow" />
                    <span className="text-[10px] font-mono font-bold text-celadon uppercase tracking-wider">{t("processIterate")}</span>
                  </div>

                  <h3 className="text-3xl font-mono font-bold">{t("persistenceTitle")}</h3>
                  <p className="text-muted-foreground font-mono leading-relaxed text-lg">
                    {t("persistenceDesc")}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-background border border-border">
                      <div className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-1">Persistence</div>
                      <div className="text-sm font-mono font-bold">100% Artifacts Saved</div>
                    </div>
                    <div className="p-4 rounded-xl bg-background border border-border">
                      <div className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-1">Versioning</div>
                      <div className="text-sm font-mono font-bold">Git Integrated</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      document.querySelector('textarea')?.focus();
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-celadon text-primary-foreground font-mono font-bold hover:bg-celadon-glow transition-all shadow-glow group"
                  >
                    {t("getStartedButton")}
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="aspect-square lg:aspect-video bg-background rounded-2xl border border-border shadow-2xl overflow-hidden relative group font-mono text-xs">
                  <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><FileText size={10} /> prd.md</span>
                      <span className="flex items-center gap-1"><Code2 size={10} /> main.rs</span>
                      <span className="flex items-center gap-1"><Rocket size={10} /> {t("deploy")}</span>
                    </div>
                  </div>

                  <div className="p-8 space-y-4">
                    <div className="space-y-1">
                      <p className="text-muted-foreground/40"># Initial Deployment Successful</p>
                      <p className="text-celadon">$ celadon iterate --refine "Add Stripe integration"</p>
                    </div>

                    <div className="pl-4 border-l border-border space-y-2">
                      <p className="text-foreground/80">Analysing current codebase...</p>
                      <p className="text-foreground/80">Recovering requirements from PRD v1.0...</p>
                      <p className="text-blue-400">Context loaded: Redis, PostgreSQL, React.</p>
                      <div className="flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-celadon" />
                        <p className="text-celadon">Updating schema and implementing sub-modules...</p>
                      </div>
                    </div>

                    <div className="mt-8 p-4 rounded-lg bg-surface-2 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Env: production</span>
                        <span className="text-celadon">active</span>
                      </div>
                      <div className="h-1.5 bg-background rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-celadon animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-surface-1">
        <div className="container max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100">
            <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center">
              <Zap size={12} className="text-background" />
            </div>
            <span className="font-mono font-bold text-xs tracking-tight uppercase">
              Celadon Studio
            </span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest text-center md:text-right">
            © 2026 Celadon · Interactive Development for Modern Teams
          </p>
        </div>
      </footer>
    </div>
  );
}

function ExampleCard({ title, desc, status, commits, time }: {
  title: string; desc: string; status: string; commits: number; time: string;
}) {
  const { t } = useLocale();
  return (
    <div className="p-6 rounded-2xl bg-surface-2 border border-border hover:border-celadon/50 transition-all group flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-bold text-foreground group-hover:text-celadon transition-colors">{title}</h3>
        <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border",
          status === "COMPLETED" ? "bg-celadon/10 border-celadon/20 text-celadon" :
            status === "DEVELOPING" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
              "bg-blue-500/10 border-blue-500/20 text-blue-500"
        )}>
          {status}
        </span>
      </div>
      <p className="text-xs text-muted-foreground font-mono leading-relaxed mb-8 flex-1">
        {desc}
      </p>
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span>{time}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>{commits} commits</span>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-[10px] uppercase font-mono font-bold flex items-center gap-1 text-muted-foreground hover:text-celadon hover:border-celadon/30 transition-all">
          {t("viewDetails")}
          <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}
