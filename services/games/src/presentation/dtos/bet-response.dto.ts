import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { BetRecord } from "../../domain/bets/bet.types";

export class BetResponseDto {
  @ApiProperty({ example: "bet_123" })
  id: string;

  @ApiProperty({ example: "round_123" })
  roundId: string;

  @ApiProperty({ example: "player-1" })
  playerId: string;

  @ApiProperty({ example: "100", description: "Bet amount in cents, serialized as a string." })
  amountInCents: string;

  @ApiProperty({ example: "ACCEPTED", enum: ["PENDING", "ACCEPTED", "REJECTED", "CASHED_OUT", "LOST"] })
  status: string;

  @ApiPropertyOptional({ example: 150, nullable: true, description: "Cashout multiplier in hundredths, e.g. 150 means 1.50x." })
  cashoutMultiplierHundredths: number | null;

  @ApiPropertyOptional({ example: "150", nullable: true, description: "Payout amount in cents, serialized as a string." })
  payoutInCents: string | null;

  @ApiPropertyOptional({ example: "correlation-id", nullable: true })
  correlationId: string | null;

  @ApiPropertyOptional({ example: "INSUFFICIENT_FUNDS", nullable: true })
  rejectionReason: string | null;

  @ApiProperty({ example: "2026-05-09T23:32:18.643Z", format: "date-time" })
  placedAt: string;

  @ApiPropertyOptional({ example: "2026-05-09T23:32:19.000Z", nullable: true, format: "date-time" })
  acceptedAt: string | null;

  @ApiPropertyOptional({ example: "2026-05-09T23:32:22.000Z", nullable: true, format: "date-time" })
  cashedOutAt: string | null;

  @ApiPropertyOptional({ example: "2026-05-09T23:32:24.000Z", nullable: true, format: "date-time" })
  settledAt: string | null;

  @ApiProperty({ example: "2026-05-09T23:32:18.643Z", format: "date-time" })
  createdAt: string;

  @ApiProperty({ example: "2026-05-09T23:32:18.643Z", format: "date-time" })
  updatedAt: string;

  static fromBet(bet: BetRecord): BetResponseDto {
    return {
      id: bet.id,
      roundId: bet.roundId,
      playerId: bet.playerId,
      amountInCents: bet.amountInCents.toString(),
      status: bet.status,
      cashoutMultiplierHundredths: bet.cashoutMultiplierHundredths,
      payoutInCents: bet.payoutInCents?.toString() ?? null,
      correlationId: bet.correlationId,
      rejectionReason: bet.rejectionReason,
      placedAt: bet.placedAt.toISOString(),
      acceptedAt: bet.acceptedAt?.toISOString() ?? null,
      cashedOutAt: bet.cashedOutAt?.toISOString() ?? null,
      settledAt: bet.settledAt?.toISOString() ?? null,
      createdAt: bet.createdAt.toISOString(),
      updatedAt: bet.updatedAt.toISOString(),
    };
  }
}
