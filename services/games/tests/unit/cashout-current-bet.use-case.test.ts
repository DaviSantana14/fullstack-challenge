import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { ConflictException } from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import type { GameEventsService } from "../../src/application/events/game-events.service";
import { CashoutCurrentBetUseCase } from "../../src/application/use-cases/cashout-current-bet.use-case";
import { getMultiplierHundredths } from "../../src/domain/multiplier/multiplier.service";
import type { BetRepository } from "../../src/domain/bets/bet.repository";
import type { BetRecord } from "../../src/domain/bets/bet.types";
import type { RoundRepository } from "../../src/domain/rounds/round.repository";
import type { RoundRecord } from "../../src/domain/rounds/round.types";
import { WALLET_CREDIT_PATTERN } from "../../src/infrastructure/messaging/wallet-debit.contract";

const now = new Date("2026-05-09T12:00:10.000Z");
const startedAt = new Date("2026-05-09T12:00:00.000Z");
const originalDateNow = Date.now;

function makeRound(overrides: Partial<RoundRecord> = {}): RoundRecord {
  return {
    id: "round-1",
    roundNumber: 1,
    status: "IN_PROGRESS",
    serverSeedHash: "hash",
    serverSeed: "seed",
    crashPointHundredths: null,
    bettingStartsAt: new Date(startedAt.getTime() - 10_000),
    bettingClosesAt: startedAt,
    startedAt,
    crashedAt: null,
    settledAt: null,
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
}

function makeBet(overrides: Partial<BetRecord> = {}): BetRecord {
  return {
    id: "bet-1",
    roundId: "round-1",
    playerId: "player-1",
    amountInCents: BigInt(1000),
    status: "ACCEPTED",
    cashoutMultiplierHundredths: null,
    payoutInCents: null,
    correlationId: "bet-correlation-1",
    cashoutCorrelationId: null,
    rejectionReason: null,
    placedAt: startedAt,
    acceptedAt: startedAt,
    cashedOutAt: null,
    settledAt: null,
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
}

function makeRoundRepository(
  overrides: Partial<Record<keyof RoundRepository, unknown>> = {},
): RoundRepository {
  return {
    findById: mock(async () => null),
    findCurrentBettingRound: mock(async () => null),
    findCurrentActiveRound: mock(async () => makeRound()),
    getNextRoundNumber: mock(async () => 1),
    createBettingRound: mock(),
    startRound: mock(),
    crashRound: mock(),
    findHistory: mock(async () => []),
    ...overrides,
  } as RoundRepository;
}

function makeBetRepository(
  overrides: Partial<Record<keyof BetRepository, unknown>> = {},
): BetRepository {
  const pendingBet = makeBet({
    status: "CASHOUT_PENDING",
    cashoutCorrelationId: "cashout-correlation-1",
  });

  return {
    findByRoundIdAndPlayerId: mock(async () => null),
    findByCorrelationId: mock(async () => null),
    createPendingBet: mock(),
    createAcceptedBet: mock(),
    startCashout: mock(async (input) =>
      makeBet({
        status: "CASHOUT_PENDING",
        cashoutCorrelationId: input.cashoutCorrelationId,
        cashoutMultiplierHundredths: input.cashoutMultiplierHundredths,
        payoutInCents: input.payoutInCents,
      }),
    ),
    findCurrentAcceptedBet: mock(async () => makeBet()),
    findByCashoutCorrelationId: mock(async () => null),
    markCashoutPendingBetAsCashedOut: mock(async (cashoutCorrelationId, cashedOutAt) =>
      makeBet({
        status: "CASHED_OUT",
        cashoutCorrelationId,
        cashedOutAt,
        settledAt: cashedOutAt,
      }),
    ),
    markCashoutPendingBetAsAcceptedIfRoundInProgress: mock(async () =>
      makeBet({ status: "ACCEPTED" }),
    ),
    markCashoutPendingBetAsLostIfRoundCrashed: mock(async () =>
      makeBet({ status: "LOST", settledAt: now }),
    ),
    markPendingBetAsAcceptedIfRoundActive: mock(async () => null),
    markPendingBetAsLostIfRoundCrashed: mock(async () => null),
    markPendingBetAsRejected: mock(async () => null),
    markCashoutPendingBetsAsLost: mock(async () => 0),
    markAcceptedBetsAsLost: mock(async () => 0),
    ...overrides,
  } as BetRepository & { pendingBet: BetRecord };
}

function makeWalletsClient(response: unknown): ClientProxy {
  return {
    send: mock(() => of(response)),
  } as unknown as ClientProxy;
}

function makeFailingWalletsClient(): ClientProxy {
  return {
    send: mock(() => throwError(() => new Error("wallet rpc failed"))),
  } as unknown as ClientProxy;
}

function makeEvents(): GameEventsService {
  return {
    emit: mock(() => undefined),
    on: mock(() => () => undefined),
  } as unknown as GameEventsService;
}

describe("CashoutCurrentBetUseCase", () => {
  beforeEach(() => {
    Date.now = () => now.getTime();
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test("rejects when no in-progress round is available", async () => {
    const useCase = new CashoutCurrentBetUseCase(
      makeRoundRepository({ findCurrentActiveRound: mock(async () => null) }),
      makeBetRepository(),
      makeWalletsClient({}),
      makeEvents(),
    );

    await expect(useCase.execute("player-1")).rejects.toBeInstanceOf(ConflictException);
  });

  test("rejects when player has no accepted bet", async () => {
    const useCase = new CashoutCurrentBetUseCase(
      makeRoundRepository(),
      makeBetRepository({ findCurrentAcceptedBet: mock(async () => null) }),
      makeWalletsClient({}),
      makeEvents(),
    );

    await expect(useCase.execute("player-1")).rejects.toBeInstanceOf(ConflictException);
  });

  test("reserves cashout, credits wallet, marks bet as cashed out, and emits event", async () => {
    const expectedMultiplier = getMultiplierHundredths(now.getTime() - startedAt.getTime());
    const expectedPayout = (BigInt(1000) * BigInt(expectedMultiplier)) / BigInt(100);
    const betRepository = makeBetRepository();
    const walletsClient = makeWalletsClient({
      correlationId: "cashout-correlation-1",
      betId: "bet-1",
      status: "APPROVED",
      reason: null,
      walletTransactionId: "transaction-1",
      processedAt: now.toISOString(),
    });
    const events = makeEvents();
    const useCase = new CashoutCurrentBetUseCase(
      makeRoundRepository(),
      betRepository,
      walletsClient,
      events,
    );

    const bet = await useCase.execute("player-1");

    expect(bet.status).toBe("CASHED_OUT");
    expect(betRepository.startCashout).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: "bet-correlation-1",
        cashoutMultiplierHundredths: expectedMultiplier,
        payoutInCents: expectedPayout,
      }),
    );
    expect(walletsClient.send).toHaveBeenCalledWith(
      WALLET_CREDIT_PATTERN,
      expect.objectContaining({
        betId: "bet-1",
        amountInCents: expectedPayout.toString(),
        reason: "CASHOUT_PAYOUT",
      }),
    );
    expect(events.emit).toHaveBeenCalledWith("bet:cashed_out", { bet });
  });

  test("reverts cashout to accepted when wallet credit is rejected", async () => {
    const revertedBet = makeBet({ status: "ACCEPTED" });
    const betRepository = makeBetRepository({
      markCashoutPendingBetAsAcceptedIfRoundInProgress: mock(async () => revertedBet),
    });
    const useCase = new CashoutCurrentBetUseCase(
      makeRoundRepository(),
      betRepository,
      makeWalletsClient({
        correlationId: "cashout-correlation-1",
        betId: "bet-1",
        status: "REJECTED",
        reason: "WALLET_NOT_FOUND",
        walletTransactionId: null,
        processedAt: now.toISOString(),
      }),
      makeEvents(),
    );

    await expect(useCase.execute("player-1")).resolves.toBe(revertedBet);
    expect(
      betRepository.markCashoutPendingBetAsAcceptedIfRoundInProgress,
    ).toHaveBeenCalledWith("cashout-correlation-1", "WALLET_NOT_FOUND");
  });

  test("marks cashout pending bet as lost when rejected credit cannot be reverted", async () => {
    const lostBet = makeBet({ status: "LOST", settledAt: now });
    const betRepository = makeBetRepository({
      markCashoutPendingBetAsAcceptedIfRoundInProgress: mock(async () => null),
      markCashoutPendingBetAsLostIfRoundCrashed: mock(async () => lostBet),
    });
    const useCase = new CashoutCurrentBetUseCase(
      makeRoundRepository(),
      betRepository,
      makeWalletsClient({
        correlationId: "cashout-correlation-1",
        betId: "bet-1",
        status: "REJECTED",
        reason: "DUPLICATE_REQUEST",
        walletTransactionId: null,
        processedAt: now.toISOString(),
      }),
      makeEvents(),
    );

    await expect(useCase.execute("player-1")).resolves.toBe(lostBet);
    expect(betRepository.markCashoutPendingBetAsLostIfRoundCrashed).toHaveBeenCalledWith(
      "cashout-correlation-1",
      now,
    );
  });

  test("keeps bet cashout pending when wallet rpc fails", async () => {
    const pendingBet = makeBet({
      status: "CASHOUT_PENDING",
      cashoutCorrelationId: "cashout-correlation-1",
    });
    const useCase = new CashoutCurrentBetUseCase(
      makeRoundRepository(),
      makeBetRepository({ startCashout: mock(async () => pendingBet) }),
      makeFailingWalletsClient(),
      makeEvents(),
    );

    await expect(useCase.execute("player-1")).resolves.toBe(pendingBet);
  });
});
