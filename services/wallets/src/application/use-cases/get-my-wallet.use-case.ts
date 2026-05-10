import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../domain/wallets/wallet.repository";
import type { WalletRecord } from "../../domain/wallets/wallet.types";

@Injectable()
export class GetMyWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(playerId: string): Promise<WalletRecord> {
    const wallet = await this.walletRepository.findByPlayerId(playerId);

    if (!wallet) {
      throw new NotFoundException("Wallet not found for this player.");
    }

    return wallet;
  }
}
