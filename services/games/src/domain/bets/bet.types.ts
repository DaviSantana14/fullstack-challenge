export interface BetRecord {
  id: string;
  roundId: string;
  playerId: string;
  amountInCents: bigint;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CASHED_OUT" | "LOST" | "REFUNDED" | "VOIDED";
  cashoutMultiplierHundredths: number | null;
  payoutInCents: bigint | null;
  correlationId: string | null;
  rejectionReason: string | null;
  placedAt: Date;
  acceptedAt: Date | null;
  cashedOutAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
