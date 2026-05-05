import { Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import type { WalletRepository } from "../../domain/wallets/wallet.repository";
import type { WalletRecord } from "../../domain/wallets/wallet.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPlayerId(playerId: string): Promise<WalletRecord | null> {
    return this.prisma.wallet.findUnique({
      where: { playerId },
    });
  }

  async createForPlayer(playerId: string): Promise<WalletRecord> {
    const amountInCents = BigInt(0);

    return this.prisma.wallet.create({
      data: {
        playerId,
        balanceInCents: amountInCents,
        transactions: {
          create: {
            amountInCents,
            balanceAfterInCents: amountInCents,
            type: "CREDIT",
            reason: "WALLET_CREATED",
            metadata: Prisma.JsonNull,
          },
        },
      },
    });
  }
}
