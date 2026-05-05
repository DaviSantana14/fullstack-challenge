import type { WalletRecord } from "../../domain/wallets/wallet.types";

export class WalletResponseDto {
  id: string;
  playerId: string;
  balanceInCents: string;
  createdAt: string;
  updatedAt: string;

  static fromWallet(wallet: WalletRecord): WalletResponseDto {
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balanceInCents: wallet.balanceInCents.toString(),
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }
}
