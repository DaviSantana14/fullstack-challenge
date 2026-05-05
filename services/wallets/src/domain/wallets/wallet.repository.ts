import type { WalletRecord } from "./wallet.types";

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");

export interface WalletRepository {
  findByPlayerId(playerId: string): Promise<WalletRecord | null>;
  createForPlayer(playerId: string): Promise<WalletRecord>;
}
