import { describe, expect, mock, test } from "bun:test";
import type { ClientProxy } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import type { GameEventsService } from "../../src/application/events/game-events.service";
import { AutoCashoutService } from "../../src/application/use-cases/auto-cashout.service";
import type { BetRepository } from "../../src/domain/bets/bet.repository";
import type { BetRecord } from "../../src/domain/bets/bet.types";
import { WALLET_CREDIT_PATTERN } from "../../src/infrastructure/messaging/wallet-debit.contract";

const now = new Date("2026-05-09T12:00:00.000Z");

function makeBet(overrides: Partial<BetRecord> = {}): BetRecord {
  return {
    id: "bet-1",
    roundId: "round-1",
    playerId: "player-1",
    amountInCents: BigInt(1000),
    status: "ACCEPTED",
    autoCashoutMultiplierHundredths: 150,
    cashoutMultiplierHundredths: null,
    payoutInCents: null,
    correlationId: "bet-correlation-1",
    cashoutCorrelationId: null,
    rejectionReason: null,
    placedAt: now,
    acceptedAt: now,
    cashedOutAt: null,
    settledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeBetRepository(
  overrides: Partial<Record<keyof BetRepository, unknown>> = {},
): BetRepository {
  return {
    findByRoundId: mock(async () => []),
    findAutoCashoutCandidates: mock(async () => [makeBet()]),
    findPlayerBetsPage: mock(async () => ({ items: [], hasNextPage: false })),
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
    findCurrentAcceptedBet: mock(async () => null),
    findByCashoutCorrelationId: mock(async () => null),
    markCashoutPendingBetAsCashedOut: mock(async (cashoutCorrelationId, cashedOutAt) =>
      makeBet({
        status: "CASHED_OUT",
        cashoutCorrelationId,
        cashoutMultiplierHundredths: 150,
        payoutInCents: BigInt(1500),
        cashedOutAt,
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

describe("AutoCashoutService", () => {
  test("queries only reached auto cashout candidates", async () => {
    const betRepository = makeBetRepository({
      findAutoCashoutCandidates: mock(async () => []),
    });
    const service = new AutoCashoutService(
      betRepository,
      makeWalletsClient({}),
      makeEvents(),
    );

    await expect(
      service.processRound({
        roundId: "round-1",
        multiplierHundredths: 149,
        crashPointHundredths: 300,
      }),
    ).resolves.toEqual([]);
    expect(betRepository.findAutoCashoutCandidates).toHaveBeenCalledWith(
      "round-1",
      149,
    );
    expect(betRepository.startCashout).not.toHaveBeenCalled();
  });

  test("ignores targets at or above the crash point", async () => {
    const betRepository = makeBetRepository({
      findAutoCashoutCandidates: mock(async () => [
        makeBet({ autoCashoutMultiplierHundredths: 300 }),
      ]),
    });
    const service = new AutoCashoutService(
      betRepository,
      makeWalletsClient({}),
      makeEvents(),
    );

    await expect(
      service.processRound({
        roundId: "round-1",
        multiplierHundredths: 300,
        crashPointHundredths: 300,
      }),
    ).resolves.toEqual([]);
    expect(betRepository.startCashout).not.toHaveBeenCalled();
  });

  test("reserves eligible bet, credits wallet, marks cashed out, and emits event", async () => {
    const expectedPayout = BigInt(1500);
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
    const service = new AutoCashoutService(betRepository, walletsClient, events);

    const [bet] = await service.processRound({
      roundId: "round-1",
      multiplierHundredths: 150,
      crashPointHundredths: 300,
    });

    expect(bet.status).toBe("CASHED_OUT");
    expect(betRepository.startCashout).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: "bet-correlation-1",
        cashoutMultiplierHundredths: 150,
        payoutInCents: expectedPayout,
      }),
    );
    expect(walletsClient.send).toHaveBeenCalledWith(
      WALLET_CREDIT_PATTERN,
      expect.objectContaining({
        betId: "bet-1",
        amountInCents: expectedPayout.toString(),
        reason: "AUTO_CASHOUT_PAYOUT",
      }),
    );
    expect(events.emit).toHaveBeenCalledWith("bet:cashed_out", { bet });
  });

  test("keeps the bet cashout pending when wallet rpc fails", async () => {
    const pendingBet = makeBet({
      status: "CASHOUT_PENDING",
      cashoutCorrelationId: "cashout-correlation-1",
    });
    const service = new AutoCashoutService(
      makeBetRepository({ startCashout: mock(async () => pendingBet) }),
      makeFailingWalletsClient(),
      makeEvents(),
    );

    await expect(
      service.processRound({
        roundId: "round-1",
        multiplierHundredths: 150,
        crashPointHundredths: 300,
      }),
    ).resolves.toEqual([pendingBet]);
  });
});
