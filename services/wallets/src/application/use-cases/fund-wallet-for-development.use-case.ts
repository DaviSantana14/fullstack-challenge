import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../domain/wallets/wallet.repository";
import type { WalletRecord } from "../../domain/wallets/wallet.types";

@Injectable()
export class FundWalletForDevelopmentUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(playerId: string, amountInCentsInput: string): Promise<WalletRecord> {
    const normalizedPlayerId = playerId?.trim();

    if (!normalizedPlayerId) {
      throw new BadRequestException("playerId is required.");
    }

    const amountInCents = this.parseAmountInCents(amountInCentsInput);
    let wallet = await this.walletRepository.creditManualAdjustment(
      normalizedPlayerId,
      amountInCents,
    );

    if (!wallet) {
      try {
        wallet = await this.walletRepository.createForPlayer(normalizedPlayerId);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          wallet = await this.walletRepository.creditManualAdjustment(
            normalizedPlayerId,
            amountInCents,
          );
          if (!wallet) {
            throw new NotFoundException("Wallet was created but funding failed.");
          }
          return wallet;
        }
        throw error;
      }

      wallet = await this.walletRepository.creditManualAdjustment(
        normalizedPlayerId,
        amountInCents,
      );
      if (!wallet) {
        throw new NotFoundException("Wallet was created but funding failed.");
      }
    }

    return wallet;
  }

  private parseAmountInCents(amountInCentsInput: string): bigint {
    const normalized = amountInCentsInput?.trim();

    if (!normalized || !/^\d+$/.test(normalized)) {
      throw new BadRequestException("amountInCents must be a positive integer string.");
    }

    const amountInCents = BigInt(normalized);

    if (amountInCents <= BigInt(0)) {
      throw new BadRequestException("amountInCents must be greater than zero.");
    }

    return amountInCents;
  }
}
