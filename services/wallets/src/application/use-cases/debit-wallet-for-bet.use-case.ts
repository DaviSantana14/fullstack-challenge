import { Inject, Injectable } from "@nestjs/common";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../domain/wallets/wallet.repository";
import type { WalletDebitResult } from "../../domain/wallets/wallet.types";

@Injectable()
export class DebitWalletForBetUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(
    playerId: string,
    amountInCents: bigint,
    correlationId: string,
    externalReference: string,
  ): Promise<WalletDebitResult> {
    return this.walletRepository.debitForBet(
      playerId,
      amountInCents,
      correlationId,
      externalReference,
    );
  }
}
