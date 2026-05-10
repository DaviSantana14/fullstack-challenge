import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { calculateCrashPoint } from "../../domain/provably-fair/provably-fair.service";
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

    const calculatedCrashPointHundredths = calculateCrashPoint(
      round.serverSeed,
      round.clientSeed,
    );

    return {
      round,
      isValid,
      calculatedCrashPointHundredths,
      serverSeedHash,
      serverSeed: round.serverSeed,
    };
  }
}
