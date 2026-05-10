import { randomUUID } from "crypto";
import { Buffer } from "buffer";
import { beforeAll, describe, expect, test } from "bun:test";

const KONG_URL = process.env.E2E_KONG_URL ?? "http://localhost:8000";
const WALLETS_URL = process.env.E2E_WALLETS_URL ?? "http://localhost:4002";
const KEYCLOAK_URL = process.env.E2E_KEYCLOAK_URL ?? "http://localhost:8080";
const KEYCLOAK_REALM = process.env.E2E_KEYCLOAK_REALM ?? "crash-game";
const KEYCLOAK_CLIENT_ID =
  process.env.E2E_KEYCLOAK_CLIENT_ID ?? "crash-game-client";
const KEYCLOAK_ADMIN_USERNAME =
  process.env.E2E_KEYCLOAK_ADMIN_USERNAME ?? "admin";
const KEYCLOAK_ADMIN_PASSWORD =
  process.env.E2E_KEYCLOAK_ADMIN_PASSWORD ?? "admin";
const INTERNAL_API_TOKEN =
  process.env.E2E_INTERNAL_API_TOKEN ?? "dev-internal-token";

interface WalletResponse {
  id: string;
  playerId: string;
  balanceInCents: string;
  createdAt: string;
  updatedAt: string;
}

interface RequestOptions {
  body?: unknown | URLSearchParams;
  headers?: Record<string, string>;
  expectedStatus?: number;
}

interface AuthContext {
  playerId: string;
  username: string;
  accessToken: string;
}

interface KeycloakTokenResponse {
  access_token: string;
}

interface JwtPayload {
  sub: string;
}

async function requestJson<T>(
  method: string,
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      ...(options.body && !(options.body instanceof URLSearchParams)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    body: options.body instanceof URLSearchParams
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  });

  const payload = await response.json().catch(() => null);
  const expectedStatus = options.expectedStatus ?? 200;

  if (response.status !== expectedStatus) {
    throw new Error(
      `${method} ${url} expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(
        payload,
      )}`,
    );
  }

  return payload as T;
}

function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Invalid JWT payload.");
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtPayload;
}

async function getKeycloakAdminToken(): Promise<string> {
  const tokenResponse = await requestJson<KeycloakTokenResponse>(
    "POST",
    `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
    {
      body: new URLSearchParams({
        client_id: "admin-cli",
        grant_type: "password",
        username: KEYCLOAK_ADMIN_USERNAME,
        password: KEYCLOAK_ADMIN_PASSWORD,
      }),
    },
  );

  return tokenResponse.access_token;
}

async function createKeycloakUser(username: string, password: string): Promise<void> {
  const adminToken = await getKeycloakAdminToken();
  const response = await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email: `${username}@e2e.crash-game.dev`,
      enabled: true,
      emailVerified: true,
      credentials: [
        {
          type: "password",
          value: password,
          temporary: false,
        },
      ],
    }),
  });

  if (response.status !== 201 && response.status !== 409) {
    const payload = await response.json().catch(() => null);
    throw new Error(`Failed to create Keycloak user: ${response.status} ${JSON.stringify(payload)}`);
  }
}

async function getPlayerToken(username: string, password: string): Promise<string> {
  const tokenResponse = await requestJson<KeycloakTokenResponse>(
    "POST",
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
    {
      body: new URLSearchParams({
        client_id: KEYCLOAK_CLIENT_ID,
        grant_type: "password",
        username,
        password,
      }),
    },
  );

  return tokenResponse.access_token;
}

function authHeaders(auth: AuthContext): Record<string, string> {
  return { Authorization: `Bearer ${auth.accessToken}` };
}

function internalHeaders(): Record<string, string> {
  return { "x-internal-token": INTERNAL_API_TOKEN };
}

async function createPlayer(): Promise<AuthContext> {
  const username = `e2e-wallet-${Date.now()}-${randomUUID()}`;
  const password = "E2e-player123";

  await createKeycloakUser(username, password);
  const accessToken = await getPlayerToken(username, password);
  const playerId = decodeJwtPayload(accessToken).sub;

  return { playerId, username, accessToken };
}

async function waitForStack(): Promise<void> {
  const deadline = Date.now() + 15_000;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      await requestJson("GET", `${WALLETS_URL}/health`);
      await requestJson("GET", `${KONG_URL}/wallets/health`);
      return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Wallets stack was not ready within 15s.");
}

describe("wallet E2E", () => {
  beforeAll(async () => {
    await waitForStack();
  }, 30_000);

  test("returns 404 when player has no wallet", async () => {
    const auth = await createPlayer();

    await requestJson("GET", `${KONG_URL}/wallets/me`, {
      headers: authHeaders(auth),
      expectedStatus: 404,
    });
  }, 10_000);

  test("creates a wallet and returns it", async () => {
    const auth = await createPlayer();

    const created = await requestJson<WalletResponse>("POST", `${KONG_URL}/wallets`, {
      headers: authHeaders(auth),
      expectedStatus: 201,
    });

    expect(created.playerId).toBe(auth.playerId);
    expect(created.balanceInCents).toBe("0");

    const fetched = await requestJson<WalletResponse>("GET", `${KONG_URL}/wallets/me`, {
      headers: authHeaders(auth),
    });

    expect(fetched.id).toBe(created.id);
    expect(fetched.balanceInCents).toBe("0");
  }, 10_000);

  test("rejects duplicate wallet creation", async () => {
    const auth = await createPlayer();

    await requestJson<WalletResponse>("POST", `${KONG_URL}/wallets`, {
      headers: authHeaders(auth),
      expectedStatus: 201,
    });

    await requestJson("POST", `${KONG_URL}/wallets`, {
      headers: authHeaders(auth),
      expectedStatus: 409,
    });
  }, 10_000);

  test("funds a wallet via internal dev endpoint", async () => {
    const auth = await createPlayer();

    await requestJson<WalletResponse>("POST", `${KONG_URL}/wallets`, {
      headers: authHeaders(auth),
      expectedStatus: 201,
    });

    const funded = await requestJson<WalletResponse>(
      "POST",
      `${WALLETS_URL}/internal/dev/fund`,
      {
        body: {
          playerId: auth.playerId,
          amountInCents: "50000",
        },
        headers: internalHeaders(),
        expectedStatus: 201,
      },
    );

    expect(funded.balanceInCents).toBe("50000");

    const fetched = await requestJson<WalletResponse>("GET", `${KONG_URL}/wallets/me`, {
      headers: authHeaders(auth),
    });

    expect(fetched.balanceInCents).toBe("50000");
  }, 10_000);

  test("rejects funding a non-existent wallet", async () => {
    const auth = await createPlayer();

    await requestJson(
      "POST",
      `${WALLETS_URL}/internal/dev/fund`,
      {
        body: {
          playerId: auth.playerId,
          amountInCents: "10000",
        },
        headers: internalHeaders(),
        expectedStatus: 404,
      },
    );
  }, 10_000);
});
