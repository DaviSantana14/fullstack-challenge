import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import { GameEventsService } from "../events/game-events.service";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";
import { createHash, randomBytes } from "crypto";
import { getRoundEngineConfig } from "../engine/round-engine.config";

@Injectable()
export class CreateRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    private readonly gameEvents: GameEventsService,
  ) {}

  async execute(): Promise<RoundRecord> {
    const existingRound = await this.roundRepository.findCurrentActiveRound();

    if (existingRound) {
      throw new ConflictException("A round is already active.");
    }

    const roundNumber = await this.roundRepository.getNextRoundNumber();
    const serverSeed = randomBytes(32).toString("hex");
    const serverSeedHash = createHash("sha256").update(serverSeed).digest("hex");
    const now = new Date();
    const bettingClosesAt = new Date(
      now.getTime() + getRoundEngineConfig().bettingWindowMs,
    );

    try {
      const round = await this.roundRepository.createBettingRound({
        roundNumber,
        serverSeed,
        serverSeedHash,
        bettingStartsAt: now,
        bettingClosesAt,
      });

      this.gameEvents.emit("round:betting_started", {
        round,
        serverTime: new Date().toISOString(),
      });

      return round;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Failed to create a unique betting round.");
      }

      throw error;
    }
  }
}
