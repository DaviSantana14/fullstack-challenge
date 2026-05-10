export interface BetRecord {
  id: string;
  roundId: string;
  playerId: string;
  amountInCents: bigint;
  status:
    | "PENDING"
    | "ACCEPTED"
    | "CASHOUT_PENDING"
    | "REJECTED"
    | "CASHED_OUT"
    | "LOST";
  autoCashoutMultiplierHundredths: number | null;
  cashoutMultiplierHundredths: number | null;
  payoutInCents: bigint | null;
  correlationId: string | null;
  cashoutCorrelationId: string | null;
  rejectionReason: string | null;
  placedAt: Date;
  acceptedAt: Date | null;
  cashedOutAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
