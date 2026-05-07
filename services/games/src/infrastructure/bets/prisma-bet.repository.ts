import { Injectable } from "@nestjs/common";
import type {
  BetRepository,
  CreateAcceptedBetInput,
  CreatePendingBetInput,
} from "../../domain/bets/bet.repository";
import type { BetRecord } from "../../domain/bets/bet.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaBetRepository implements BetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCorrelationId(correlationId: string): Promise<BetRecord | null> {
    return this.prisma.bet.findUnique({
      where: { correlationId },
    });
  }

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

  async createPendingBet(input: CreatePendingBetInput): Promise<BetRecord> {
    return this.prisma.bet.create({
      data: {
        roundId: input.roundId,
        playerId: input.playerId,
        amountInCents: input.amountInCents,
        status: "PENDING",
        correlationId: input.correlationId,
      },
    });
  }

  async markPendingBetAsAcceptedIfRoundActive(
    correlationId: string,
    acceptedAt: Date,
  ): Promise<BetRecord | null> {
    const result = await this.prisma.bet.updateMany({
      where: {
        correlationId,
        status: "PENDING",
        round: {
          is: {
            status: {
              in: ["BETTING", "IN_PROGRESS"],
            },
          },
        },
      },
      data: {
        status: "ACCEPTED",
        acceptedAt,
        rejectionReason: null,
      },
    });

    if (result.count === 0) {
      return this.findByCorrelationId(correlationId);
    }

    return this.findByCorrelationId(correlationId);
  }

  async markPendingBetAsLostIfRoundCrashed(
    correlationId: string,
    settledAt: Date,
  ): Promise<BetRecord | null> {
    const result = await this.prisma.bet.updateMany({
      where: {
        correlationId,
        status: "PENDING",
        round: {
          is: {
            status: "CRASHED",
          },
        },
      },
      data: {
        status: "LOST",
        settledAt,
      },
    });

    if (result.count === 0) {
      return this.findByCorrelationId(correlationId);
    }

    return this.findByCorrelationId(correlationId);
  }

  async markPendingBetAsRejected(
    correlationId: string,
    rejectionReason: string,
  ): Promise<BetRecord | null> {
    const result = await this.prisma.bet.updateMany({
      where: {
        correlationId,
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        rejectionReason,
      },
    });

    if (result.count === 0) {
      return this.findByCorrelationId(correlationId);
    }

    return this.findByCorrelationId(correlationId);
  }

  async markAcceptedBetsAsLost(roundId: string, settledAt: Date): Promise<number> {
    const result = await this.prisma.bet.updateMany({
      where: {
        roundId,
        status: "ACCEPTED",
      },
      data: {
        status: "LOST",
        settledAt,
      },
    });

    return result.count;
  }
}
