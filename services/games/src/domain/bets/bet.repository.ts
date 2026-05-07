import type { BetRecord } from "./bet.types";

export const BET_REPOSITORY = Symbol("BET_REPOSITORY");

export interface CreateAcceptedBetInput {
  roundId: string;
  playerId: string;
  amountInCents: bigint;
}

export interface CreatePendingBetInput {
  roundId: string;
  playerId: string;
  amountInCents: bigint;
  correlationId: string;
}

export interface BetRepository {
  findByRoundIdAndPlayerId(roundId: string, playerId: string): Promise<BetRecord | null>;
  findByCorrelationId(correlationId: string): Promise<BetRecord | null>;
  createPendingBet(input: CreatePendingBetInput): Promise<BetRecord>;
  createAcceptedBet(input: CreateAcceptedBetInput): Promise<BetRecord>;
  markPendingBetAsAcceptedIfRoundActive(
    correlationId: string,
    acceptedAt: Date,
  ): Promise<BetRecord | null>;
  markPendingBetAsLostIfRoundCrashed(
    correlationId: string,
    settledAt: Date,
  ): Promise<BetRecord | null>;
  markPendingBetAsRejected(correlationId: string, rejectionReason: string): Promise<BetRecord | null>;
  markAcceptedBetsAsLost(roundId: string, settledAt: Date): Promise<number>;
}
