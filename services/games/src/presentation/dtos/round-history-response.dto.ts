import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { RoundRecord } from "../../domain/rounds/round.types";

export class RoundHistoryResponseDto {
  @ApiProperty({ example: "round_123" })
  id: string;

  @ApiProperty({ example: 42 })
  roundNumber: number;

  @ApiPropertyOptional({ example: 213, nullable: true, description: "Crash point in hundredths, e.g. 213 means 2.13x." })
  crashPointHundredths: number | null;

  @ApiPropertyOptional({ example: "2026-05-09T23:32:34.000Z", nullable: true, format: "date-time" })
  crashedAt: string | null;

  @ApiProperty({ example: "f9c5d7..." })
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
