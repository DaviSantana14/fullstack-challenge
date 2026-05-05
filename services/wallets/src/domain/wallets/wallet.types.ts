export interface WalletRecord {
  id: string;
  playerId: string;
  balanceInCents: bigint;
  createdAt: Date;
  updatedAt: Date;
}
