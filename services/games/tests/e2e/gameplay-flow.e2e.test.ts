import { randomUUID } from "crypto";
import { Buffer } from "buffer";
import { beforeAll, describe, expect, test } from "bun:test";

const KONG_URL = process.env.E2E_KONG_URL ?? "http://localhost:8000";
const GAMES_URL = process.env.E2E_GAMES_URL ?? "http://localhost:4001";
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

interface RoundResponse {
  id: string;
  roundNumber: number;
  status: string;
  serverSeedHash: string;
  serverSeed: string | null;
  crashPointHundredths: number | null;
  bettingStartsAt: string;
  bettingClosesAt: string;
  startedAt: string | null;
  crashedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CurrentRoundResponse {
  round: RoundResponse | null;
}

interface BetResponse {
  id: string;
  roundId: string;
  playerId: string;
  amountInCents: string;
  status: string;
  cashoutMultiplierHundredths: number | null;
  payoutInCents: string | null;
  correlationId: string | null;
  rejectionReason: string | null;
  placedAt: string;
  acceptedAt: string | null;
  cashedOutAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CurrentBetResponse {
  bet: BetResponse | null;
}

interface PaginatedBetsResponse {
  items: BetResponse[];
  nextCursor: string | null;
}

interface WalletResponse {
  id: string;
  playerId: string;
  balanceInCents: string;
  createdAt: string;
  updatedAt: string;
}

interface VerifyRoundResponse {
  roundId: string;
  roundNumber: number;
  isValid: boolean;
  calculatedCrashPointHundredths: number;
  serverSeedHash: string;
  serverSeed: string;
  actualCrashPointHundredths: number | null;
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

async function eventually<T>(
  assertion: () => Promise<T | null>,
  timeoutMs = 5_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      const result = await assertion();

      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Condition was not met within ${timeoutMs}ms.`);
}

function authHeaders(auth: AuthContext): Record<string, string> {
  return { Authorization: `Bearer ${auth.accessToken}` };
}

function internalHeaders(): Record<string, string> {
  return { "x-internal-token": INTERNAL_API_TOKEN };
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
      firstName: "E2E",
      lastName: "Player",
      enabled: true,
      emailVerified: true,
      requiredActions: [],
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

async function getCurrentRound(): Promise<RoundResponse | null> {
  const payload = await requestJson<CurrentRoundResponse>(
    "GET",
    `${KONG_URL}/games/rounds/current`,
  );

  return payload.round;
}

async function closeActiveRoundIfNeeded(): Promise<void> {
  const currentRound = await getCurrentRound();

  if (!currentRound) {
    return;
  }

  if (currentRound.status === "BETTING") {
    await requestJson<RoundResponse>(
      "POST",
      `${GAMES_URL}/internal/rounds/current/start`,
      { headers: internalHeaders(), expectedStatus: 201 },
    );
    await requestJson<RoundResponse>(
      "POST",
      `${GAMES_URL}/internal/rounds/current/crash`,
      { headers: internalHeaders(), expectedStatus: 201 },
    );
    return;
  }

  if (currentRound.status === "IN_PROGRESS") {
    await requestJson<RoundResponse>(
      "POST",
      `${GAMES_URL}/internal/rounds/current/crash`,
      { headers: internalHeaders(), expectedStatus: 201 },
    );
  }
}

async function createFreshRound(): Promise<RoundResponse> {
  await closeActiveRoundIfNeeded();

  const round = await requestJson<RoundResponse>(
    "POST",
    `${GAMES_URL}/internal/rounds`,
    { headers: internalHeaders(), expectedStatus: 201 },
  );

  expect(round.status).toBe("BETTING");

  return round;
}

async function getMyWallet(auth: AuthContext): Promise<WalletResponse> {
  return requestJson<WalletResponse>("GET", `${KONG_URL}/wallets/me`, {
    headers: authHeaders(auth),
  });
}

async function getMyBets(auth: AuthContext): Promise<BetResponse[]> {
  const payload = await requestJson<PaginatedBetsResponse>(
    "GET",
    `${KONG_URL}/games/bets/me`,
    {
      headers: authHeaders(auth),
    },
  );

  return payload.items;
}

async function createPlayerWithWallet(
  initialBalanceInCents: number,
): Promise<AuthContext> {
  const username = `e2e-${Date.now()}-${randomUUID()}`;
  const password = "E2e-player123";

  await createKeycloakUser(username, password);
  const accessToken = await getPlayerToken(username, password);
  const playerId = decodeJwtPayload(accessToken).sub;
  const auth: AuthContext = { playerId, username, accessToken };

  await requestJson<WalletResponse>("POST", `${KONG_URL}/wallets`, {
    headers: authHeaders(auth),
    expectedStatus: 201,
  });

  if (initialBalanceInCents > 0) {
    await requestJson<WalletResponse>(
      "POST",
      `${WALLETS_URL}/internal/dev/fund`,
      {
        body: {
          playerId,
          amountInCents: initialBalanceInCents.toString(),
        },
        headers: internalHeaders(),
        expectedStatus: 201,
      },
    );
  }

  await expect(getMyWallet(auth)).resolves.toMatchObject({
    playerId,
    balanceInCents: initialBalanceInCents.toString(),
  });

  return auth;
}

async function placeBet(
  auth: AuthContext,
  amountInCents: number,
  expectedStatus = 201,
): Promise<BetResponse> {
  return requestJson<BetResponse>("POST", `${KONG_URL}/games/bets`, {
    body: { amountInCents: amountInCents.toString() },
    headers: authHeaders(auth),
    expectedStatus,
  });
}

async function placeBetViaReadmeAlias(
  auth: AuthContext,
  amountInCents: number,
): Promise<BetResponse> {
  return requestJson<BetResponse>("POST", `${KONG_URL}/games/bet`, {
    body: { amountInCents: amountInCents.toString() },
    headers: authHeaders(auth),
    expectedStatus: 201,
  });
}

async function startCurrentRound(): Promise<RoundResponse> {
  return requestJson<RoundResponse>(
    "POST",
    `${GAMES_URL}/internal/rounds/current/start`,
    { headers: internalHeaders(), expectedStatus: 201 },
  );
}

async function crashCurrentRound(): Promise<RoundResponse> {
  return requestJson<RoundResponse>(
    "POST",
    `${GAMES_URL}/internal/rounds/current/crash`,
    { headers: internalHeaders(), expectedStatus: 201 },
  );
}

async function waitForCurrentBetStatus(
  auth: AuthContext,
  status: string,
): Promise<BetResponse> {
  return eventually(async () => {
    const currentBet = await requestJson<CurrentBetResponse>(
      "GET",
      `${KONG_URL}/games/bets/me/current`,
      { headers: authHeaders(auth) },
    );

    return currentBet.bet?.status === status ? currentBet.bet : null;
  });
}

async function waitForHistoricalBetStatus(
  auth: AuthContext,
  betId: string,
  status: string,
): Promise<BetResponse> {
  return eventually(async () => {
    const bets = await getMyBets(auth);
    const bet = bets.find((item) => item.id === betId);

    return bet?.status === status ? bet : null;
  });
}

async function waitForStack(): Promise<void> {
  await eventually(async () => {
    await requestJson("GET", `${GAMES_URL}/health`);
    await requestJson("GET", `${WALLETS_URL}/health`);
    await requestJson("GET", `${KONG_URL}/games/health`);
    await requestJson("GET", `${KONG_URL}/wallets/health`);

    return true;
  }, 15_000);
}

describe("gameplay E2E", () => {
  beforeAll(async () => {
    await waitForStack();
  }, 30_000);

  test("reserves a bet, cashes out, credits payout, and exposes verification data", async () => {
    const initialBalance = 100_000;
    const betAmount = 10_000;
    const auth = await createPlayerWithWallet(initialBalance);
    const round = await createFreshRound();

    const placedBet = await placeBet(auth, betAmount);
    const acceptedBet = await eventually(async () => {
      if (placedBet.status === "ACCEPTED") {
        return placedBet;
      }

      return waitForCurrentBetStatus(auth, "ACCEPTED");
    });

    expect(acceptedBet).toMatchObject({
      roundId: round.id,
      playerId: auth.playerId,
      amountInCents: betAmount.toString(),
      status: "ACCEPTED",
    });

    const roundBets = await requestJson<BetResponse[]>(
      "GET",
      `${KONG_URL}/games/bets/current-round`,
    );
    expect(roundBets.some((bet) => bet.id === acceptedBet.id)).toBe(true);

    await startCurrentRound();
    await new Promise((resolve) => setTimeout(resolve, 200));

    await requestJson<BetResponse>(
      "POST",
      `${KONG_URL}/games/bets/me/current/cashout`,
      { body: {}, headers: authHeaders(auth), expectedStatus: 201 },
    );

    const cashedOutBet = await eventually(async () => {
      const currentBet = await requestJson<CurrentBetResponse>(
        "GET",
        `${KONG_URL}/games/bets/me/current`,
        { headers: authHeaders(auth) },
      );

      return currentBet.bet?.status === "CASHED_OUT" ? currentBet.bet : null;
    });

    expect(cashedOutBet.payoutInCents).not.toBeNull();
    expect(cashedOutBet.cashoutMultiplierHundredths).not.toBeNull();
    expect(cashedOutBet.cashoutMultiplierHundredths as number).toBeGreaterThanOrEqual(
      100,
    );

    const payoutInCents = Number(cashedOutBet.payoutInCents);
    const expectedFinalBalance = initialBalance - betAmount + payoutInCents;

    await eventually(async () => {
      const wallet = await getMyWallet(auth);

      return wallet.balanceInCents === expectedFinalBalance.toString()
        ? wallet
        : null;
    });

    await crashCurrentRound();

    const verification = await requestJson<VerifyRoundResponse>(
      "GET",
      `${KONG_URL}/games/rounds/${round.id}/verify`,
    );

    expect(verification.roundId).toBe(round.id);
    expect(verification.isValid).toBe(true);
    expect(verification.serverSeed).toBeTruthy();
    expect(verification.serverSeedHash).toBeTruthy();
    expect(verification.actualCrashPointHundredths).toBe(
      verification.calculatedCrashPointHundredths,
    );
  }, 30_000);

  test("supports README-compatible bet and cashout routes", async () => {
    const initialBalance = 100_000;
    const betAmount = 10_000;
    const auth = await createPlayerWithWallet(initialBalance);
    const round = await createFreshRound();

    const placedBet = await placeBetViaReadmeAlias(auth, betAmount);
    const acceptedBet =
      placedBet.status === "ACCEPTED"
        ? placedBet
        : await waitForCurrentBetStatus(auth, "ACCEPTED");

    expect(acceptedBet).toMatchObject({
      roundId: round.id,
      playerId: auth.playerId,
      amountInCents: betAmount.toString(),
      status: "ACCEPTED",
    });

    await startCurrentRound();
    await new Promise((resolve) => setTimeout(resolve, 200));

    await requestJson<BetResponse>("POST", `${KONG_URL}/games/bet/cashout`, {
      body: {},
      headers: authHeaders(auth),
      expectedStatus: 201,
    });

    const cashedOutBet = await waitForCurrentBetStatus(auth, "CASHED_OUT");
    expect(cashedOutBet.id).toBe(acceptedBet.id);
    expect(cashedOutBet.payoutInCents).not.toBeNull();
  }, 30_000);

  test("marks an accepted bet as lost when the round crashes without cashout", async () => {
    const initialBalance = 100_000;
    const betAmount = 10_000;
    const auth = await createPlayerWithWallet(initialBalance);
    const round = await createFreshRound();
    const placedBet = await placeBet(auth, betAmount);
    const acceptedBet =
      placedBet.status === "ACCEPTED"
        ? placedBet
        : await waitForCurrentBetStatus(auth, "ACCEPTED");

    await startCurrentRound();
    await crashCurrentRound();

    const lostBet = await waitForHistoricalBetStatus(
      auth,
      acceptedBet.id,
      "LOST",
    );
    expect(lostBet).toMatchObject({
      id: acceptedBet.id,
      roundId: round.id,
      playerId: auth.playerId,
      status: "LOST",
      amountInCents: betAmount.toString(),
    });
    await expect(getMyWallet(auth)).resolves.toMatchObject({
      balanceInCents: (initialBalance - betAmount).toString(),
    });

    const verification = await requestJson<VerifyRoundResponse>(
      "GET",
      `${KONG_URL}/games/rounds/${round.id}/verify`,
    );
    expect(verification.isValid).toBe(true);
  }, 30_000);

  test("rejects a bet when wallet balance is insufficient", async () => {
    const initialBalance = 500;
    const betAmount = 1_000;
    const auth = await createPlayerWithWallet(initialBalance);

    await createFreshRound();

    const placedBet = await placeBet(auth, betAmount);
    const rejectedBet =
      placedBet.status === "REJECTED"
        ? placedBet
        : await waitForCurrentBetStatus(auth, "REJECTED");

    expect(rejectedBet).toMatchObject({
      playerId: auth.playerId,
      amountInCents: betAmount.toString(),
      status: "REJECTED",
      rejectionReason: "INSUFFICIENT_FUNDS",
    });
    await expect(getMyWallet(auth)).resolves.toMatchObject({
      balanceInCents: initialBalance.toString(),
    });
  }, 30_000);

  test("rejects a duplicate bet in the same round", async () => {
    const auth = await createPlayerWithWallet(100_000);

    await createFreshRound();
    const placedBet = await placeBet(auth, 10_000);

    if (placedBet.status !== "ACCEPTED") {
      await waitForCurrentBetStatus(auth, "ACCEPTED");
    }

    await requestJson("POST", `${KONG_URL}/games/bets`, {
      body: { amountInCents: "10000" },
      headers: authHeaders(auth),
      expectedStatus: 409,
    });
  }, 30_000);

  test("rejects placing a bet after the betting phase has ended", async () => {
    const auth = await createPlayerWithWallet(100_000);

    await createFreshRound();
    await startCurrentRound();

    await requestJson("POST", `${KONG_URL}/games/bets`, {
      body: { amountInCents: "10000" },
      headers: authHeaders(auth),
      expectedStatus: 409,
    });
  }, 30_000);

  test("rejects cashout without an accepted in-progress bet or after crash", async () => {
    const playerWithoutBet = await createPlayerWithWallet(100_000);

    await createFreshRound();
    await startCurrentRound();

    await requestJson("POST", `${KONG_URL}/games/bets/me/current/cashout`, {
      body: {},
      headers: authHeaders(playerWithoutBet),
      expectedStatus: 409,
    });
    await crashCurrentRound();

    const playerAfterCrash = await createPlayerWithWallet(100_000);

    await requestJson("POST", `${KONG_URL}/games/bets/me/current/cashout`, {
      body: {},
      headers: authHeaders(playerAfterCrash),
      expectedStatus: 409,
    });
  }, 30_000);
});
