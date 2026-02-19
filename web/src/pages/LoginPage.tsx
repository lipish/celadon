import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiStart } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);

      const pendingIdea = sessionStorage.getItem("pending_idea");
      if (pendingIdea) {
        sessionStorage.removeItem("pending_idea");
        const res = await apiStart(pendingIdea);
        navigate("/clarify", {
          state: {
            idea: pendingIdea,
            sessionId: res.session_id,
            projectName: res.project_name,
            initialConversation: res.conversation,
          },
          replace: true
        });
      } else {
        navigate("/", { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-border">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-lg bg-celadon flex items-center justify-center">
              <Zap size={20} className="text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl font-mono">登录</CardTitle>
          <CardDescription>使用邮箱与密码登录 Celadon</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">邮箱</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="font-mono"
              />
            </div>
            <Button type="submit" className="w-full bg-celadon hover:bg-celadon-glow" disabled={loading}>
              {loading ? "登录中…" : "登录"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              还没有账号？{" "}
              <Link to="/register" className="text-celadon hover:underline font-mono">
                注册
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
