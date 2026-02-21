import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetAdminSettings, apiUpdateAdminSetting, apiGetProviders, type SystemSetting } from "@/lib/api";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import {
    Settings,
    Save,
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

const PROVIDER_MODELS: Record<string, string[]> = {
    deepseek: ["deepseek-chat", "deepseek-reasoner"],
    openai: ["o1", "o3-mini", "gpt-4o", "gpt-4o-mini"],
    anthropic: ["claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    minimax: ["abab6.5s-chat", "abab6.5t-chat", "abab6.5-chat"],
    zhipu: ["glm-4-plus", "glm-4-0520", "glm-4-flash"],
    aliyun: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"],
    tencent: ["hunyuan-large", "hunyuan-pro", "hunyuan-standard", "hunyuan-lite"],
    ollama: ["deepseek-r1", "llama3.3", "qwen2.5", "mistral"],
    volcengine: ["doubao-1.5-pro-32k", "doubao-1.5-lite-32k"],
    google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro"]
};

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
            setSettings(settingsData);
            setProviders(providersData);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load settings or providers");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key: string, value: string) => {
        setSaving(key);
        setError("");
        setSuccess(null);
        try {
            await apiUpdateAdminSetting(key, value);
            setSuccess(t("updateSuccess"));
            setTimeout(() => setSuccess(null), 3000);
            setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
        } catch (e) {
            setError(e instanceof Error ? e.message : t("updateError"));
        } finally {
            setSaving(null);
        }
    };

    const handleSaveRole = async (role: string) => {
        const keys = [
            `ZENE_${role}_PROVIDER`,
            `ZENE_${role}_MODEL`,
            `ZENE_${role}_API_KEY`,
        ];
        setSaving(`ROLE_${role}`);
        setError("");
        setSuccess(null);
        try {
            for (const key of keys) {
                const value = settings.find(s => s.key === key)?.value || "";
                await apiUpdateAdminSetting(key, value);
            }
            setSuccess(t("updateSuccess"));
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : t("updateError"));
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
            let next = prev.map(s => s.key === key ? { ...s, value } : s);

            // Auto update model if provider changed
            if (key.endsWith("_PROVIDER")) {
                const role = key.replace("ZENE_", "").replace("_PROVIDER", "");
                const modelKey = `ZENE_${role}_MODEL`;
                const defaultModel = PROVIDER_MODELS[value]?.[0];
                if (defaultModel) {
                    next = next.map(s => s.key === modelKey ? { ...s, value: defaultModel } : s);
                }
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

    const providerOptions = providers.length > 0 ? providers : Object.keys(PROVIDER_MODELS);

    const RoleSection = ({ role, title, icon: Icon }: { role: string; title: string; icon: any }) => {
        const pKey = `ZENE_${role}_PROVIDER`;
        const kKey = `ZENE_${role}_API_KEY`;
        const mKey = `ZENE_${role}_MODEL`;
        const currentProvider = getVal(pKey);
        const suggestedModels = PROVIDER_MODELS[currentProvider] || [];
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
                                value={currentProvider}
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
                        <div className="relative">
                            <input
                                type="password"
                                value={getVal(kKey)}
                                onChange={(e) => handleChange(kKey, e.target.value)}
                                disabled={isSavingRole}
                                placeholder="sk-..."
                                className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-celadon/50 focus:ring-1 focus:ring-celadon/50 outline-none font-mono text-sm transition-all pr-16"
                            />
                            {getVal(kKey) && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-celadon/60 px-2 py-0.5 rounded bg-celadon/5 border border-celadon/20">
                                    MASKED
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed font-mono">
                            {getDesc(kKey) || t("ensureApiKeyBalance")}
                        </p>
                    </div>
                </div>

                {/* Single save button for the whole role */}
                <div className="flex justify-end pt-2 border-t border-border/40">
                    <button
                        onClick={() => handleSaveRole(role)}
                        disabled={isSavingRole}
                        className="h-10 px-6 rounded-xl bg-celadon text-primary-foreground font-mono text-sm font-bold hover:bg-vibrant-celadon transition-all shadow-glow flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSavingRole ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSavingRole ? t("saving") : t("update")}
                    </button>
                </div>
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

                    <div className="w-20" />
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
                        <RoleSection role="PLANNER" title={t("plannerTitle")} icon={Cpu} />
                        <RoleSection role="EXECUTOR" title={t("executorTitle")} icon={Terminal} />
                        <RoleSection role="REFLECTOR" title={t("reflectorTitle")} icon={Eye} />
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
