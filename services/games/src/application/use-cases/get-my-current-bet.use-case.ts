import { Inject, Injectable, NotFoundException } from "@nestjs/common";
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
export class GetMyCurrentBetUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
  ) {}

  async execute(playerId: string): Promise<BetRecord> {
    const round = await this.roundRepository.findCurrentActiveRound();

    if (!round) {
      throw new NotFoundException("No active round was found.");
    }

    const bet = await this.betRepository.findByRoundIdAndPlayerId(round.id, playerId);

    if (!bet) {
      throw new NotFoundException("No current-round bet was found for this player.");
    }

    return bet;
  }
}
