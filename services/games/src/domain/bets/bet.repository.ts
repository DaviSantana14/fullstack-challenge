import type { BetRecord } from "./bet.types";

export const BET_REPOSITORY = Symbol("BET_REPOSITORY");

export interface CreateAcceptedBetInput {
  roundId: string;
  playerId: string;
  amountInCents: bigint;
}

export interface BetRepository {
  findByRoundIdAndPlayerId(roundId: string, playerId: string): Promise<BetRecord | null>;
  createAcceptedBet(input: CreateAcceptedBetInput): Promise<BetRecord>;
}
