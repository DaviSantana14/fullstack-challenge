import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class VerifyRoundResponseDto {
  @ApiProperty({ example: "round_123" })
  roundId: string;

  @ApiProperty({ example: 42 })
  roundNumber: number;

  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiProperty({ example: 213, description: "Calculated crash point in hundredths, e.g. 213 means 2.13x." })
  calculatedCrashPointHundredths: number;

  @ApiProperty({ example: "f9c5d7..." })
  serverSeedHash: string;

  @ApiProperty({ example: "server-seed" })
  serverSeed: string;

  @ApiPropertyOptional({ example: 213, nullable: true, description: "Persisted crash point in hundredths, e.g. 213 means 2.13x." })
  actualCrashPointHundredths: number | null;

  static fromResult(result: {
    round: { id: string; roundNumber: number; crashPointHundredths: number | null };
    isValid: boolean;
    calculatedCrashPointHundredths: number;
    serverSeedHash: string;
    serverSeed: string;
  }): VerifyRoundResponseDto {
    return {
      roundId: result.round.id,
      roundNumber: result.round.roundNumber,
      isValid: result.isValid,
      calculatedCrashPointHundredths: result.calculatedCrashPointHundredths,
      serverSeedHash: result.serverSeedHash,
      serverSeed: result.serverSeed,
      actualCrashPointHundredths: result.round.crashPointHundredths,
    };
  }
}
