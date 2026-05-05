import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";
import { createHash, randomBytes } from "crypto";

@Injectable()
export class CreateRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  async execute(): Promise<RoundRecord> {
    const existingRound = await this.roundRepository.findCurrentBettingRound();

    if (existingRound) {
      throw new ConflictException("A betting round is already active.");
    }

    const roundNumber = await this.roundRepository.getNextRoundNumber();
    const serverSeed = randomBytes(32).toString("hex");
    const serverSeedHash = createHash("sha256").update(serverSeed).digest("hex");
    const now = new Date();
    const bettingClosesAt = new Date(now.getTime() + 30_000);

    try {
      return await this.roundRepository.createBettingRound({
        roundNumber,
        serverSeed,
        serverSeedHash,
        bettingStartsAt: now,
        bettingClosesAt,
      });
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
