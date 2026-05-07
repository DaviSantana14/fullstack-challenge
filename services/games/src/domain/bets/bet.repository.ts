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

export interface StartCashoutInput {
  correlationId: string;
  cashoutCorrelationId: string;
  cashoutMultiplierHundredths: number;
  payoutInCents: bigint;
}

export interface BetRepository {
  findByRoundIdAndPlayerId(roundId: string, playerId: string): Promise<BetRecord | null>;
  findByCorrelationId(correlationId: string): Promise<BetRecord | null>;
  createPendingBet(input: CreatePendingBetInput): Promise<BetRecord>;
  createAcceptedBet(input: CreateAcceptedBetInput): Promise<BetRecord>;
  startCashout(input: StartCashoutInput): Promise<BetRecord | null>;
  findCurrentAcceptedBet(roundId: string, playerId: string): Promise<BetRecord | null>;
  findByCashoutCorrelationId(cashoutCorrelationId: string): Promise<BetRecord | null>;
  markCashoutPendingBetAsCashedOut(
    cashoutCorrelationId: string,
    cashedOutAt: Date,
  ): Promise<BetRecord | null>;
  markCashoutPendingBetAsAcceptedIfRoundInProgress(
    cashoutCorrelationId: string,
    rejectionReason: string,
  ): Promise<BetRecord | null>;
  markCashoutPendingBetAsLostIfRoundCrashed(
    cashoutCorrelationId: string,
    settledAt: Date,
  ): Promise<BetRecord | null>;
  markPendingBetAsAcceptedIfRoundActive(
    correlationId: string,
    acceptedAt: Date,
  ): Promise<BetRecord | null>;
  markPendingBetAsLostIfRoundCrashed(
    correlationId: string,
    settledAt: Date,
  ): Promise<BetRecord | null>;
  markPendingBetAsRejected(correlationId: string, rejectionReason: string): Promise<BetRecord | null>;
  markCashoutPendingBetsAsLost(roundId: string, settledAt: Date): Promise<number>;
  markAcceptedBetsAsLost(roundId: string, settledAt: Date): Promise<number>;
}
