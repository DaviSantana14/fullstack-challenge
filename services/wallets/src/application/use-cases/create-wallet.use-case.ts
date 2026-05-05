import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../domain/wallets/wallet.repository";
import type { WalletRecord } from "../../domain/wallets/wallet.types";

@Injectable()
export class CreateWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(playerId: string): Promise<WalletRecord> {
    try {
      return await this.walletRepository.createForPlayer(playerId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Wallet already exists for this player.");
      }

      throw error;
    }
  }
}
