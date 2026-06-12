import { auth } from "./firebase";

// Wrapper REST simples para /api.
async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = await auth.currentUser?.getIdToken();
  const hasBody = body !== undefined;

  if (hasBody) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api" + url, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const errorData = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const erro =
      (typeof errorData.erro === "string" && errorData.erro) ||
      (typeof errorData.error === "string" && errorData.error) ||
      `Erro ${res.status}`;
    throw Object.assign(new Error(erro), { data, status: res.status });
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => req<T>("GET", url),
  post: <T>(url: string, body?: unknown) => req<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => req<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) => req<T>("PATCH", url, body),
  del: <T>(url: string, body?: unknown) => req<T>("DELETE", url, body),
};
