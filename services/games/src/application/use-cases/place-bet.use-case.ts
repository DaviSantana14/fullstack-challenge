import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
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
export class PlaceBetUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
  ) {}

  async execute(playerId: string, amountInCentsInput: string): Promise<BetRecord> {
    const amountInCents = this.parseAmountInCents(amountInCentsInput);
    const round = await this.roundRepository.findCurrentBettingRound();

    if (!round) {
      throw new ConflictException("No active betting round is accepting bets.");
    }

    const existingBet = await this.betRepository.findByRoundIdAndPlayerId(
      round.id,
      playerId,
    );

    if (existingBet) {
      throw new ConflictException("Player already has a bet in the current round.");
    }

    try {
      return await this.betRepository.createAcceptedBet({
        roundId: round.id,
        playerId,
        amountInCents,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Player already has a bet in the current round.");
      }

      throw error;
    }
  }

  private parseAmountInCents(amountInCentsInput: string): bigint {
    const normalized = amountInCentsInput?.trim();

    if (!normalized || !/^\d+$/.test(normalized)) {
      throw new BadRequestException("amountInCents must be a positive integer string.");
    }

    const amountInCents = BigInt(normalized);

    if (amountInCents <= BigInt(0)) {
      throw new BadRequestException("amountInCents must be greater than zero.");
    }

    return amountInCents;
  }
}
