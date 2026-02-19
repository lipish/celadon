/**
 * Celadon 后端 API 客户端
 * 默认请求 http://localhost:3000，可通过 VITE_API_BASE_URL 覆盖
 * 若存在 token 则在请求头中携带 Authorization: Bearer <token>
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
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
  const data = (await response.json()) as ApiData;
  if (!response.ok) {
    throw new Error(String(data.error ?? `请求失败: ${response.status}`));
  }
  return data;
}

async function getJson(path: string): Promise<ApiData> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
  });
  const data = (await response.json()) as ApiData;
  if (!response.ok) {
    throw new Error(String(data.error ?? `请求失败: ${response.status}`));
  }
  return data;
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
