import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { RoundRecord } from "../../domain/rounds/round.types";

export class CurrentRoundResponseDto {
  @ApiProperty({ example: "round_123" })
  id: string;

  @ApiProperty({ example: 42 })
  roundNumber: number;

  @ApiProperty({ example: "BETTING", enum: ["BETTING", "IN_PROGRESS", "CRASHED", "SETTLED"] })
  status: string;

  @ApiProperty({ example: "f9c5d7..." })
  serverSeedHash: string;

  @ApiPropertyOptional({ example: "server-seed", nullable: true })
  serverSeed: string | null;

  @ApiPropertyOptional({ example: 213, nullable: true, description: "Crash point in hundredths, e.g. 213 means 2.13x." })
  crashPointHundredths: number | null;

  @ApiProperty({ example: "2026-05-09T23:32:18.643Z", format: "date-time" })
  bettingStartsAt: string;

  @ApiProperty({ example: "2026-05-09T23:32:28.643Z", format: "date-time" })
  bettingClosesAt: string;

  @ApiPropertyOptional({ example: "2026-05-09T23:32:29.000Z", nullable: true, format: "date-time" })
  startedAt: string | null;

  @ApiPropertyOptional({ example: "2026-05-09T23:32:34.000Z", nullable: true, format: "date-time" })
  crashedAt: string | null;

  @ApiPropertyOptional({ example: "2026-05-09T23:32:35.000Z", nullable: true, format: "date-time" })
  settledAt: string | null;

  @ApiProperty({ example: "2026-05-09T23:32:18.643Z", format: "date-time" })
  createdAt: string;

  @ApiProperty({ example: "2026-05-09T23:32:18.643Z", format: "date-time" })
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
