import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, createHmac } from "crypto";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";

export interface VerifyRoundResult {
  round: RoundRecord;
  isValid: boolean;
  calculatedCrashPointHundredths: number;
  serverSeedHash: string;
  serverSeed: string;
}

@Injectable()
export class VerifyRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  async execute(roundId: string): Promise<VerifyRoundResult> {
    const round = await this.roundRepository.findById(roundId);

    if (!round) {
      throw new NotFoundException("Round not found.");
    }

    if (!round.serverSeed || !round.crashPointHundredths) {
      throw new NotFoundException("Round verification data is not available yet.");
    }

    const serverSeedHash = createHash("sha256")
      .update(round.serverSeed)
      .digest("hex");

    const isValid = serverSeedHash === round.serverSeedHash;

    const calculatedCrashPointHundredths = this.calculateCrashPoint(
      round.serverSeed,
    );

    return {
      round,
      isValid,
      calculatedCrashPointHundredths,
      serverSeedHash,
      serverSeed: round.serverSeed,
    };
  }

  private calculateCrashPoint(serverSeed: string): number {
    const hash = createHmac("sha256", serverSeed)
      .update("crash-game-salt")
      .digest("hex");

    const seed = parseInt(hash.substring(0, 13), 16);
    const max = Math.pow(2, 52);
    const result = seed / max;

    // House edge: 1% — crash point = 0.99 / result, capped at 1000x
    const crashPoint = Math.floor((0.99 / result) * 100);

    return Math.max(100, Math.min(crashPoint, 100_000));
  }
}
