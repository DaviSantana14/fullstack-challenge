const SESSION_KEY = "crashGameAuthSession";
const PKCE_KEY = "crashGamePkce";
const TOKEN_REFRESH_SKEW_MS = 60_000;

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

type JwtPayload = {
  sub?: string;
  preferred_username?: string;
  email?: string;
  exp?: number;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  playerId: string;
  username: string;
};

type PkceState = {
  codeVerifier: string;
  state: string;
};

function getKeycloakBaseUrl(): string {
  return process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:8080";
}

function getKeycloakRealm(): string {
  return process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "crash-game";
}

function getKeycloakClientId(): string {
  return process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "crash-game-client";
}

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

function getRealmUrl(): string {
  return `${getKeycloakBaseUrl()}/realms/${getKeycloakRealm()}`;
}

function getRedirectUri(): string {
  return `${getAppUrl()}/auth/callback`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64UrlJson<T>(input: string): T {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const json = atob(padded);

  return JSON.parse(json) as T;
}

function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Invalid access token.");
  }

  return decodeBase64UrlJson<JwtPayload>(payload);
}

function createRandomString(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return base64UrlEncode(bytes);
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return base64UrlEncode(new Uint8Array(digest));
}

function saveSessionFromTokenResponse(tokenResponse: TokenResponse): AuthSession {
  const payload = decodeJwtPayload(tokenResponse.access_token);

  if (!payload.sub) {
    throw new Error("Token subject is missing.");
  }

  const session: AuthSession = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token ?? null,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    playerId: payload.sub,
    username: payload.preferred_username ?? payload.email ?? payload.sub,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return session;
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const rawSession = localStorage.getItem(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PKCE_KEY);
}

export function getPlayerId(): string | null {
  return getSession()?.playerId ?? null;
}

export function getUsername(): string | null {
  return getSession()?.username ?? null;
}

export function isAuthenticated(): boolean {
  const session = getSession();

  return Boolean(session && session.expiresAt > Date.now());
}

export async function loginWithKeycloak(): Promise<void> {
  const codeVerifier = createRandomString(64);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const state = createRandomString(32);
  const pkceState: PkceState = { codeVerifier, state };

  localStorage.setItem(PKCE_KEY, JSON.stringify(pkceState));

  const params = new URLSearchParams({
    client_id: getKeycloakClientId(),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "openid profile email",
    state,
  });

  window.location.href = `${getRealmUrl()}/protocol/openid-connect/auth?${params.toString()}`;
}

export async function handleAuthCallback(code: string, state: string): Promise<AuthSession> {
  const rawPkceState = localStorage.getItem(PKCE_KEY);

  if (!rawPkceState) {
    throw new Error("Login state was not found.");
  }

  const pkceState = JSON.parse(rawPkceState) as PkceState;

  if (pkceState.state !== state) {
    throw new Error("Login state is invalid.");
  }

  const response = await fetch(`${getRealmUrl()}/protocol/openid-connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getKeycloakClientId(),
      code,
      code_verifier: pkceState.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange authorization code.");
  }

  const tokenResponse = (await response.json()) as TokenResponse;
  localStorage.removeItem(PKCE_KEY);

  return saveSessionFromTokenResponse(tokenResponse);
}

export async function getValidAccessToken(): Promise<string | null> {
  const session = getSession();

  if (!session) {
    return null;
  }

  if (session.expiresAt - TOKEN_REFRESH_SKEW_MS > Date.now()) {
    return session.accessToken;
  }

  if (!session.refreshToken) {
    clearSession();
    return null;
  }

  const response = await fetch(`${getRealmUrl()}/protocol/openid-connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getKeycloakClientId(),
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const tokenResponse = (await response.json()) as TokenResponse;
  return saveSessionFromTokenResponse(tokenResponse).accessToken;
}

export function logout(): void {
  const session = getSession();
  clearSession();

  if (!session) {
    window.location.href = "/";
    return;
  }

  const params = new URLSearchParams({
    client_id: getKeycloakClientId(),
    post_logout_redirect_uri: getAppUrl(),
  });

  window.location.href = `${getRealmUrl()}/protocol/openid-connect/logout?${params.toString()}`;
}
