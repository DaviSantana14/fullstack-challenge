import { Injectable } from "@nestjs/common";
import type { BetRepository, CreateAcceptedBetInput } from "../../domain/bets/bet.repository";
import type { BetRecord } from "../../domain/bets/bet.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaBetRepository implements BetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByRoundIdAndPlayerId(
    roundId: string,
    playerId: string,
  ): Promise<BetRecord | null> {
    return this.prisma.bet.findUnique({
      where: {
        roundId_playerId: {
          roundId,
          playerId,
        },
      },
    });
  }

  async createAcceptedBet(input: CreateAcceptedBetInput): Promise<BetRecord> {
    return this.prisma.bet.create({
      data: {
        roundId: input.roundId,
        playerId: input.playerId,
        amountInCents: input.amountInCents,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });
  }
}
