export interface WalletRecord {
  id: string;
  playerId: string;
  balanceInCents: bigint;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransactionRecord {
  id: string;
  walletId: string;
  amountInCents: bigint;
  balanceAfterInCents: bigint;
  type: "CREDIT" | "DEBIT";
  reason:
    | "WALLET_CREATED"
    | "BET_RESERVED"
    | "BET_REJECTED"
    | "CASHOUT_PAYOUT"
    | "ROUND_REFUND"
    | "MANUAL_ADJUSTMENT";
  correlationId: string | null;
  externalReference: string | null;
  createdAt: Date;
}

export interface WalletDebitResult {
  status: "APPROVED" | "REJECTED";
  reason: "INSUFFICIENT_FUNDS" | "WALLET_NOT_FOUND" | "DUPLICATE_REQUEST" | null;
  walletTransactionId: string | null;
}

export interface WalletCreditResult {
  status: "APPROVED" | "REJECTED";
  reason: "WALLET_NOT_FOUND" | "DUPLICATE_REQUEST" | null;
  walletTransactionId: string | null;
}
