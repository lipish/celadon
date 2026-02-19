import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";

/**
 * 路由守卫：未认证时重定向到 /login，加载中显示 spinner
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const { token, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-celadon flex items-center justify-center animate-pulse">
                        <Zap size={20} className="text-primary-foreground" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">loading…</span>
                </div>
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
