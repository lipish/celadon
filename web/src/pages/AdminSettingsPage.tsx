import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetAdminSettings, apiUpdateAdminSetting, type SystemSetting } from "@/lib/api";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import {
    Settings,
    Save,
    ChevronLeft,
    Key,
    Cpu,
    Info,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";

export default function AdminSettingsPage() {
    const { t } = useLocale();
    const navigate = useNavigate();
    const { isAdmin, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate("/", { replace: true });
            return;
        }
        loadSettings();
    }, [isAdmin, authLoading, navigate]);

    const loadSettings = async () => {
        try {
            const data = await apiGetAdminSettings();
            setSettings(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load settings");
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

    const handleChange = (key: string, value: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-celadon" />
            </div>
        );
    }

    const apiKeySettings = settings.filter(s => s.key.includes("KEY"));
    const modelSettings = settings.filter(s => s.key.includes("MODEL"));

    const modelSuggestions = [
        "deepseek/deepseek-chat",
        "deepseek/deepseek-coder",
        "openai/gpt-4o",
        "openai/gpt-4o-mini",
        "anthropic/claude-3-5-sonnet-20240620",
    ];

    const SettingCard = ({ setting }: { setting: SystemSetting }) => (
        <div className="group p-6 rounded-2xl bg-surface-2 border border-border/50 hover:border-celadon/40 transition-all shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                        {setting.key.includes("KEY") ? (
                            <Key size={14} className="text-celadon" />
                        ) : (
                            <Cpu size={14} className="text-celadon" />
                        )}
                        <h3 className="font-mono font-bold text-sm text-foreground uppercase tracking-wider">
                            {setting.key.replace(/_/g, " ")}
                        </h3>
                    </div>

                    {setting.description && (
                        <p className="text-xs text-muted-foreground/70 font-mono flex items-center gap-1.5">
                            <Info size={12} />
                            {setting.description}
                        </p>
                    )}

                    <div className="relative space-y-2">
                        <input
                            type={setting.key.includes("KEY") ? "password" : "text"}
                            value={setting.value}
                            onChange={(e) => handleChange(setting.key, e.target.value)}
                            placeholder={`Enter ${setting.key}...`}
                            className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-celadon/50 focus:ring-1 focus:ring-celadon/50 outline-none font-mono text-sm transition-all"
                        />
                        {setting.key.includes("MODEL") && (
                            <div className="flex flex-wrap gap-2">
                                {modelSuggestions.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => handleChange(setting.key, m)}
                                        className="text-[10px] px-2 py-1 rounded bg-surface-1 border border-border hover:border-celadon/50 transition-colors font-mono"
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}
                        {setting.key.includes("KEY") && setting.value && (
                            <div className="absolute right-3 top-6 -translate-y-1/2 text-[10px] font-mono text-celadon/60 px-2 py-0.5 rounded bg-celadon/5 border border-celadon/20">
                                {t("encrypted")}
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:pt-9">
                    <button
                        onClick={() => handleUpdate(setting.key, setting.value)}
                        disabled={saving === setting.key}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 h-12 rounded-xl bg-celadon text-primary-foreground font-mono text-sm font-bold hover:bg-celadon-glow transition-all shadow-glow disabled:opacity-50"
                    >
                        {saving === setting.key ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {t("update")}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-celadon/30">
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
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

            <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
                <div className="space-y-16">
                    {/* Hero Header */}
                    <div className="space-y-4">
                        <h1 className="text-4xl font-mono font-bold tracking-tight text-foreground flex items-center gap-4">
                            <span className="p-2 rounded-xl bg-celadon/10 border border-celadon/20 text-celadon">
                                <Settings size={28} />
                            </span>
                            {t("systemSettings")}
                        </h1>
                        <p className="text-muted-foreground font-mono text-sm max-w-2xl leading-relaxed">
                            {t("systemSettingsDesc")}
                        </p>
                    </div>

                    {/* API Keys Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground/50">API Authentication</h2>
                            <div className="h-px flex-1 bg-border/40" />
                        </div>
                        <div className="grid gap-6">
                            {apiKeySettings.map(s => <SettingCard key={s.key} setting={s} />)}
                        </div>
                    </div>

                    {/* Model Config Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground/50">AI Engine Roles</h2>
                            <div className="h-px flex-1 bg-border/40" />
                        </div>
                        <div className="grid gap-6">
                            {modelSettings.map(s => <SettingCard key={s.key} setting={s} />)}
                        </div>
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
