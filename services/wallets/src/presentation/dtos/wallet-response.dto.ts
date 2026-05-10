import { ApiProperty } from "@nestjs/swagger";
import type { WalletRecord } from "../../domain/wallets/wallet.types";

export class WalletResponseDto {
  @ApiProperty({ example: "wallet_123" })
  id: string;

  @ApiProperty({ example: "player-1" })
  playerId: string;

  @ApiProperty({ example: "10000", description: "Balance in cents, serialized as a string." })
  balanceInCents: string;

  @ApiProperty({ example: "2026-05-09T23:32:18.643Z", format: "date-time" })
  createdAt: string;

  @ApiProperty({ example: "2026-05-09T23:32:18.643Z", format: "date-time" })
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
