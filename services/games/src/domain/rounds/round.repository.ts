import type { RoundRecord } from "./round.types";

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");

export interface CreateRoundInput {
  roundNumber: number;
  serverSeed: string;
  serverSeedHash: string;
  bettingStartsAt: Date;
  bettingClosesAt: Date;
}

export interface RoundPaginationCursor {
  roundNumber: number;
}

export interface FindRoundHistoryPageInput {
  limit: number;
  cursor?: RoundPaginationCursor;
}

export interface FindRoundHistoryPageResult {
  items: RoundRecord[];
  hasNextPage: boolean;
}

export interface RoundRepository {
  findById(roundId: string): Promise<RoundRecord | null>;
  findCurrentBettingRound(): Promise<RoundRecord | null>;
  findCurrentActiveRound(): Promise<RoundRecord | null>;
  findLatestCrashedRound(): Promise<RoundRecord | null>;
  getNextRoundNumber(): Promise<number>;
  createBettingRound(input: CreateRoundInput): Promise<RoundRecord>;
  startRound(roundId: string, startedAt: Date): Promise<RoundRecord>;
  crashRound(roundId: string, crashPointHundredths: number, crashedAt: Date): Promise<RoundRecord>;
  setClientSeed(roundId: string, clientSeed: string): Promise<RoundRecord | null>;
  findHistoryPage(input: FindRoundHistoryPageInput): Promise<FindRoundHistoryPageResult>;
}
