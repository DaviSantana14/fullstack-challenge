import { describe, expect, mock, test } from "bun:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { WalletRepository } from "../../src/domain/wallets/wallet.repository";
import type {
  WalletCreditResult,
  WalletDebitResult,
  WalletRecord,
} from "../../src/domain/wallets/wallet.types";
import { CreateWalletUseCase } from "../../src/application/use-cases/create-wallet.use-case";
import { GetMyWalletUseCase } from "../../src/application/use-cases/get-my-wallet.use-case";
import { FundWalletForDevelopmentUseCase } from "../../src/application/use-cases/fund-wallet-for-development.use-case";
import { DebitWalletForBetUseCase } from "../../src/application/use-cases/debit-wallet-for-bet.use-case";
import { CreditWalletForCashoutUseCase } from "../../src/application/use-cases/credit-wallet-for-cashout.use-case";

const now = new Date("2026-05-09T12:00:00.000Z");

function makeWallet(overrides: Partial<WalletRecord> = {}): WalletRecord {
  return {
    id: "wallet-1",
    playerId: "player-1",
    balanceInCents: BigInt(10_000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeWalletRepository(
  overrides: Partial<Record<keyof WalletRepository, unknown>> = {},
): WalletRepository {
  return {
    findByPlayerId: mock(async () => null),
    createForPlayer: mock(async (playerId) => makeWallet({ playerId })),
    creditManualAdjustment: mock(async () => null),
    findTransactionByCorrelationId: mock(async () => null),
    debitForBet: mock(async () => ({
      status: "APPROVED",
      reason: null,
      walletTransactionId: "transaction-1",
    })),
    creditForCashout: mock(async () => ({
      status: "APPROVED",
      reason: null,
      walletTransactionId: "transaction-2",
    })),
    ...overrides,
  } as WalletRepository;
}

describe("wallet use cases", () => {
  test("CreateWalletUseCase creates a wallet for a player", async () => {
    const repository = makeWalletRepository();
    const useCase = new CreateWalletUseCase(repository);

    const wallet = await useCase.execute("player-1");

    expect(wallet.playerId).toBe("player-1");
    expect(repository.createForPlayer).toHaveBeenCalledWith("player-1");
  });

  test("GetMyWalletUseCase returns an existing wallet", async () => {
    const wallet = makeWallet();
    const repository = makeWalletRepository({
      findByPlayerId: mock(async () => wallet),
    });
    const useCase = new GetMyWalletUseCase(repository);

    await expect(useCase.execute("player-1")).resolves.toBe(wallet);
    expect(repository.findByPlayerId).toHaveBeenCalledWith("player-1");
  });

  test("GetMyWalletUseCase rejects when wallet is absent", async () => {
    const useCase = new GetMyWalletUseCase(makeWalletRepository());

    await expect(useCase.execute("missing-player")).rejects.toBeInstanceOf(NotFoundException);
  });

  test("FundWalletForDevelopmentUseCase credits a manual adjustment", async () => {
    const fundedWallet = makeWallet({ balanceInCents: BigInt(15_000) });
    const repository = makeWalletRepository({
      creditManualAdjustment: mock(async () => fundedWallet),
    });
    const useCase = new FundWalletForDevelopmentUseCase(repository);

    const wallet = await useCase.execute(" player-1 ", "5000");

    expect(wallet).toBe(fundedWallet);
    expect(repository.creditManualAdjustment).toHaveBeenCalledWith("player-1", BigInt(5000));
  });

  test("FundWalletForDevelopmentUseCase rejects invalid amount", async () => {
    const useCase = new FundWalletForDevelopmentUseCase(makeWalletRepository());

    await expect(useCase.execute("player-1", "1.00")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  test("FundWalletForDevelopmentUseCase auto-creates wallet when absent", async () => {
    const created = makeWallet({ playerId: "player-1", balanceInCents: BigInt(0) });
    const funded = makeWallet({ playerId: "player-1", balanceInCents: BigInt(100) });
    const creditMock = mock(async () => null);
    creditMock
      .mockImplementationOnce(async () => null) // first credit fails
      .mockImplementationOnce(async () => funded); // second credit succeeds

    const repository = makeWalletRepository({
      creditManualAdjustment: creditMock,
      createForPlayer: mock(async () => created),
    });
    const useCase = new FundWalletForDevelopmentUseCase(repository);

    const wallet = await useCase.execute("player-1", "100");
    expect(wallet).toBe(funded);
    expect(repository.createForPlayer).toHaveBeenCalledWith("player-1");
    expect(creditMock).toHaveBeenCalledTimes(2);
  });

  test("DebitWalletForBetUseCase delegates debit parameters", async () => {
    const result: WalletDebitResult = {
      status: "APPROVED",
      reason: null,
      walletTransactionId: "transaction-1",
    };
    const repository = makeWalletRepository({
      debitForBet: mock(async () => result),
    });
    const useCase = new DebitWalletForBetUseCase(repository);

    await expect(
      useCase.execute("player-1", BigInt(1000), "correlation-1", "bet-1"),
    ).resolves.toBe(result);
    expect(repository.debitForBet).toHaveBeenCalledWith(
      "player-1",
      BigInt(1000),
      "correlation-1",
      "bet-1",
    );
  });

  test("CreditWalletForCashoutUseCase delegates credit parameters", async () => {
    const result: WalletCreditResult = {
      status: "APPROVED",
      reason: null,
      walletTransactionId: "transaction-2",
    };
    const repository = makeWalletRepository({
      creditForCashout: mock(async () => result),
    });
    const useCase = new CreditWalletForCashoutUseCase(repository);

    await expect(
      useCase.execute("player-1", BigInt(2500), "correlation-2", "bet-1"),
    ).resolves.toBe(result);
    expect(repository.creditForCashout).toHaveBeenCalledWith(
      "player-1",
      BigInt(2500),
      "correlation-2",
      "bet-1",
    );
  });
});
