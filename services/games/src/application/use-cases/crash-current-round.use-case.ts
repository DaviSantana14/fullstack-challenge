import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { GameEventsService } from "../events/game-events.service";
import { calculateCrashPoint } from "../../domain/provably-fair/provably-fair.service";
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
    private readonly gameEvents: GameEventsService,
  ) {}

  async execute(): Promise<RoundRecord> {
    const round = await this.roundRepository.findCurrentActiveRound();

    if (!round || round.status !== "IN_PROGRESS") {
      throw new ConflictException("No in-progress round is available to crash.");
    }

    if (!round.serverSeed) {
      throw new ConflictException("Round does not have a server seed.");
    }

    const crashPointHundredths = calculateCrashPoint(round.serverSeed, round.clientSeed);
    const crashedAt = new Date();
    const crashedRound = await this.roundRepository.crashRound(
      round.id,
      crashPointHundredths,
      crashedAt,
    );

    await this.betRepository.markAcceptedBetsAsLost(round.id, crashedAt);
    await this.betRepository.markCashoutPendingBetsAsLost(round.id, crashedAt);

    this.gameEvents.emit("round:crashed", {
      round: crashedRound,
      serverTime: new Date().toISOString(),
    });

    return crashedRound;
  }
}
