import { Inject, Injectable } from "@nestjs/common";
import { WALLET_REPOSITORY, type WalletRepository } from "../../domain/wallets/wallet.repository";
import type { WalletCreditResult } from "../../domain/wallets/wallet.types";

@Injectable()
export class CreditWalletForCashoutUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(
    playerId: string,
    amountInCents: bigint,
    correlationId: string,
    externalReference: string,
  ): Promise<WalletCreditResult> {
    return this.walletRepository.creditForCashout(
      playerId,
      amountInCents,
      correlationId,
      externalReference,
    );
  }
}
