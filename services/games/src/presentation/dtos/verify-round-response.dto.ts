export class VerifyRoundResponseDto {
  roundId: string;
  roundNumber: number;
  isValid: boolean;
  calculatedCrashPointHundredths: number;
  serverSeedHash: string;
  serverSeed: string;
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
