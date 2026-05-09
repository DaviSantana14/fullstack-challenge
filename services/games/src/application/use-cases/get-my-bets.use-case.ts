import { Inject, Injectable } from "@nestjs/common";
import {
  BET_REPOSITORY,
  type BetRepository,
} from "../../domain/bets/bet.repository";
import type { BetRecord } from "../../domain/bets/bet.types";

const DEFAULT_MY_BETS_LIMIT = 20;

@Injectable()
export class GetMyBetsUseCase {
  constructor(
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
  ) {}

  async execute(playerId: string): Promise<BetRecord[]> {
    return this.betRepository.findByPlayerId(playerId, DEFAULT_MY_BETS_LIMIT);
  }
}
