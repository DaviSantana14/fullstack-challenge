import { Injectable } from "@nestjs/common";
import type {
  CreateRoundInput,
  FindRoundHistoryPageInput,
  FindRoundHistoryPageResult,
  RoundRepository,
} from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(roundId: string): Promise<RoundRecord | null> {
    return this.prisma.round.findUnique({
      where: { id: roundId },
    });
  }

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
    const [result] = await this.prisma.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval('round_number_seq') AS "nextval"
    `;

    return Number(result.nextval);
  }

  async findLatestCrashedRound(): Promise<RoundRecord | null> {
    return this.prisma.round.findFirst({
      where: { status: "CRASHED" },
      orderBy: [{ roundNumber: "desc" }],
    });
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

  async setClientSeed(roundId: string, clientSeed: string): Promise<RoundRecord | null> {
    try {
      return await this.prisma.round.update({
        where: { id: roundId, clientSeed: null },
        data: { clientSeed },
      });
    } catch {
      return null;
    }
  }

  async findHistoryPage(input: FindRoundHistoryPageInput): Promise<FindRoundHistoryPageResult> {
    const rounds = await this.prisma.round.findMany({
      where: {
        status: "CRASHED",
        ...(input.cursor ? { roundNumber: { lt: input.cursor.roundNumber } } : {}),
      },
      orderBy: [{ roundNumber: "desc" }],
      take: input.limit + 1,
    });

    return {
      items: rounds.slice(0, input.limit),
      hasNextPage: rounds.length > input.limit,
    };
  }
}
