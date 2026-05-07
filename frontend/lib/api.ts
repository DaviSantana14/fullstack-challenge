const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function getPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("playerId");
}

async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const playerId = getPlayerId();
  const headers = new Headers(options.headers);

  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  if (playerId) {
    headers.set("x-player-id", playerId);
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
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
