import type { BetRecord } from "../../domain/bets/bet.types";

export class BetResponseDto {
  id: string;
  roundId: string;
  playerId: string;
  amountInCents: string;
  status: string;
  cashoutMultiplierHundredths: number | null;
  payoutInCents: string | null;
  correlationId: string | null;
  rejectionReason: string | null;
  placedAt: string;
  acceptedAt: string | null;
  cashedOutAt: string | null;
  settledAt: string | null;
  createdAt: string;
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
