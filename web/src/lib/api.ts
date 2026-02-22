import { getStoredLocale, getT } from "./i18n";

const getApiT = () => getT(getStoredLocale());

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const TOKEN_KEY = "celadon_token";

type ApiData = Record<string, unknown>;

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function postJson(path: string, payload: ApiData): Promise<ApiData> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const t = getApiT();
    let errorMsg = `${t("requestError")}: ${response.status}`;
    try {
      const data = await response.json();
      errorMsg = String(data.error ?? errorMsg);
    } catch {
      // 非 JSON 错误 body
      if (response.status === 404) errorMsg = t("apiError404Db");
    }
    throw new Error(errorMsg);
  }

  try {
    return (await response.json()) as ApiData;
  } catch {
    throw new Error(getApiT()("apiErrorInvalidJson"));
  }
}

async function getJson(path: string): Promise<ApiData> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    const t = getApiT();
    let errorMsg = `${t("requestError")}: ${response.status}`;
    try {
      const data = await response.json();
      errorMsg = String(data.error ?? errorMsg);
    } catch {
      if (response.status === 404) errorMsg = t("apiError404");
    }
    throw new Error(errorMsg);
  }

  try {
    return (await response.json()) as ApiData;
  } catch {
    throw new Error(getApiT()("apiErrorInvalidJson"));
  }
}

export interface StartResult {
  session_id: string;
  project_id: string;
  project_name: string;
  assistant_reply: string;
  conversation?: Array<{ role: string; content: string }>;
}

export async function apiStart(idea: string, name?: string): Promise<StartResult> {
  const data = await postJson("/api/start", { idea, name: name ?? null });
  return data as unknown as StartResult;
}

export interface IdeaResult {
  session_id: string;
  assistant_reply: string;
  user_text?: string;
}

export async function apiAppendIdea(sessionId: string, text: string): Promise<IdeaResult> {
  const data = await postJson("/api/idea", { session_id: sessionId, text });
  return data as unknown as IdeaResult;
}

export interface PrdResult {
  session_id: string;
  version: number;
  path: string;
}

export async function apiGeneratePrd(sessionId: string): Promise<PrdResult & { content?: string }> {
  const data = await postJson("/api/prd/generate", { session_id: sessionId });
  return data as unknown as PrdResult & { content?: string };
}

export interface StatusResult {
  project: { id: string; name: string; status: string };
  session: { session_id: string; stage: string; context_snapshot: string };
  conversation?: Array<{ role: string; content: string }>;
  latest_prd?: { version: number };
}

export async function apiStatus(sessionId: string): Promise<StatusResult> {
  const data = await getJson(`/api/status/${sessionId}`);
  return data as unknown as StatusResult;
}

export interface DevRunResult {
  message: string;
  dry_run: boolean;
  zene_response?: unknown;
}

export async function apiDevRun(
  sessionId: string,
  instruction?: string,
  dryRun = false
): Promise<DevRunResult> {
  const data = await postJson("/api/dev/run", {
    session_id: sessionId,
    instruction: instruction ?? null,
    dry_run: dryRun,
  });
  return data as unknown as DevRunResult;
}

export interface DeployResult {
  session_id: string;
  env: string;
  version: string;
  result: string;
}

export async function apiDeploy(sessionId: string, env = "staging"): Promise<DeployResult> {
  const data = await postJson("/api/deploy", { session_id: sessionId, env });
  return data as unknown as DeployResult;
}

export async function apiHealth(): Promise<{ status: string }> {
  const data = await getJson("/api/health");
  return data as unknown as { status: string };
}

export interface ProjectItem {
  project_id: string;
  name: string;
  status: string;
  updated_at: string;
  session_id: string;
  stage: string;
}

export interface ProjectsResult {
  projects: ProjectItem[];
}

export async function apiProjects(): Promise<ProjectsResult> {
  const data = await getJson("/api/projects");
  return data as unknown as ProjectsResult;
}

export interface AuthResult {
  user_id: string;
  token: string;
}

export async function apiRegister(email: string, password: string): Promise<AuthResult> {
  const data = await postJson("/api/register", { email, password });
  return data as unknown as AuthResult;
}

export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  const data = await postJson("/api/login", { email, password });
  return data as unknown as AuthResult;
}

export async function apiMe(): Promise<{ email: string; is_admin: boolean }> {
  const data = await getJson("/api/me");
  return data as unknown as { email: string; is_admin: boolean };
}

export async function apiJoinWaitingList(email: string, idea: string) {
  const data = await postJson("/api/waiting-list", { email, idea });
  return data;
}

export async function apiLogout(): Promise<void> {
  try {
    await postJson("/api/logout", {});
  } catch {
    // 即使服务端失败也清除本地 token
  }
  clearStoredToken();
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
}

export async function apiGetAdminSettings(): Promise<SystemSetting[]> {
  const data = await getJson("/api/admin/settings");
  return data as unknown as SystemSetting[];
}

export async function apiUpdateAdminSetting(key: string, value: string): Promise<{ ok: boolean }> {
  const data = await postJson("/api/admin/settings", { key, value });
  return data as unknown as { ok: boolean };
}

export async function apiGetProviders(): Promise<string[]> {
  const data = await getJson("/api/admin/providers");
  return data as unknown as string[];
}

export function apiDevStream(sessionId: string): EventSource {
  const token = getStoredToken();
  const url = `${API_BASE}/api/dev/stream/${sessionId}${token ? `?token=${token}` : ''}`;
  return new EventSource(url);
}

export async function apiDevFiles(): Promise<any[]> {
  const data = await getJson("/api/dev/files");
  return data as unknown as any[];
}

