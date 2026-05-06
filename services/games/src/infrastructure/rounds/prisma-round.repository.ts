import { Injectable } from "@nestjs/common";
import type { CreateRoundInput, RoundRepository } from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentBettingRound(): Promise<RoundRecord | null> {
    return this.prisma.round.findFirst({
      where: { status: "BETTING" },
      orderBy: [{ roundNumber: "desc" }],
    });
  }

  async findCurrentActiveRound(): Promise<RoundRecord | null> {
    return this.prisma.round.findFirst({
      where: {
        status: {
          in: ["BETTING", "IN_PROGRESS"],
        },
      },
      orderBy: [{ roundNumber: "desc" }],
    });
  }

  async getNextRoundNumber(): Promise<number> {
    const result = await this.prisma.round.aggregate({
      _max: { roundNumber: true },
    });

    return (result._max.roundNumber ?? 0) + 1;
  }

  async createBettingRound(input: CreateRoundInput): Promise<RoundRecord> {
    return this.prisma.round.create({
      data: {
        roundNumber: input.roundNumber,
        status: "BETTING",
        serverSeed: input.serverSeed,
        serverSeedHash: input.serverSeedHash,
        bettingStartsAt: input.bettingStartsAt,
        bettingClosesAt: input.bettingClosesAt,
      },
    });
  }

  async startRound(roundId: string, startedAt: Date): Promise<RoundRecord> {
    return this.prisma.round.update({
      where: { id: roundId },
      data: {
        status: "IN_PROGRESS",
        startedAt,
      },
    });
  }

  async crashRound(
    roundId: string,
    crashPointHundredths: number,
    crashedAt: Date,
  ): Promise<RoundRecord> {
    return this.prisma.round.update({
      where: { id: roundId },
      data: {
        status: "CRASHED",
        crashPointHundredths,
        crashedAt,
      },
    });
  }
}
