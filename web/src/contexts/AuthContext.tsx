import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
} from "react";
import {
    apiLogin,
    apiRegister,
    apiLogout,
    apiMe,
    getStoredToken,
    setStoredToken,
    clearStoredToken,
} from "@/lib/api";

interface AuthState {
    token: string | null;
    email: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(getStoredToken);
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(!!getStoredToken());

    // 启动时：如果有 token 则获取用户信息
    useEffect(() => {
        const stored = getStoredToken();
        if (!stored) {
            setLoading(false);
            return;
        }
        apiMe()
            .then((res) => {
                setEmail(res.email);
                setToken(stored);
            })
            .catch(() => {
                // Silent for guests: do not clear if we are in marketing mode
                // clearStoredToken(); 
                setToken(null);
                setEmail(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await apiLogin(email, password);
        setStoredToken(res.token);
        setToken(res.token);
        // 获取用户信息
        try {
            const me = await apiMe();
            setEmail(me.email);
        } catch {
            setEmail(email); // fallback
        }
    }, []);

    const register = useCallback(async (email: string, password: string) => {
        const res = await apiRegister(email, password);
        setStoredToken(res.token);
        setToken(res.token);
        setEmail(email);
    }, []);

    const logout = useCallback(async () => {
        await apiLogout();
        setToken(null);
        setEmail(null);
    }, []);

    const value = useMemo(
        () => ({ token, email, loading, login, register, logout }),
        [token, email, loading, login, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
