import type { RoundRecord } from "./round.types";

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");

export interface CreateRoundInput {
  roundNumber: number;
  serverSeed: string;
  serverSeedHash: string;
  bettingStartsAt: Date;
  bettingClosesAt: Date;
}

export interface RoundRepository {
  findCurrentBettingRound(): Promise<RoundRecord | null>;
  getNextRoundNumber(): Promise<number>;
  createBettingRound(input: CreateRoundInput): Promise<RoundRecord>;
}
