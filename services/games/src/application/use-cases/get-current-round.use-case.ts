import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";

@Injectable()
export class GetCurrentRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  async execute(): Promise<RoundRecord> {
    const round = await this.roundRepository.findCurrentBettingRound();

    if (!round) {
      throw new NotFoundException("No active betting round was found.");
    }

    return round;
  }
}
