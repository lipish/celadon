import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetAdminSettings, apiUpdateAdminSetting, type SystemSetting } from "@/lib/api";
import { useLocale } from "@/contexts/LocaleContext";
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
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

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
            setSuccess(`${key} updated successfully`);
            setTimeout(() => setSuccess(null), 3000);
            // Update local state
            setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update setting");
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
                        <span className="text-xs font-mono font-bold tracking-tight uppercase">Admin Console</span>
                    </div>

                    <div className="w-20" /> {/* Spacer for balance */}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
                <div className="space-y-12">
                    {/* Hero Header */}
                    <div className="space-y-4">
                        <h1 className="text-4xl font-mono font-bold tracking-tight text-foreground flex items-center gap-4">
                            <span className="p-2 rounded-xl bg-celadon/10 border border-celadon/20 text-celadon">
                                <Settings size={28} />
                            </span>
                            System Settings
                        </h1>
                        <p className="text-muted-foreground font-mono text-sm max-w-2xl leading-relaxed">
                            Configure global parameters for Celadon Studio. Changes made here will affect
                            all users and take effect immediately.
                        </p>
                    </div>

                    {/* Settings Grid */}
                    <div className="grid gap-6">
                        {settings.map((setting) => (
                            <div
                                key={setting.key}
                                className="group p-6 rounded-2xl bg-surface-2 border border-border/50 hover:border-celadon/40 transition-all shadow-sm"
                            >
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

                                        <div className="relative group/input">
                                            <input
                                                type={setting.key.includes("KEY") ? "password" : "text"}
                                                value={setting.value}
                                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                                placeholder={`Enter ${setting.key}...`}
                                                className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-celadon/50 focus:ring-1 focus:ring-celadon/50 outline-none font-mono text-sm transition-all"
                                            />
                                            {setting.key.includes("KEY") && setting.value && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-celadon/60 px-2 py-0.5 rounded bg-celadon/5 border border-celadon/20">
                                                    Encrypted
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
                                            Update
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
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
