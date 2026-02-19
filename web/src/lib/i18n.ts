/**
 * 中英双语，key 与中文一致便于对照
 */
export type Locale = "zh" | "en";

const messages: Record<Locale, Record<string, string>> = {
  zh: {
    appName: "Celadon",
    tagline: "持续交互式开发流程 · Continuous Interactive Dev",
    headline1: "把",
    headline2: "想法",
    headline3: "变成",
    headline4: "可部署的软件",
    subtitle: "提交一个想法，Celadon 自动完成需求澄清、PRD 生成、AI 驱动开发与部署。",
    poweredBy: "Powered by Zene · Planner / Executor / Reflector loop",
    hintInput: "支持中英文描述 · 无需精确规格 · AI 会帮你澄清",
    start: "启动",
    docs: "文档",
    api: "API",
    getStarted: "开始使用",
    recentProjects: "最近项目",
    viewAll: "查看全部",
    continueWork: "继续",
    newIdea: "新想法",
    flowOverview: "流程概览",
    projects: "项目",
    viewRepo: "查看仓库",
    selectProject: "选择项目",
    clarify: "澄清",
    prd: "需求文档",
    dev: "开发",
    deploy: "部署",
    iterate: "迭代",
    stageClarify: "Clarify",
    stagePrd: "PRD",
    stageDev: "Development · Zene",
    stageDeploy: "Deploy",
    stageIterate: "Iterate",
    back: "返回",
    generatePrd: "生成 PRD",
    enterDev: "进入开发",
    startDev: "启动开发",
    starting: "正在启动...",
    noRecentProjects: "暂无历史项目，输入上方想法开始",
    justNow: "刚刚",
    minutesAgo: "分钟前",
    hoursAgo: "小时前",
    clarifyTitle: "需求澄清",
    clarifySubtitle: "与 AI 多轮对话澄清需求",
    prdTitle: "PRD",
    currentProject: "当前项目",
    sections: "章节",
    copyMd: "复制 MD",
    copied: "已复制",
    thinking: "正在思考...",
  },
  en: {
    appName: "Celadon",
    tagline: "Continuous Interactive Dev",
    headline1: "Turn",
    headline2: "ideas",
    headline3: "into",
    headline4: "deployable software",
    subtitle: "Submit an idea; Celadon handles clarification, PRD, AI-driven development and deployment.",
    poweredBy: "Powered by Zene · Planner / Executor / Reflector loop",
    hintInput: "Describe in any language · No precise spec needed · AI will clarify",
    start: "Start",
    docs: "Docs",
    api: "API",
    getStarted: "Get started",
    recentProjects: "Recent projects",
    viewAll: "View all",
    continueWork: "Continue",
    newIdea: "New idea",
    flowOverview: "Flow overview",
    projects: "Projects",
    viewRepo: "View repo",
    selectProject: "Select project",
    clarify: "Clarify",
    prd: "PRD",
    dev: "Dev",
    deploy: "Deploy",
    iterate: "Iterate",
    stageClarify: "Clarify",
    stagePrd: "PRD",
    stageDev: "Development · Zene",
    stageDeploy: "Deploy",
    stageIterate: "Iterate",
    back: "Back",
    generatePrd: "Generate PRD",
    enterDev: "Enter dev",
    startDev: "Start dev",
    starting: "Starting...",
    noRecentProjects: "No projects yet. Enter an idea above to start.",
    justNow: "just now",
    minutesAgo: "m ago",
    hoursAgo: "h ago",
    clarifyTitle: "Clarify",
    clarifySubtitle: "Multi-turn dialogue with AI",
    prdTitle: "PRD",
    currentProject: "Current project",
    sections: "Sections",
    copyMd: "Copy MD",
    copied: "Copied",
    thinking: "Thinking...",
  },
};

const STORAGE_KEY = "celadon-locale";

export function getStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "zh" || v === "en") return v;
  } catch {}
  return "zh";
}

export function setStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}

export function getT(locale: Locale): (key: string) => string {
  const m = messages[locale] ?? messages.zh;
  return (key: string) => m[key] ?? messages.zh[key] ?? key;
}

export { messages };
