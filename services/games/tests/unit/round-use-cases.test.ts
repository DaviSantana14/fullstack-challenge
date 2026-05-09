import { createHash } from "crypto";
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { ConflictException, NotFoundException } from "@nestjs/common";
import type { BetRepository } from "../../src/domain/bets/bet.repository";
import type { RoundRepository } from "../../src/domain/rounds/round.repository";
import type { RoundRecord } from "../../src/domain/rounds/round.types";
import { calculateCrashPoint } from "../../src/domain/provably-fair/provably-fair.service";
import { CreateRoundUseCase } from "../../src/application/use-cases/create-round.use-case";
import { StartCurrentRoundUseCase } from "../../src/application/use-cases/start-current-round.use-case";
import { CrashCurrentRoundUseCase } from "../../src/application/use-cases/crash-current-round.use-case";
import { VerifyRoundUseCase } from "../../src/application/use-cases/verify-round.use-case";
import type { GameEventsService } from "../../src/application/events/game-events.service";

const baseDate = new Date("2026-05-09T12:00:00.000Z");

function makeRound(overrides: Partial<RoundRecord> = {}): RoundRecord {
  return {
    id: "round-1",
    roundNumber: 1,
    status: "BETTING",
    serverSeedHash: createHash("sha256").update("server-seed").digest("hex"),
    serverSeed: "server-seed",
    crashPointHundredths: null,
    bettingStartsAt: baseDate,
    bettingClosesAt: new Date(baseDate.getTime() + 10_000),
    startedAt: null,
    crashedAt: null,
    settledAt: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

function makeRoundRepository(
  overrides: Partial<Record<keyof RoundRepository, unknown>> = {},
): RoundRepository {
  return {
    findById: mock(async () => null),
    findCurrentBettingRound: mock(async () => null),
    findCurrentActiveRound: mock(async () => null),
    getNextRoundNumber: mock(async () => 1),
    createBettingRound: mock(async (input) =>
      makeRound({
        roundNumber: input.roundNumber,
        serverSeed: input.serverSeed,
        serverSeedHash: input.serverSeedHash,
        bettingStartsAt: input.bettingStartsAt,
        bettingClosesAt: input.bettingClosesAt,
      }),
    ),
    startRound: mock(async (roundId, startedAt) =>
      makeRound({ id: roundId, status: "IN_PROGRESS", startedAt }),
    ),
    crashRound: mock(async (roundId, crashPointHundredths, crashedAt) =>
      makeRound({
        id: roundId,
        status: "CRASHED",
        crashPointHundredths,
        crashedAt,
      }),
    ),
    findHistory: mock(async () => []),
    ...overrides,
  } as RoundRepository;
}

function makeBetRepository(
  overrides: Partial<Record<keyof BetRepository, unknown>> = {},
): BetRepository {
  return {
    findByRoundIdAndPlayerId: mock(async () => null),
    findByCorrelationId: mock(async () => null),
    createPendingBet: mock(),
    createAcceptedBet: mock(),
    startCashout: mock(async () => null),
    findCurrentAcceptedBet: mock(async () => null),
    findByCashoutCorrelationId: mock(async () => null),
    markCashoutPendingBetAsCashedOut: mock(async () => null),
    markCashoutPendingBetAsAcceptedIfRoundInProgress: mock(async () => null),
    markCashoutPendingBetAsLostIfRoundCrashed: mock(async () => null),
    markPendingBetAsAcceptedIfRoundActive: mock(async () => null),
    markPendingBetAsLostIfRoundCrashed: mock(async () => null),
    markPendingBetAsRejected: mock(async () => null),
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

describe("round use cases", () => {
  beforeEach(() => {
    delete process.env.ROUND_BETTING_SECONDS;
  });

  describe("CreateRoundUseCase", () => {
    test("creates a betting round with a hash and configured betting window", async () => {
      process.env.ROUND_BETTING_SECONDS = "15";
      const repository = makeRoundRepository();
      const events = makeEvents();
      const useCase = new CreateRoundUseCase(repository, events);

      const round = await useCase.execute();

      expect(round.status).toBe("BETTING");
      expect(round.serverSeedHash).toHaveLength(64);
      expect(round.bettingClosesAt.getTime() - round.bettingStartsAt.getTime()).toBe(15_000);
      expect(repository.createBettingRound).toHaveBeenCalledTimes(1);
      expect(events.emit).toHaveBeenCalledWith(
        "round:betting_started",
        expect.objectContaining({ round }),
      );
    });

    test("rejects creation when any round is already active", async () => {
      const repository = makeRoundRepository({
        findCurrentActiveRound: mock(async () => makeRound({ status: "IN_PROGRESS" })),
      });
      const useCase = new CreateRoundUseCase(repository, makeEvents());

      await expect(useCase.execute()).rejects.toBeInstanceOf(ConflictException);
      expect(repository.createBettingRound).not.toHaveBeenCalled();
    });
  });

  describe("StartCurrentRoundUseCase", () => {
    test("rejects when no betting round is available", async () => {
      const useCase = new StartCurrentRoundUseCase(makeRoundRepository(), makeEvents());

      await expect(useCase.execute()).rejects.toBeInstanceOf(ConflictException);
    });

    test("starts the current betting round and emits an event", async () => {
      const bettingRound = makeRound();
      const repository = makeRoundRepository({
        findCurrentBettingRound: mock(async () => bettingRound),
      });
      const events = makeEvents();
      const useCase = new StartCurrentRoundUseCase(repository, events);

      const startedRound = await useCase.execute();

      expect(startedRound.status).toBe("IN_PROGRESS");
      expect(repository.startRound).toHaveBeenCalledWith(bettingRound.id, expect.any(Date));
      expect(events.emit).toHaveBeenCalledWith(
        "round:started",
        expect.objectContaining({ round: startedRound }),
      );
    });
  });

  describe("CrashCurrentRoundUseCase", () => {
    test("rejects when no in-progress round is available", async () => {
      const useCase = new CrashCurrentRoundUseCase(
        makeRoundRepository(),
        makeBetRepository(),
        makeEvents(),
      );

      await expect(useCase.execute()).rejects.toBeInstanceOf(ConflictException);
    });

    test("crashes the current round, settles losing bets, and emits an event", async () => {
      const activeRound = makeRound({ status: "IN_PROGRESS", startedAt: baseDate });
      const repository = makeRoundRepository({
        findCurrentActiveRound: mock(async () => activeRound),
      });
      const betRepository = makeBetRepository();
      const events = makeEvents();
      const useCase = new CrashCurrentRoundUseCase(repository, betRepository, events);

      const crashedRound = await useCase.execute();

      expect(repository.crashRound).toHaveBeenCalledWith(
        activeRound.id,
        calculateCrashPoint(activeRound.serverSeed as string),
        expect.any(Date),
      );
      expect(betRepository.markAcceptedBetsAsLost).toHaveBeenCalledWith(
        activeRound.id,
        expect.any(Date),
      );
      expect(betRepository.markCashoutPendingBetsAsLost).toHaveBeenCalledWith(
        activeRound.id,
        expect.any(Date),
      );
      expect(events.emit).toHaveBeenCalledWith(
        "round:crashed",
        expect.objectContaining({ round: crashedRound }),
      );
    });
  });

  describe("VerifyRoundUseCase", () => {
    test("rejects an unknown round", async () => {
      const useCase = new VerifyRoundUseCase(makeRoundRepository());

      await expect(useCase.execute("missing-round")).rejects.toBeInstanceOf(NotFoundException);
    });

    test("rejects a round without revealed verification data", async () => {
      const repository = makeRoundRepository({
        findById: mock(async () => makeRound({ serverSeed: null })),
      });
      const useCase = new VerifyRoundUseCase(repository);

      await expect(useCase.execute("round-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    test("verifies hash and recalculates crash point", async () => {
      const round = makeRound({
        status: "CRASHED",
        crashPointHundredths: calculateCrashPoint("server-seed"),
        crashedAt: baseDate,
      });
      const repository = makeRoundRepository({
        findById: mock(async () => round),
      });
      const useCase = new VerifyRoundUseCase(repository);

      const result = await useCase.execute(round.id);

      expect(result.isValid).toBe(true);
      expect(result.serverSeedHash).toBe(round.serverSeedHash);
      expect(result.calculatedCrashPointHundredths).toBe(round.crashPointHundredths);
    });
  });
});
