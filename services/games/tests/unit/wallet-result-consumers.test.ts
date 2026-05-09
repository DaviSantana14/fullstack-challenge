import { describe, expect, mock, test } from "bun:test";
import type { RmqContext } from "@nestjs/microservices";
import type { BetRepository } from "../../src/domain/bets/bet.repository";
import type { BetRecord } from "../../src/domain/bets/bet.types";
import { WalletCreditResultConsumer } from "../../src/infrastructure/messaging/wallet-credit-result.consumer";
import { WalletDebitResultConsumer } from "../../src/infrastructure/messaging/wallet-debit-result.consumer";
import type { GameEventsService } from "../../src/application/events/game-events.service";
import type {
  WalletCreditResultEventMessage,
  WalletDebitResultEventMessage,
} from "../../src/infrastructure/messaging/wallet-debit.contract";

const now = new Date("2026-05-09T12:00:00.000Z");

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

function makeBetRepository(
  overrides: Partial<Record<keyof BetRepository, unknown>> = {},
): BetRepository {
  return {
    findByRoundId: mock(async () => []),
    findByRoundIdAndPlayerId: mock(async () => null),
    findByCorrelationId: mock(async () => makeBet()),
    createPendingBet: mock(),
    createAcceptedBet: mock(),
    startCashout: mock(async () => null),
    findCurrentAcceptedBet: mock(async () => null),
    findByCashoutCorrelationId: mock(async () => null),
    markCashoutPendingBetAsCashedOut: mock(async () =>
      makeBet({ status: "CASHED_OUT" }),
    ),
    markCashoutPendingBetAsAcceptedIfRoundInProgress: mock(async () =>
      makeBet({ status: "ACCEPTED" }),
    ),
    markCashoutPendingBetAsLostIfRoundCrashed: mock(async () =>
      makeBet({ status: "LOST" }),
    ),
    markPendingBetAsAcceptedIfRoundActive: mock(async () =>
      makeBet({ status: "ACCEPTED" }),
    ),
    markPendingBetAsLostIfRoundCrashed: mock(async () => null),
    markPendingBetAsRejected: mock(async () => makeBet({ status: "REJECTED" })),
    markCashoutPendingBetsAsLost: mock(async () => 0),
    markAcceptedBetsAsLost: mock(async () => 0),
    ...overrides,
  } as BetRepository;
}

function makeEvents(): GameEventsService {
  return {
    emit: mock(() => undefined),
    on: mock(() => () => undefined),
  } as unknown as GameEventsService;
}

function makeContext() {
  const message = { fields: { deliveryTag: 1 } };
  const channel = {
    ack: mock(() => undefined),
    nack: mock(() => undefined),
  };
  const context = {
    getChannelRef: () => channel,
    getMessage: () => message,
  } as unknown as RmqContext;

  return { context, channel, message };
}

function makeDebitMessage(
  overrides: Partial<WalletDebitResultEventMessage> = {},
): WalletDebitResultEventMessage {
  return {
    correlationId: "correlation-1",
    betId: "bet-1",
    status: "APPROVED",
    reason: null,
    walletTransactionId: "transaction-1",
    processedAt: now.toISOString(),
    ...overrides,
  };
}

function makeCreditMessage(
  overrides: Partial<WalletCreditResultEventMessage> = {},
): WalletCreditResultEventMessage {
  return {
    correlationId: "cashout-correlation-1",
    betId: "bet-1",
    status: "APPROVED",
    reason: null,
    walletTransactionId: "transaction-1",
    processedAt: now.toISOString(),
    ...overrides,
  };
}

