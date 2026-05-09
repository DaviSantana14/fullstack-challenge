import { randomUUID } from "crypto";
import { beforeAll, describe, expect, test } from "bun:test";

const KONG_URL = process.env.E2E_KONG_URL ?? "http://localhost:8000";
const GAMES_URL = process.env.E2E_GAMES_URL ?? "http://localhost:4001";
const WALLETS_URL = process.env.E2E_WALLETS_URL ?? "http://localhost:4002";
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
  body?: unknown;
  headers?: Record<string, string>;
  expectedStatus?: number;
}

async function requestJson<T>(
  method: string,
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
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

function authHeaders(playerId: string): Record<string, string> {
  return { "x-player-id": playerId };
}

function internalHeaders(): Record<string, string> {
  return { "x-internal-token": INTERNAL_API_TOKEN };
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

async function getMyWallet(playerId: string): Promise<WalletResponse> {
  return requestJson<WalletResponse>("GET", `${KONG_URL}/wallets/me`, {
    headers: authHeaders(playerId),
  });
}

async function getMyBets(playerId: string): Promise<BetResponse[]> {
  const payload = await requestJson<PaginatedBetsResponse>(
    "GET",
    `${KONG_URL}/games/bets/me`,
    {
      headers: authHeaders(playerId),
    },
  );

  return payload.items;
}

async function createPlayerWithWallet(
  initialBalanceInCents: number,
): Promise<string> {
  const playerId = `e2e-${Date.now()}-${randomUUID()}`;

  await requestJson<WalletResponse>("POST", `${KONG_URL}/wallets`, {
    headers: authHeaders(playerId),
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

  await expect(getMyWallet(playerId)).resolves.toMatchObject({
    playerId,
    balanceInCents: initialBalanceInCents.toString(),
  });

  return playerId;
}

async function placeBet(
  playerId: string,
  amountInCents: number,
  expectedStatus = 201,
): Promise<BetResponse> {
  return requestJson<BetResponse>("POST", `${KONG_URL}/games/bets`, {
    body: { amountInCents: amountInCents.toString() },
    headers: authHeaders(playerId),
    expectedStatus,
  });
}

async function placeBetViaReadmeAlias(
  playerId: string,
  amountInCents: number,
): Promise<BetResponse> {
  return requestJson<BetResponse>("POST", `${KONG_URL}/games/bet`, {
    body: { amountInCents: amountInCents.toString() },
    headers: authHeaders(playerId),
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
  playerId: string,
  status: string,
): Promise<BetResponse> {
  return eventually(async () => {
    const currentBet = await requestJson<CurrentBetResponse>(
      "GET",
      `${KONG_URL}/games/bets/me/current`,
      { headers: authHeaders(playerId) },
    );

    return currentBet.bet?.status === status ? currentBet.bet : null;
  });
}

async function waitForHistoricalBetStatus(
  playerId: string,
  betId: string,
  status: string,
): Promise<BetResponse> {
  return eventually(async () => {
    const bets = await getMyBets(playerId);
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
    const playerId = await createPlayerWithWallet(initialBalance);
    const round = await createFreshRound();

    const placedBet = await placeBet(playerId, betAmount);
    const acceptedBet = await eventually(async () => {
      if (placedBet.status === "ACCEPTED") {
        return placedBet;
      }

      return waitForCurrentBetStatus(playerId, "ACCEPTED");
    });

    expect(acceptedBet).toMatchObject({
      roundId: round.id,
      playerId,
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
      { body: {}, headers: authHeaders(playerId), expectedStatus: 201 },
    );

    const cashedOutBet = await eventually(async () => {
      const currentBet = await requestJson<CurrentBetResponse>(
        "GET",
        `${KONG_URL}/games/bets/me/current`,
        { headers: authHeaders(playerId) },
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
      const wallet = await getMyWallet(playerId);

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
    const playerId = await createPlayerWithWallet(initialBalance);
    const round = await createFreshRound();

    const placedBet = await placeBetViaReadmeAlias(playerId, betAmount);
    const acceptedBet =
      placedBet.status === "ACCEPTED"
        ? placedBet
        : await waitForCurrentBetStatus(playerId, "ACCEPTED");

    expect(acceptedBet).toMatchObject({
      roundId: round.id,
      playerId,
      amountInCents: betAmount.toString(),
      status: "ACCEPTED",
    });

    await startCurrentRound();
    await new Promise((resolve) => setTimeout(resolve, 200));

    await requestJson<BetResponse>("POST", `${KONG_URL}/games/bet/cashout`, {
      body: {},
      headers: authHeaders(playerId),
      expectedStatus: 201,
    });

    const cashedOutBet = await waitForCurrentBetStatus(playerId, "CASHED_OUT");
    expect(cashedOutBet.id).toBe(acceptedBet.id);
    expect(cashedOutBet.payoutInCents).not.toBeNull();
  }, 30_000);

  test("marks an accepted bet as lost when the round crashes without cashout", async () => {
    const initialBalance = 100_000;
    const betAmount = 10_000;
    const playerId = await createPlayerWithWallet(initialBalance);
    const round = await createFreshRound();
    const placedBet = await placeBet(playerId, betAmount);
    const acceptedBet =
      placedBet.status === "ACCEPTED"
        ? placedBet
        : await waitForCurrentBetStatus(playerId, "ACCEPTED");

    await startCurrentRound();
    await crashCurrentRound();

    const lostBet = await waitForHistoricalBetStatus(
      playerId,
      acceptedBet.id,
      "LOST",
    );
    expect(lostBet).toMatchObject({
      id: acceptedBet.id,
      roundId: round.id,
      playerId,
      status: "LOST",
      amountInCents: betAmount.toString(),
    });
    await expect(getMyWallet(playerId)).resolves.toMatchObject({
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
    const playerId = await createPlayerWithWallet(initialBalance);

    await createFreshRound();

    const placedBet = await placeBet(playerId, betAmount);
    const rejectedBet =
      placedBet.status === "REJECTED"
        ? placedBet
        : await waitForCurrentBetStatus(playerId, "REJECTED");

    expect(rejectedBet).toMatchObject({
      playerId,
      amountInCents: betAmount.toString(),
      status: "REJECTED",
      rejectionReason: "INSUFFICIENT_FUNDS",
    });
    await expect(getMyWallet(playerId)).resolves.toMatchObject({
      balanceInCents: initialBalance.toString(),
    });
  }, 30_000);

  test("rejects a duplicate bet in the same round", async () => {
    const playerId = await createPlayerWithWallet(100_000);

    await createFreshRound();
    const placedBet = await placeBet(playerId, 10_000);

    if (placedBet.status !== "ACCEPTED") {
      await waitForCurrentBetStatus(playerId, "ACCEPTED");
    }

    await requestJson("POST", `${KONG_URL}/games/bets`, {
      body: { amountInCents: "10000" },
      headers: authHeaders(playerId),
      expectedStatus: 409,
    });
  }, 30_000);

  test("rejects placing a bet after the betting phase has ended", async () => {
    const playerId = await createPlayerWithWallet(100_000);

    await createFreshRound();
    await startCurrentRound();

    await requestJson("POST", `${KONG_URL}/games/bets`, {
      body: { amountInCents: "10000" },
      headers: authHeaders(playerId),
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
