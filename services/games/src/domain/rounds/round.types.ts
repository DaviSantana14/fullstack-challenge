export interface RoundRecord {
  id: string;
  roundNumber: number;
  status: "BETTING" | "IN_PROGRESS" | "CRASHED" | "SETTLED" | "CANCELLED";
  serverSeedHash: string;
  serverSeed: string | null;
  crashPointHundredths: number | null;
  bettingStartsAt: Date;
  bettingClosesAt: Date;
  startedAt: Date | null;
  crashedAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
