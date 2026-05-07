import type { WalletDebitResult, WalletRecord, WalletTransactionRecord } from "./wallet.types";

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");

export interface WalletRepository {
  findByPlayerId(playerId: string): Promise<WalletRecord | null>;
  createForPlayer(playerId: string): Promise<WalletRecord>;
  findTransactionByCorrelationId(correlationId: string): Promise<WalletTransactionRecord | null>;
  debitForBet(
    playerId: string,
    amountInCents: bigint,
    correlationId: string,
    externalReference: string,
  ): Promise<WalletDebitResult>;
}
