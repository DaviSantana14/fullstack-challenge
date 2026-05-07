import { Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import type { WalletRepository } from "../../domain/wallets/wallet.repository";
import type {
  WalletCreditResult,
  WalletDebitResult,
  WalletRecord,
  WalletTransactionRecord,
} from "../../domain/wallets/wallet.types";
import { PrismaService } from "../prisma/prisma.service";
import { randomUUID } from "crypto";

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

  async findTransactionByCorrelationId(
    correlationId: string,
  ): Promise<WalletTransactionRecord | null> {
    return this.prisma.walletTransaction.findUnique({
      where: { correlationId },
    });
  }

  async debitForBet(
    playerId: string,
    amountInCents: bigint,
    correlationId: string,
    externalReference: string,
  ): Promise<WalletDebitResult> {
    const existingTransaction = await this.findTransactionByCorrelationId(correlationId);

    if (existingTransaction) {
      return {
        status: "APPROVED",
        reason: "DUPLICATE_REQUEST",
        walletTransactionId: existingTransaction.id,
      };
    }

    const wallet = await this.findByPlayerId(playerId);

    if (!wallet) {
      return {
        status: "REJECTED",
        reason: "WALLET_NOT_FOUND",
        walletTransactionId: null,
      };
    }

    const insertedTransactions = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH updated_wallet AS (
        UPDATE wallets
        SET "balanceInCents" = "balanceInCents" - ${amountInCents},
            "updatedAt" = NOW()
        WHERE "playerId" = ${playerId}
          AND "balanceInCents" >= ${amountInCents}
        RETURNING id, "balanceInCents"
      ), inserted_transaction AS (
        INSERT INTO wallet_transactions (
          id,
          "walletId",
          "amountInCents",
          "balanceAfterInCents",
          type,
          reason,
          "correlationId",
          "externalReference",
          metadata,
          "createdAt"
        )
        SELECT
          ${randomUUID()},
          uw.id,
          ${amountInCents},
          uw."balanceInCents",
          'DEBIT'::"WalletTransactionType",
          'BET_RESERVED'::"WalletTransactionReason",
          ${correlationId},
          ${externalReference},
          NULL,
          NOW()
        FROM updated_wallet uw
        RETURNING id
      )
      SELECT id FROM inserted_transaction;
    `);

    if (insertedTransactions.length === 0) {
      return {
        status: "REJECTED",
        reason: "INSUFFICIENT_FUNDS",
        walletTransactionId: null,
      };
    }

    return {
      status: "APPROVED",
      reason: null,
      walletTransactionId: insertedTransactions[0].id,
    };
  }

  async creditForCashout(
    playerId: string,
    amountInCents: bigint,
    correlationId: string,
    externalReference: string,
  ): Promise<WalletCreditResult> {
    const existingTransaction = await this.findTransactionByCorrelationId(correlationId);

    if (existingTransaction) {
      return {
        status: "APPROVED",
        reason: "DUPLICATE_REQUEST",
        walletTransactionId: existingTransaction.id,
      };
    }

    const wallet = await this.findByPlayerId(playerId);

    if (!wallet) {
      return {
        status: "REJECTED",
        reason: "WALLET_NOT_FOUND",
        walletTransactionId: null,
      };
    }

    const insertedTransactions = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH updated_wallet AS (
        UPDATE wallets
        SET "balanceInCents" = "balanceInCents" + ${amountInCents},
            "updatedAt" = NOW()
        WHERE "playerId" = ${playerId}
        RETURNING id, "balanceInCents"
      ), inserted_transaction AS (
        INSERT INTO wallet_transactions (
          id,
          "walletId",
          "amountInCents",
          "balanceAfterInCents",
          type,
          reason,
          "correlationId",
          "externalReference",
          metadata,
          "createdAt"
        )
        SELECT
          ${randomUUID()},
          uw.id,
          ${amountInCents},
          uw."balanceInCents",
          'CREDIT'::"WalletTransactionType",
          'CASHOUT_PAYOUT'::"WalletTransactionReason",
          ${correlationId},
          ${externalReference},
          NULL,
          NOW()
        FROM updated_wallet uw
        RETURNING id
      )
      SELECT id FROM inserted_transaction;
    `);

    if (insertedTransactions.length === 0) {
      return {
        status: "REJECTED",
        reason: "WALLET_NOT_FOUND",
        walletTransactionId: null,
      };
    }

    return {
      status: "APPROVED",
      reason: null,
      walletTransactionId: insertedTransactions[0].id,
    };
  }
}
