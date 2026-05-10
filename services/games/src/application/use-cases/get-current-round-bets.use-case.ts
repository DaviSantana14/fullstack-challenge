import { Inject, Injectable } from "@nestjs/common";
import {
  BET_REPOSITORY,
  type BetRepository,
} from "../../domain/bets/bet.repository";
import type { BetRecord } from "../../domain/bets/bet.types";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../domain/rounds/round.repository";

@Injectable()
export class GetCurrentRoundBetsUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
  ) {}

  async execute(): Promise<BetRecord[]> {
    const round = await this.roundRepository.findCurrentActiveRound();

    if (!round) {
      return [];
    }

    return this.betRepository.findByRoundId(round.id);
  }
}
