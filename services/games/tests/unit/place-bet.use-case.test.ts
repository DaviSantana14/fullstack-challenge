import { describe, expect, mock, test } from "bun:test";
import { BadRequestException, ConflictException } from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import type { GameEventsService } from "../../src/application/events/game-events.service";
import { PlaceBetUseCase } from "../../src/application/use-cases/place-bet.use-case";
import type { BetRepository } from "../../src/domain/bets/bet.repository";
import type { BetRecord } from "../../src/domain/bets/bet.types";
import type { RoundRepository } from "../../src/domain/rounds/round.repository";
import type { RoundRecord } from "../../src/domain/rounds/round.types";
import { WALLET_DEBIT_PATTERN } from "../../src/infrastructure/messaging/wallet-debit.contract";

const now = new Date("2026-05-09T12:00:00.000Z");

function makeRound(overrides: Partial<RoundRecord> = {}): RoundRecord {
  return {
    id: "round-1",
    roundNumber: 1,
    status: "BETTING",
    serverSeedHash: "hash",
    serverSeed: "seed",
    crashPointHundredths: null,
    bettingStartsAt: now,
    bettingClosesAt: new Date(now.getTime() + 10_000),
    startedAt: null,
    crashedAt: null,
    settledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeBet(overrides: Partial<BetRecord> = {}): BetRecord {
  return {
    id: "bet-1",
    roundId: "round-1",
    playerId: "player-1",
    amountInCents: BigInt(1000),
    status: "PENDING",
    cashoutMultiplierHundredths: null,
    payoutInCents: null,
    correlationId: "correlation-1",
    cashoutCorrelationId: null,
    rejectionReason: null,
    placedAt: now,
    acceptedAt: null,
    cashedOutAt: null,
    settledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRoundRepository(
  overrides: Partial<Record<keyof RoundRepository, unknown>> = {},
): RoundRepository {
  return {
    findById: mock(async () => null),
    findCurrentBettingRound: mock(async () => makeRound()),
    findCurrentActiveRound: mock(async () => null),
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
  return {
    findByRoundId: mock(async () => []),
    findByRoundIdAndPlayerId: mock(async () => null),
    findByCorrelationId: mock(async () => null),
    createPendingBet: mock(async () => makeBet()),
    createAcceptedBet: mock(),
    startCashout: mock(async () => null),
    findCurrentAcceptedBet: mock(async () => null),
    findByCashoutCorrelationId: mock(async () => null),
    markCashoutPendingBetAsCashedOut: mock(async () => null),
    markCashoutPendingBetAsAcceptedIfRoundInProgress: mock(async () => null),
    markCashoutPendingBetAsLostIfRoundCrashed: mock(async () => null),
    markPendingBetAsAcceptedIfRoundActive: mock(async () =>
      makeBet({ status: "ACCEPTED", acceptedAt: now }),
    ),
    markPendingBetAsLostIfRoundCrashed: mock(async () => null),
    markPendingBetAsRejected: mock(async (_correlationId, rejectionReason) =>
      makeBet({ status: "REJECTED", rejectionReason }),
    ),
    markCashoutPendingBetsAsLost: mock(async () => 0),
    markAcceptedBetsAsLost: mock(async () => 0),
    ...overrides,
  } as BetRepository;
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

describe("PlaceBetUseCase", () => {
  test("rejects invalid amount strings", async () => {
    const useCase = new PlaceBetUseCase(
      makeRoundRepository(),
      makeBetRepository(),
      makeWalletsClient({}),
      makeEvents(),
    );

    await expect(useCase.execute("player-1", "1.00")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(useCase.execute("player-1", "0")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  test("rejects when no betting round is accepting bets", async () => {
    const useCase = new PlaceBetUseCase(
      makeRoundRepository({ findCurrentBettingRound: mock(async () => null) }),
      makeBetRepository(),
      makeWalletsClient({}),
      makeEvents(),
    );

    await expect(useCase.execute("player-1", "1000")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  test("rejects duplicate bet in the current round", async () => {
    const useCase = new PlaceBetUseCase(
      makeRoundRepository(),
      makeBetRepository({
        findByRoundIdAndPlayerId: mock(async () => makeBet({ status: "ACCEPTED" })),
      }),
      makeWalletsClient({}),
      makeEvents(),
    );

    await expect(useCase.execute("player-1", "1000")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  test("accepts a pending bet when wallet debit is approved", async () => {
    const betRepository = makeBetRepository();
    const walletsClient = makeWalletsClient({
      correlationId: "correlation-1",
      betId: "bet-1",
      status: "APPROVED",
      reason: null,
      walletTransactionId: "transaction-1",
      processedAt: now.toISOString(),
    });
    const events = makeEvents();
    const useCase = new PlaceBetUseCase(
      makeRoundRepository(),
      betRepository,
      walletsClient,
      events,
    );

    const bet = await useCase.execute("player-1", "1000");

    expect(bet.status).toBe("ACCEPTED");
    expect(betRepository.createPendingBet).toHaveBeenCalledWith(
      expect.objectContaining({
        roundId: "round-1",
        playerId: "player-1",
        amountInCents: BigInt(1000),
      }),
    );
    expect(walletsClient.send).toHaveBeenCalledWith(
      WALLET_DEBIT_PATTERN,
      expect.objectContaining({
        correlationId: "correlation-1",
        betId: "bet-1",
        amountInCents: "1000",
      }),
    );
    expect(events.emit).toHaveBeenCalledWith("bet:placed", { bet });
  });

  test("rejects the pending bet when wallet debit is rejected", async () => {
    const betRepository = makeBetRepository();
    const useCase = new PlaceBetUseCase(
      makeRoundRepository(),
      betRepository,
      makeWalletsClient({
        correlationId: "correlation-1",
        betId: "bet-1",
        status: "REJECTED",
        reason: "INSUFFICIENT_FUNDS",
        walletTransactionId: null,
        processedAt: now.toISOString(),
      }),
      makeEvents(),
    );

    const bet = await useCase.execute("player-1", "1000");

    expect(bet.status).toBe("REJECTED");
    expect(bet.rejectionReason).toBe("INSUFFICIENT_FUNDS");
    expect(betRepository.markPendingBetAsRejected).toHaveBeenCalledWith(
      "correlation-1",
      "INSUFFICIENT_FUNDS",
    );
  });

  test("keeps the bet pending when wallet rpc fails", async () => {
    const pendingBet = makeBet({ status: "PENDING" });
    const useCase = new PlaceBetUseCase(
      makeRoundRepository(),
      makeBetRepository({
        createPendingBet: mock(async () => pendingBet),
      }),
      makeFailingWalletsClient(),
      makeEvents(),
    );

    await expect(useCase.execute("player-1", "1000")).resolves.toBe(pendingBet);
  });

  test("falls back to lost or rejected when wallet approves after round closure", async () => {
    const lostBet = makeBet({ status: "LOST", settledAt: now });
    const betRepository = makeBetRepository({
      markPendingBetAsAcceptedIfRoundActive: mock(async () => null),
      markPendingBetAsLostIfRoundCrashed: mock(async () => lostBet),
    });
    const useCase = new PlaceBetUseCase(
      makeRoundRepository(),
      betRepository,
      makeWalletsClient({
        correlationId: "correlation-1",
        betId: "bet-1",
        status: "APPROVED",
        reason: null,
        walletTransactionId: "transaction-1",
        processedAt: now.toISOString(),
      }),
      makeEvents(),
    );

    await expect(useCase.execute("player-1", "1000")).resolves.toBe(lostBet);
    expect(betRepository.markPendingBetAsLostIfRoundCrashed).toHaveBeenCalledWith(
      "correlation-1",
      now,
    );
    expect(betRepository.markPendingBetAsRejected).not.toHaveBeenCalled();
  });
});
