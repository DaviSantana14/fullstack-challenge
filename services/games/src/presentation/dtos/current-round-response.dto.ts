import type { RoundRecord } from "../../domain/rounds/round.types";

export class CurrentRoundResponseDto {
  id: string;
  roundNumber: number;
  status: string;
  serverSeedHash: string;
  serverSeed: string | null;
  crashPointHundredths: number | null;
  bettingStartsAt: string;
  bettingClosesAt: string;
  startedAt: string | null;
  crashedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;

  static fromRound(round: RoundRecord): CurrentRoundResponseDto {
    return {
      id: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      serverSeed: round.status === "CRASHED" ? round.serverSeed : null,
      crashPointHundredths: round.crashPointHundredths,
      bettingStartsAt: round.bettingStartsAt.toISOString(),
      bettingClosesAt: round.bettingClosesAt.toISOString(),
      startedAt: round.startedAt?.toISOString() ?? null,
      crashedAt: round.crashedAt?.toISOString() ?? null,
      settledAt: round.settledAt?.toISOString() ?? null,
      createdAt: round.createdAt.toISOString(),
      updatedAt: round.updatedAt.toISOString(),
    };
  }
}