describe("WalletDebitResultConsumer", () => {
  test("acks and skips when bet does not exist", async () => {
    const repository = makeBetRepository({
      findByCorrelationId: mock(async () => null),
    });
    const consumer = new WalletDebitResultConsumer(repository, makeEvents());
    const { context, channel, message } = makeContext();

    await consumer.handleResult(makeDebitMessage(), context);

    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(repository.markPendingBetAsAcceptedIfRoundActive).not.toHaveBeenCalled();
  });

  test("marks pending bet as accepted on approved debit", async () => {
    const repository = makeBetRepository();
    const events = makeEvents();
    const consumer = new WalletDebitResultConsumer(repository, events);
    const { context, channel, message } = makeContext();

    await consumer.handleResult(makeDebitMessage(), context);

    expect(repository.markPendingBetAsAcceptedIfRoundActive).toHaveBeenCalledWith(
      "correlation-1",
      now,
    );
    expect(events.emit).toHaveBeenCalledWith(
      "bet:placed",
      expect.objectContaining({ bet: expect.objectContaining({ status: "ACCEPTED" }) }),
    );
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  test("marks pending bet as rejected on rejected debit", async () => {
    const repository = makeBetRepository();
    const consumer = new WalletDebitResultConsumer(repository, makeEvents());
    const { context } = makeContext();

    await consumer.handleResult(
      makeDebitMessage({ status: "REJECTED", reason: "INSUFFICIENT_FUNDS" }),
      context,
    );

    expect(repository.markPendingBetAsRejected).toHaveBeenCalledWith(
      "correlation-1",
      "INSUFFICIENT_FUNDS",
    );
  });

  test("falls back to lost and rejected when approved debit arrives after closure", async () => {
    const repository = makeBetRepository({
      markPendingBetAsAcceptedIfRoundActive: mock(async () => null),
      markPendingBetAsLostIfRoundCrashed: mock(async () => null),
    });
    const consumer = new WalletDebitResultConsumer(repository, makeEvents());
    const { context } = makeContext();

    await consumer.handleResult(makeDebitMessage(), context);

    expect(repository.markPendingBetAsLostIfRoundCrashed).toHaveBeenCalledWith(
      "correlation-1",
      now,
    );
    expect(repository.markPendingBetAsRejected).toHaveBeenCalledWith(
      "correlation-1",
      "ROUND_CLOSED",
    );
  });

  test("nacks and rethrows on repository error", async () => {
    const repository = makeBetRepository({
      findByCorrelationId: mock(async () => {
        throw new Error("database unavailable");
      }),
    });
    const consumer = new WalletDebitResultConsumer(repository, makeEvents());
    const { context, channel, message } = makeContext();

    await expect(consumer.handleResult(makeDebitMessage(), context)).rejects.toThrow(
      "database unavailable",
    );
    expect(channel.nack).toHaveBeenCalledWith(message, false, true);
  });
});

describe("WalletCreditResultConsumer", () => {
  test("marks cashout pending bet as cashed out on approved credit", async () => {
    const repository = makeBetRepository();
    const events = makeEvents();
    const consumer = new WalletCreditResultConsumer(repository, events);
    const { context, channel, message } = makeContext();

    await consumer.handleResult(makeCreditMessage(), context);

    expect(repository.markCashoutPendingBetAsCashedOut).toHaveBeenCalledWith(
      "cashout-correlation-1",
      now,
    );
    expect(events.emit).toHaveBeenCalledWith(
      "bet:cashed_out",
      expect.objectContaining({ bet: expect.objectContaining({ status: "CASHED_OUT" }) }),
    );
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  test("reverts cashout pending bet to accepted on rejected credit", async () => {
    const repository = makeBetRepository();
    const consumer = new WalletCreditResultConsumer(repository, makeEvents());
    const { context } = makeContext();

    await consumer.handleResult(
      makeCreditMessage({ status: "REJECTED", reason: "WALLET_NOT_FOUND" }),
      context,
    );

    expect(
      repository.markCashoutPendingBetAsAcceptedIfRoundInProgress,
    ).toHaveBeenCalledWith("cashout-correlation-1", "WALLET_NOT_FOUND");
    expect(repository.markCashoutPendingBetAsLostIfRoundCrashed).not.toHaveBeenCalled();
  });

  test("falls back to lost when rejected credit cannot be reverted", async () => {
    const repository = makeBetRepository({
      markCashoutPendingBetAsAcceptedIfRoundInProgress: mock(async () => null),
    });
    const consumer = new WalletCreditResultConsumer(repository, makeEvents());
    const { context } = makeContext();

    await consumer.handleResult(
      makeCreditMessage({ status: "REJECTED", reason: "DUPLICATE_REQUEST" }),
      context,
    );

    expect(repository.markCashoutPendingBetAsLostIfRoundCrashed).toHaveBeenCalledWith(
      "cashout-correlation-1",
      now,
    );
  });

  test("nacks and rethrows on repository error", async () => {
    const repository = makeBetRepository({
      markCashoutPendingBetAsCashedOut: mock(async () => {
        throw new Error("database unavailable");
      }),
    });
    const consumer = new WalletCreditResultConsumer(repository, makeEvents());
    const { context, channel, message } = makeContext();

    await expect(consumer.handleResult(makeCreditMessage(), context)).rejects.toThrow(
      "database unavailable",
    );
    expect(channel.nack).toHaveBeenCalledWith(message, false, true);
  });
});
