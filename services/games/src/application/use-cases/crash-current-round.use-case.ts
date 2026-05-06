import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import {
  BET_REPOSITORY,
  type BetRepository,
} from "../../domain/bets/bet.repository";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";

@Injectable()
export class CrashCurrentRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
  ) {}

  async execute(crashPointHundredthsInput: number): Promise<RoundRecord> {
    if (!Number.isInteger(crashPointHundredthsInput) || crashPointHundredthsInput < 100) {
      throw new BadRequestException(
        "crashPointHundredths must be an integer greater than or equal to 100.",
      );
    }

    const round = await this.roundRepository.findCurrentActiveRound();

    if (!round || round.status !== "IN_PROGRESS") {
      throw new ConflictException("No in-progress round is available to crash.");
    }

    const crashedAt = new Date();
    const crashedRound = await this.roundRepository.crashRound(
      round.id,
      crashPointHundredthsInput,
      crashedAt,
    );

    await this.betRepository.markAcceptedBetsAsLost(round.id, crashedAt);

    return crashedRound;
  }
}
