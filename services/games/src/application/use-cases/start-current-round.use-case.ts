import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { GameEventsService } from "../events/game-events.service";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";

@Injectable()
export class StartCurrentRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    private readonly gameEvents: GameEventsService,
  ) {}

  async execute(): Promise<RoundRecord> {
    const round = await this.roundRepository.findCurrentBettingRound();

    if (!round) {
      throw new ConflictException("No betting round is available to start.");
    }

    const startedRound = await this.roundRepository.startRound(round.id, new Date());

    this.gameEvents.emit("round:started", {
      round: startedRound,
      serverTime: new Date().toISOString(),
    });

    return startedRound;
  }
}
