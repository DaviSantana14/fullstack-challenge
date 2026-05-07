import type { RoundRecord } from "../../domain/rounds/round.types";

export class RoundHistoryResponseDto {
  id: string;
  roundNumber: number;
  crashPointHundredths: number | null;
  crashedAt: string | null;
  serverSeedHash: string;

  static fromRound(round: RoundRecord): RoundHistoryResponseDto {
    return {
      id: round.id,
      roundNumber: round.roundNumber,
      crashPointHundredths: round.crashPointHundredths,
      crashedAt: round.crashedAt?.toISOString() ?? null,
      serverSeedHash: round.serverSeedHash,
    };
  }
}
