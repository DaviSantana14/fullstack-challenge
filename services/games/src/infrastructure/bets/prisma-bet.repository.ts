import { Injectable } from "@nestjs/common";
import type {
  BetRepository,
  CreateAcceptedBetInput,
  CreatePendingBetInput,
  FindPlayerBetsPageInput,
  FindPlayerBetsPageResult,
  StartCashoutInput,
} from "../../domain/bets/bet.repository";
import type { BetRecord } from "../../domain/bets/bet.types";
import { Prisma, $Enums } from "../../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaBetRepository implements BetRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toBetRecord(bet: unknown): BetRecord | null {
    return (bet as BetRecord | null) ?? null;
  }

  async findByRoundId(roundId: string): Promise<BetRecord[]> {
    const bets = await this.prisma.bet.findMany({
      where: { roundId },
      orderBy: [{ placedAt: "desc" }],
    });

    return bets as BetRecord[];
  }

  async findPlayerBetsPage(
    input: FindPlayerBetsPageInput,
  ): Promise<FindPlayerBetsPageResult> {
    const bets = await this.prisma.bet.findMany({
      where: {
        playerId: input.playerId,
        ...(input.cursor
          ? {
              OR: [
                { placedAt: { lt: input.cursor.placedAt } },
                {
                  placedAt: input.cursor.placedAt,
                  id: { lt: input.cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ placedAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
    });

    return {
      items: bets.slice(0, input.limit) as BetRecord[],
      hasNextPage: bets.length > input.limit,
    };
  }

  async findByCorrelationId(correlationId: string): Promise<BetRecord | null> {
    const bet = await this.prisma.bet.findUnique({
      where: { correlationId },
    });

    return this.toBetRecord(bet);
  }

  async findByRoundIdAndPlayerId(
    roundId: string,
    playerId: string,
  ): Promise<BetRecord | null> {
    const bet = await this.prisma.bet.findUnique({
      where: {
        roundId_playerId: {
          roundId,
          playerId,
        },
      },
    });

    return this.toBetRecord(bet);
  }

  async findCurrentAcceptedBet(roundId: string, playerId: string): Promise<BetRecord | null> {
    const bet = await this.prisma.bet.findFirst({
      where: {
        roundId,
        playerId,
        status: $Enums.BetStatus.ACCEPTED,
      },
    });

    return this.toBetRecord(bet);
  }

  async findByCashoutCorrelationId(
    cashoutCorrelationId: string,
  ): Promise<BetRecord | null> {
    const bet = await this.prisma.$queryRaw<BetRecord[]>(Prisma.sql`
      SELECT * FROM bets WHERE "cashoutCorrelationId" = ${cashoutCorrelationId} LIMIT 1
    `);

    return this.toBetRecord(bet[0] ?? null);
  }

  async createAcceptedBet(input: CreateAcceptedBetInput): Promise<BetRecord> {
    const bet = await this.prisma.bet.create({
      data: {
        roundId: input.roundId,
        playerId: input.playerId,
        amountInCents: input.amountInCents,
        status: $Enums.BetStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    return this.toBetRecord(bet) as BetRecord;
  }

  async createPendingBet(input: CreatePendingBetInput): Promise<BetRecord> {
    const bet = await this.prisma.bet.create({
      data: {
        roundId: input.roundId,
        playerId: input.playerId,
        amountInCents: input.amountInCents,
        status: $Enums.BetStatus.PENDING,
        correlationId: input.correlationId,
      },
    });

    return this.toBetRecord(bet) as BetRecord;
  }

  async startCashout(input: StartCashoutInput): Promise<BetRecord | null> {
    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE bets b
      SET status = 'CASHOUT_PENDING',
          "cashoutCorrelationId" = ${input.cashoutCorrelationId},
          "cashoutMultiplierHundredths" = ${input.cashoutMultiplierHundredths},
          "payoutInCents" = ${input.payoutInCents},
          "updatedAt" = NOW()
      FROM rounds r
      WHERE b."roundId" = r.id
        AND b."correlationId" = ${input.correlationId}
        AND b.status = 'ACCEPTED'
        AND r.status = 'IN_PROGRESS'
    `);

    if (updated === 0) {
      return this.findByCorrelationId(input.correlationId);
    }

    return this.findByCashoutCorrelationId(input.cashoutCorrelationId);
  }

  async markCashoutPendingBetAsCashedOut(
    cashoutCorrelationId: string,
    cashedOutAt: Date,
  ): Promise<BetRecord | null> {
    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE bets
      SET status = 'CASHED_OUT',
          "cashedOutAt" = ${cashedOutAt},
          "updatedAt" = NOW()
      WHERE "cashoutCorrelationId" = ${cashoutCorrelationId}
        AND status = 'CASHOUT_PENDING'
    `);

    if (updated === 0) {
      return this.findByCashoutCorrelationId(cashoutCorrelationId);
    }

    return this.findByCashoutCorrelationId(cashoutCorrelationId);
  }

  async markCashoutPendingBetAsAcceptedIfRoundInProgress(
    cashoutCorrelationId: string,
    rejectionReason: string,
  ): Promise<BetRecord | null> {
    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE bets b
      SET status = 'ACCEPTED',
          "rejectionReason" = ${rejectionReason},
          "cashoutCorrelationId" = NULL,
          "cashoutMultiplierHundredths" = NULL,
          "payoutInCents" = NULL,
          "updatedAt" = NOW()
      FROM rounds r
      WHERE b."roundId" = r.id
        AND b."cashoutCorrelationId" = ${cashoutCorrelationId}
        AND b.status = 'CASHOUT_PENDING'
        AND r.status = 'IN_PROGRESS'
    `);

    if (updated === 0) {
      return this.findByCashoutCorrelationId(cashoutCorrelationId);
    }

    return this.findByCashoutCorrelationId(cashoutCorrelationId);
  }

  async markCashoutPendingBetAsLostIfRoundCrashed(
    cashoutCorrelationId: string,
    settledAt: Date,
  ): Promise<BetRecord | null> {
    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE bets b
      SET status = 'LOST',
          "settledAt" = ${settledAt},
          "updatedAt" = NOW()
      FROM rounds r
      WHERE b."roundId" = r.id
        AND b."cashoutCorrelationId" = ${cashoutCorrelationId}
        AND b.status = 'CASHOUT_PENDING'
        AND r.status = 'CRASHED'
    `);

    if (updated === 0) {
      return this.findByCashoutCorrelationId(cashoutCorrelationId);
    }

    return this.findByCashoutCorrelationId(cashoutCorrelationId);
  }

  async markPendingBetAsAcceptedIfRoundActive(
    correlationId: string,
    acceptedAt: Date,
  ): Promise<BetRecord | null> {
    const result = await this.prisma.bet.updateMany({
      where: {
        correlationId,
        status: $Enums.BetStatus.PENDING,
        round: {
          is: {
            status: {
              in: [$Enums.RoundStatus.BETTING, $Enums.RoundStatus.IN_PROGRESS],
            },
          },
        },
      },
      data: {
        status: $Enums.BetStatus.ACCEPTED,
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
        status: $Enums.BetStatus.PENDING,
        round: {
          is: {
            status: $Enums.RoundStatus.CRASHED,
          },
        },
      },
      data: {
        status: $Enums.BetStatus.LOST,
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
        status: $Enums.BetStatus.PENDING,
      },
      data: {
        status: $Enums.BetStatus.REJECTED,
        rejectionReason,
      },
    });

    if (result.count === 0) {
      return this.findByCorrelationId(correlationId);
    }

    return this.findByCorrelationId(correlationId);
  }

  async markCashoutPendingBetsAsLost(roundId: string, settledAt: Date): Promise<number> {
    const result = await this.prisma.bet.updateMany({
      where: {
        roundId,
        status: $Enums.BetStatus.CASHOUT_PENDING,
      },
      data: {
        status: $Enums.BetStatus.LOST,
        settledAt,
      },
    });

    return result.count;
  }

  async markAcceptedBetsAsLost(roundId: string, settledAt: Date): Promise<number> {
    const result = await this.prisma.bet.updateMany({
      where: {
        roundId,
        status: $Enums.BetStatus.ACCEPTED,
      },
      data: {
        status: $Enums.BetStatus.LOST,
        settledAt,
      },
    });

    return result.count;
  }
}
