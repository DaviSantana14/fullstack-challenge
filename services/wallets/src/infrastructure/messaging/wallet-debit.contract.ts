export const WALLET_DEBIT_PATTERN = "wallet.debit.request";
export const WALLET_DEBIT_RESULT_EVENT = "wallet.debit.result";
export const GAMES_RESULTS_RMQ_CLIENT = "GAMES_RESULTS_RMQ_CLIENT";

export interface WalletDebitRequestMessage {
  messageId: string;
  correlationId: string;
  betId: string;
  roundId: string;
  playerId: string;
  amountInCents: string;
  occurredAt: string;
}

export interface WalletDebitResponseMessage {
  correlationId: string;
  betId: string;
  status: "APPROVED" | "REJECTED";
  reason: "INSUFFICIENT_FUNDS" | "WALLET_NOT_FOUND" | "DUPLICATE_REQUEST" | null;
  walletTransactionId: string | null;
  processedAt: string;
}

export interface WalletDebitResultEventMessage extends WalletDebitResponseMessage {}
