import { createHash } from "crypto";
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { BetRepository } from "../../src/domain/bets/bet.repository";
import type { RoundRepository } from "../../src/domain/rounds/round.repository";
import type { RoundRecord } from "../../src/domain/rounds/round.types";
import { calculateCrashPoint } from "../../src/domain/provably-fair/provably-fair.service";
import { CreateRoundUseCase } from "../../src/application/use-cases/create-round.use-case";
import { StartCurrentRoundUseCase } from "../../src/application/use-cases/start-current-round.use-case";
import { CrashCurrentRoundUseCase } from "../../src/application/use-cases/crash-current-round.use-case";
import { VerifyRoundUseCase } from "../../src/application/use-cases/verify-round.use-case";
import { GetCurrentRoundBetsUseCase } from "../../src/application/use-cases/get-current-round-bets.use-case";
import { GetMyBetsUseCase } from "../../src/application/use-cases/get-my-bets.use-case";
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
    findByRoundId: mock(async () => []),
    findPlayerBetsPage: mock(async () => ({ items: [], hasNextPage: false })),
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
      expect(result.calculatedCrashPointHundredths).toBe(
        round.crashPointHundredths as number,
      );
    });
  });

  describe("GetCurrentRoundBetsUseCase", () => {
    test("returns an empty list when there is no active round", async () => {
      const betRepository = makeBetRepository();
      const useCase = new GetCurrentRoundBetsUseCase(makeRoundRepository(), betRepository);

      await expect(useCase.execute()).resolves.toEqual([]);
      expect(betRepository.findByRoundId).not.toHaveBeenCalled();
    });

    test("returns bets for the current active round", async () => {
      const round = makeRound({ status: "BETTING" });
      const bets = [
        {
          id: "bet-1",
          roundId: round.id,
          playerId: "player-1",
          amountInCents: BigInt(1000),
          status: "ACCEPTED" as const,
          cashoutMultiplierHundredths: null,
          payoutInCents: null,
          correlationId: "correlation-1",
          cashoutCorrelationId: null,
          rejectionReason: null,
          placedAt: baseDate,
          acceptedAt: baseDate,
          cashedOutAt: null,
          settledAt: null,
          createdAt: baseDate,
          updatedAt: baseDate,
        },
      ];
      const betRepository = makeBetRepository({
        findByRoundId: mock(async () => bets),
      });
      const useCase = new GetCurrentRoundBetsUseCase(
        makeRoundRepository({ findCurrentActiveRound: mock(async () => round) }),
        betRepository,
      );

      await expect(useCase.execute()).resolves.toBe(bets);
      expect(betRepository.findByRoundId).toHaveBeenCalledWith(round.id);
    });
  });

  describe("GetMyBetsUseCase", () => {
    const bet = {
      id: "bet-1",
      roundId: "round-1",
      playerId: "player-1",
      amountInCents: BigInt(1000),
      status: "LOST" as const,
      cashoutMultiplierHundredths: null,
      payoutInCents: null,
      correlationId: "correlation-1",
      cashoutCorrelationId: null,
      rejectionReason: null,
      placedAt: baseDate,
      acceptedAt: baseDate,
      cashedOutAt: null,
      settledAt: baseDate,
      createdAt: baseDate,
      updatedAt: baseDate,
    };

    test("returns the first page with default limit", async () => {
      const betRepository = makeBetRepository({
        findPlayerBetsPage: mock(async () => ({
          items: [bet],
          hasNextPage: false,
        })),
      });
      const useCase = new GetMyBetsUseCase(betRepository);

      await expect(useCase.execute({ playerId: "player-1" })).resolves.toEqual({
        items: [bet],
        nextCursor: null,
      });
      expect(betRepository.findPlayerBetsPage).toHaveBeenCalledWith({
        playerId: "player-1",
        limit: 20,
        cursor: undefined,
      });
    });

    test("clamps the limit and returns a next cursor when more items exist", async () => {
      const betRepository = makeBetRepository({
        findPlayerBetsPage: mock(async () => ({
          items: [bet],
          hasNextPage: true,
        })),
      });
      const useCase = new GetMyBetsUseCase(betRepository);

      const result = await useCase.execute({ playerId: "player-1", limit: "999" });

      expect(result.items).toEqual([bet]);
      expect(typeof result.nextCursor).toBe("string");
      expect(betRepository.findPlayerBetsPage).toHaveBeenCalledWith({
        playerId: "player-1",
        limit: 50,
        cursor: undefined,
      });
    });

    test("decodes and passes a valid cursor", async () => {
      const cursor = Buffer.from(
        JSON.stringify({
          placedAt: baseDate.toISOString(),
          id: "bet-cursor",
        }),
        "utf8",
      ).toString("base64url");
      const betRepository = makeBetRepository();
      const useCase = new GetMyBetsUseCase(betRepository);

      await useCase.execute({ playerId: "player-1", limit: "10", cursor });

      expect(betRepository.findPlayerBetsPage).toHaveBeenCalledWith({
        playerId: "player-1",
        limit: 10,
        cursor: {
          placedAt: baseDate,
          id: "bet-cursor",
        },
      });
    });

    test("rejects an invalid cursor", async () => {
      const useCase = new GetMyBetsUseCase(makeBetRepository());

      await expect(
        useCase.execute({ playerId: "player-1", cursor: "not-base64" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test("rejects an invalid limit", async () => {
      const useCase = new GetMyBetsUseCase(makeBetRepository());

      await expect(
        useCase.execute({ playerId: "player-1", limit: "0" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
