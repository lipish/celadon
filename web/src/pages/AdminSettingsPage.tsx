import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetAdminSettings, apiUpdateAdminSetting, apiGetProviders, type SystemSetting } from "@/lib/api";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Settings,
    ChevronLeft,
    Cpu,
    CheckCircle2,
    AlertCircle,
    Loader2,
    BrainCircuit,
    Terminal,
    Eye
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PROVIDERS } from "@/lib/providers";

// 从 PROVIDERS 生成建议模型列表（仅使用模型 id）
const PROVIDER_MODELS: Record<string, string[]> = Object.fromEntries(
    Object.entries(PROVIDERS).map(([k, v]) => [k, v.models.map(m => m.id)])
);

export default function AdminSettingsPage() {
    const { t } = useLocale();
    const navigate = useNavigate();
    const { isAdmin, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [providers, setProviders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<string | null>(null);
    const [apiKeyDialogRole, setApiKeyDialogRole] = useState<string | null>(null);
    const [apiKeyDraft, setApiKeyDraft] = useState<string>("");
    const apiKeyInputRef = useRef<HTMLInputElement | null>(null);
    const saveTimersRef = useRef<Record<string, number>>({});

    const upsertSetting = (prev: SystemSetting[], key: string, value: string): SystemSetting[] => {
        const idx = prev.findIndex(s => s.key === key);
        if (idx >= 0) {
            const cur = prev[idx];
            const next = prev.slice();
            next[idx] = { ...cur, value };
            return next;
        }
        return prev.concat([{ key, value, description: null }]);
    };

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate("/", { replace: true });
            return;
        }
        loadData();
    }, [isAdmin, authLoading, navigate]);

    const loadData = async () => {
        try {
            const [settingsData, providersData] = await Promise.all([
                apiGetAdminSettings(),
                apiGetProviders()
            ]);
            // 后端可能返回空或不完整列表时，回退到内置 PROVIDERS 的 key
            const fallbackProviders = Object.keys(PROVIDERS);
            setProviders(providersData && providersData.length > 0 ? providersData : fallbackProviders);

            // 应用默认值（仅当为空时）
            const withDefaults = applyRoleDefaults(settingsData);
            setSettings(withDefaults);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load settings or providers");
        } finally {
            setLoading(false);
        }
    };

    function applyRoleDefaults(list: SystemSetting[]): SystemSetting[] {
        const byKey = new Map(list.map(s => [s.key, s] as const));
        const setIfEmpty = (key: string, value: string) => {
            const cur = byKey.get(key);
            if (!cur || !cur.value) {
                const next = { key, value, description: cur?.description ?? null } as SystemSetting;
                byKey.set(key, next);
            }
        };

        const ensureRole = (role: "PLANNER" | "EXECUTOR" | "REFLECTOR", defProv: string, defModel: string) => {
            const pKey = `ZENE_${role}_PROVIDER`;
            const mKey = `ZENE_${role}_MODEL`;
            const curModel = byKey.get(mKey)?.value || "";
            // 先保证有模型
            setIfEmpty(mKey, defModel);
            // provider 优先由已有模型反推；否则用默认
            const inferred = inferProviderByModel(curModel || defModel);
            setIfEmpty(pKey, inferred || defProv);
        };

        ensureRole("PLANNER", "deepseek", "deepseek-chat");
        ensureRole("EXECUTOR", "zhipu", "glm-5");
        ensureRole("REFLECTOR", "moonshot", "kimi-k2.5");

        return Array.from(byKey.values());
    }

    // 通过模型名反推 provider（用于处理历史数据只有 model 没有 provider 的情况）
    function inferProviderByModel(modelId: string): string | "" {
        if (!modelId) return "";
        for (const [prov, models] of Object.entries(PROVIDER_MODELS)) {
            if (models.includes(modelId)) return prov;
        }
        return "";
    }

    const handleUpdate = async (key: string, value: string) => {
        setSaving(key);
        setError("");
        setSuccess(null);
        try {
            await apiUpdateAdminSetting(key, value);
            setSuccess(t("updateSuccess"));
            setTimeout(() => setSuccess(null), 3000);
            setSettings(prev => upsertSetting(prev, key, value));
        } catch (e) {
            setError(e instanceof Error ? e.message : t("updateError"));
        } finally {
            setSaving(null);
        }
    };

    const scheduleSave = (key: string, value: string, delayMs = 500) => {
        const timers = saveTimersRef.current;
        const prev = timers[key];
        if (prev) window.clearTimeout(prev);
        timers[key] = window.setTimeout(() => {
            void handleUpdate(key, value);
            delete timers[key];
        }, delayMs);
    };

    const saveNow = (key: string, value: string) => {
        const timers = saveTimersRef.current;
        const prev = timers[key];
        if (prev) {
            window.clearTimeout(prev);
            delete timers[key];
        }
        void handleUpdate(key, value);
    };

    // 一键恢复默认并保存（覆盖后端设置）
    const applyAndSaveDefaults = async () => {
        try {
            setSaving("APPLY_DEFAULTS");
            // 本地状态也先行更新以即时反映
            setSettings(prev => applyRoleDefaults(prev));
            // 依次保存三组键
            await handleUpdate("ZENE_PLANNER_PROVIDER", "deepseek");
            await handleUpdate("ZENE_PLANNER_MODEL", "deepseek-chat");
            await handleUpdate("ZENE_EXECUTOR_PROVIDER", "zhipu");
            await handleUpdate("ZENE_EXECUTOR_MODEL", "glm-5");
            await handleUpdate("ZENE_REFLECTOR_PROVIDER", "moonshot");
            await handleUpdate("ZENE_REFLECTOR_MODEL", "kimi-k2.5");
        } finally {
            setSaving(null);
        }
    };

    const handleToggleSemanticMemory = async () => {
        const key = "ZENE_USE_SEMANTIC_MEMORY";
        const currentValue = getVal(key);
        const newValue = currentValue === "true" ? "false" : "true";

        setSaving(key);
        setError("");

        try {
            await apiUpdateAdminSetting(key, newValue);
            setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
            setSuccess(t("updateSuccess"));
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : t("updateError"));
        } finally {
            setSaving(null);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings(prev => {
            let next = upsertSetting(prev, key, value);

            if (key.endsWith("_PROVIDER")) {
                const role = key.replace("ZENE_", "").replace("_PROVIDER", "");
                const modelKey = `ZENE_${role}_MODEL`;
                const defaultModel = PROVIDER_MODELS[value]?.[0];
                if (defaultModel) {
                    next = upsertSetting(next, modelKey, defaultModel);
                    scheduleSave(modelKey, defaultModel, 0);
                }
                saveNow(key, value);
            } else if (key.endsWith("_API_KEY")) {
                saveNow(key, value);
            } else {
                scheduleSave(key, value, 600);
            }

            return next;
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-celadon" />
            </div>
        );
    }

    const getVal = (key: string) => settings.find(s => s.key === key)?.value || "";
    const getDesc = (key: string) => settings.find(s => s.key === key)?.description || "";

    // 统一可选 Provider：后端返回列表 ∪ 本地内置，避免默认值不在下拉项中导致显示为空
    const providerOptions = Array.from(new Set([
        ...providers,
        ...Object.keys(PROVIDERS),
    ]));

    const maskKey = (val: string): string => {
        const s = val || "";
        const n = s.length;
        if (n === 0) return "";
        if (n <= 8) {
            const h2 = s.slice(0, 2);
            const t2 = s.slice(-2);
            return n > 4 ? `${h2}…${t2}` : s;
        }
        const head = s.slice(0, 4);
        const tail = s.slice(-4);
        return `${head}…${tail}`;
    };

    const openApiKeyDialog = (role: string, current: string) => {
        setApiKeyDialogRole(role);
        setApiKeyDraft(current);
        setTimeout(() => {
            const el = apiKeyInputRef.current;
            if (el) {
                el.value = current;
                el.focus();
                el.select();
            }
        }, 0);
    };

    const applyApiKeyDraft = (role: string) => {
        const v = apiKeyInputRef.current?.value ?? apiKeyDraft;
        const key = `ZENE_${role}_API_KEY`;
        setApiKeyDialogRole(null);
        setTimeout(() => {
            handleChange(key, v);
        }, 0);
    };

    const renderRoleSection = (role: string, title: string, Icon: any) => {
        const pKey = `ZENE_${role}_PROVIDER`;
        const kKey = `ZENE_${role}_API_KEY`;
        const mKey = `ZENE_${role}_MODEL`;
        const currentProvider = getVal(pKey);
        const currentModel = getVal(mKey);
        const effectiveProvider = currentProvider || inferProviderByModel(currentModel);
        const suggestedModels = PROVIDER_MODELS[effectiveProvider] || [];
        const isSavingRole = saving === `ROLE_${role}`;

        return (
            <div className="p-8 rounded-3xl bg-surface-2 border border-border/50 hover:border-celadon/40 transition-all shadow-xl space-y-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-celadon/10 border border-celadon/20 text-celadon">
                        <Icon size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-mono font-bold tracking-tight">{title}</h3>
                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1 opacity-60">
                            {role} {t("roleModuleConfig")}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Provider & Model */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("providerLabel")}</label>
                            <Select
                                value={effectiveProvider || undefined}
                                onValueChange={(val) => handleChange(pKey, val)}
                                disabled={isSavingRole}
                            >
                                <SelectTrigger className="w-full h-12 rounded-xl bg-background border-border font-mono text-sm">
                                    <SelectValue placeholder={t("selectProvider")} />
                                </SelectTrigger>
                                <SelectContent className="bg-surface-2 border-border font-mono">
                                    {providerOptions.map(p => (
                                        <SelectItem key={p} value={p} className="focus:bg-celadon/10 focus:text-celadon capitalize">
                                            {p}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("modelLabel")}</label>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={getVal(mKey)}
                                    onChange={(e) => handleChange(mKey, e.target.value)}
                                    disabled={isSavingRole}
                                    className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-celadon/50 focus:ring-1 focus:ring-celadon/50 outline-none font-mono text-sm transition-all"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {suggestedModels.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => handleChange(mKey, m)}
                                            disabled={isSavingRole}
                                            className={`text-[10px] px-2 py-1 rounded-lg border transition-all font-mono disabled:opacity-50 ${getVal(mKey) === m
                                                ? "bg-celadon/10 border-celadon/40 text-celadon"
                                                : "bg-surface-1 border-border opacity-60 hover:opacity-100 hover:border-celadon/50"
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("apiKeyLabel")}</label>
                        <div className="flex items-center gap-3">
                            <AlertDialog
                                open={apiKeyDialogRole === role}
                                onOpenChange={(open) => {
                                    if (!open) setApiKeyDialogRole(null);
                                }}
                            >
                                <AlertDialogTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => openApiKeyDialog(role, getVal(kKey))}
                                        disabled={isSavingRole}
                                        className="w-full h-12 px-4 rounded-xl bg-background border border-border hover:border-celadon/50 focus-visible:border-celadon/50 focus-visible:ring-1 focus-visible:ring-celadon/50 outline-none font-mono text-sm transition-all disabled:opacity-50 text-left"
                                    >
                                        {getVal(kKey) ? maskKey(getVal(kKey)) : "sk-..."}
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t("apiKeyLabel")}</AlertDialogTitle>
                                    </AlertDialogHeader>
                                    <input
                                        type="text"
                                        defaultValue={apiKeyDraft}
                                        ref={apiKeyInputRef}
                                        placeholder="sk-..."
                                        name={`celadon-apikey-${role.toLowerCase()}`}
                                        autoComplete="off"
                                        autoCapitalize="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        data-lpignore="true"
                                        data-1p-ignore="true"
                                        data-bwignore="true"
                                        data-form-type="other"
                                        className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-celadon/50 focus:ring-1 focus:ring-celadon/50 outline-none font-mono text-sm transition-all"
                                    />
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => applyApiKeyDraft(role)}>{t("confirm")}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed font-mono">
                            {getDesc(kKey) || t("ensureApiKeyBalance")}
                        </p>
                    </div>
                </div>

                <div className="pt-2 border-t border-border/40" />
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-celadon/30">
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span>{t("backToIndex")}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <Settings size={14} className="text-celadon" />
                        <span className="text-xs font-mono font-bold tracking-tight uppercase">{t("adminConsole")}</span>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={applyAndSaveDefaults}
                            disabled={saving === "APPLY_DEFAULTS"}
                            className="h-8 px-3 rounded-lg border border-border text-[10px] font-mono hover:border-celadon/50 hover:text-celadon disabled:opacity-50 whitespace-nowrap"
                        >
                            {t("applyDefaults")}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 pt-32 pb-20">
                <div className="space-y-16">
                    {/* Hero Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-border/40">
                        <div className="space-y-4">
                            <h1 className="text-5xl font-mono font-bold tracking-tighter text-foreground flex items-center gap-6">
                                {t("systemSettings")}
                            </h1>
                            <p className="text-muted-foreground font-mono text-sm max-w-2xl leading-relaxed">
                                {t("systemSettingsDesc")}
                            </p>
                        </div>

                        {/* Semantic Memory Toggle */}
                        <div
                            className={`relative p-4 rounded-2xl border-2 transition-all duration-500 flex items-center justify-between gap-6 group/toggle ${getVal("ZENE_USE_SEMANTIC_MEMORY") === "true"
                                ? "bg-celadon/10 border-celadon/50 shadow-md"
                                : "bg-surface-2 border-border/50 hover:border-celadon/30 shadow-none"
                                }`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl transition-all duration-500 ${getVal("ZENE_USE_SEMANTIC_MEMORY") === "true"
                                    ? "bg-celadon text-primary-foreground shadow-glow"
                                    : "bg-muted text-muted-foreground"
                                    }`}>
                                    <BrainCircuit size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-mono font-bold tracking-tight transition-colors ${getVal("ZENE_USE_SEMANTIC_MEMORY") === "true" ? "text-celadon" : "text-foreground"
                                            }`}>
                                            {t("semanticMemoryTitle")}
                                        </span>
                                        <div className={`min-w-[56px] text-center px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest transition-all duration-500 ${getVal("ZENE_USE_SEMANTIC_MEMORY") === "true"
                                            ? "bg-celadon/20 text-celadon border border-celadon/30"
                                            : "bg-muted text-muted-foreground"
                                            }`}>
                                            {getVal("ZENE_USE_SEMANTIC_MEMORY") === "true" ? t("semanticMemoryEnabled") : t("semanticMemoryDisabled")}
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-mono text-muted-foreground/60">
                                        {t("semanticMemoryDesc")}
                                    </p>
                                </div>
                            </div>

                            {/* Fixed-width right side so spinner doesn't cause layout shift */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Switch
                                    checked={getVal("ZENE_USE_SEMANTIC_MEMORY") === "true"}
                                    onCheckedChange={handleToggleSemanticMemory}
                                    disabled={saving === "ZENE_USE_SEMANTIC_MEMORY"}
                                    className="h-6 w-11 data-[state=checked]:bg-celadon"
                                />
                                {/* Always reserve 16px so spinner never shifts Switch position */}
                                <div className="w-4 h-4 flex items-center justify-center">
                                    {saving === "ZENE_USE_SEMANTIC_MEMORY" && (
                                        <Loader2 size={16} className="animate-spin text-celadon" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Roles Grid */}
                    <div className="space-y-8">
                        {renderRoleSection("PLANNER", t("plannerTitle"), Cpu)}
                        {renderRoleSection("EXECUTOR", t("executorTitle"), Terminal)}
                        {renderRoleSection("REFLECTOR", t("reflectorTitle"), Eye)}
                    </div>

                    {/* Feedback Area */}
                    {(success || error) && (
                        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl border flex items-center gap-3 font-mono text-sm animate-in slide-in-from-bottom-4 duration-300 shadow-2xl z-[60] ${success ? "bg-celadon/10 border-celadon/20 text-celadon" : "bg-destructive/10 border-destructive/20 text-destructive"
                            }`}>
                            {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span>{success || error}</span>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
