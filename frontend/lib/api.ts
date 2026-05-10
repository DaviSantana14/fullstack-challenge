import { clearSession, getValidAccessToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = await getValidAccessToken();
  const headers = new Headers(options.headers);

  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const url = `${API_BASE_URL}${path}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetchWithAuth(path, { method: "GET" });

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }

    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetchWithAuth(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }

    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
