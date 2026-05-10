import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import { randomUUID } from "crypto";
import { firstValueFrom, timeout } from "rxjs";
import { GameEventsService } from "../events/game-events.service";
import { getMultiplierHundredths } from "../../domain/multiplier/multiplier.service";
import { calculateCrashPoint } from "../../domain/provably-fair/provably-fair.service";
import { BET_REPOSITORY, type BetRepository } from "../../domain/bets/bet.repository";
import type { BetRecord } from "../../domain/bets/bet.types";
import { ROUND_REPOSITORY, type RoundRepository } from "../../domain/rounds/round.repository";
import {
  WALLET_CREDIT_PATTERN,
  WALLETS_RMQ_CLIENT,
  type WalletCreditRequestMessage,
  type WalletCreditResponseMessage,
} from "../../infrastructure/messaging/wallet-debit.contract";

@Injectable()
export class CashoutCurrentBetUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
    @Inject(WALLETS_RMQ_CLIENT)
    private readonly walletsClient: ClientProxy,
    private readonly gameEvents: GameEventsService,
  ) {}

  async execute(playerId: string): Promise<BetRecord> {
    const round = await this.roundRepository.findCurrentActiveRound();

    if (!round || round.status !== "IN_PROGRESS" || !round.startedAt) {
      throw new ConflictException("No in-progress round is available for cashout.");
    }

    const bet = await this.betRepository.findCurrentAcceptedBet(round.id, playerId);

    if (!bet) {
      throw new ConflictException("No accepted current-round bet is available for cashout.");
    }

    const cashoutMultiplierHundredths = this.getServerCashoutMultiplierHundredths(round.startedAt);

    if (!round.serverSeed) {
      throw new ConflictException("Round does not have a server seed.");
    }
    const crashPointHundredths = calculateCrashPoint(round.serverSeed, round.clientSeed);
    if (cashoutMultiplierHundredths >= crashPointHundredths) {
      throw new ConflictException("The round has already crashed.");
    }

    const payoutInCents =
      (bet.amountInCents * BigInt(cashoutMultiplierHundredths)) / BigInt(100);
    const cashoutCorrelationId = randomUUID();

    const cashoutPendingBet = await this.betRepository.startCashout({
      correlationId: bet.correlationId as string,
      cashoutCorrelationId,
      cashoutMultiplierHundredths,
      payoutInCents,
    });

    if (!cashoutPendingBet || cashoutPendingBet.status !== "CASHOUT_PENDING") {
      throw new ConflictException("Failed to reserve bet for cashout.");
    }

    const requestMessage: WalletCreditRequestMessage = {
      messageId: randomUUID(),
      correlationId: cashoutCorrelationId,
      betId: bet.id,
      roundId: round.id,
      playerId,
      amountInCents: payoutInCents.toString(),
      reason: "CASHOUT_PAYOUT",
      occurredAt: new Date().toISOString(),
    };

    try {
      const response = await firstValueFrom(
        this.walletsClient
          .send<WalletCreditResponseMessage>(WALLET_CREDIT_PATTERN, requestMessage)
          .pipe(timeout(3000)),
      );

      if (response.status === "APPROVED") {
        const cashedOutBet = (await this.betRepository.markCashoutPendingBetAsCashedOut(
          response.correlationId,
          new Date(response.processedAt),
        )) as BetRecord;

        this.gameEvents.emit("bet:cashed_out", { bet: cashedOutBet });
        return cashedOutBet;
      }

      const revertedBet =
        await this.betRepository.markCashoutPendingBetAsAcceptedIfRoundInProgress(
          response.correlationId,
          response.reason ?? "CASHOUT_CREDIT_REJECTED",
        );

      if (revertedBet?.status === "ACCEPTED") {
        return revertedBet;
      }

      const lostBet = await this.betRepository.markCashoutPendingBetAsLostIfRoundCrashed(
        response.correlationId,
        new Date(response.processedAt),
      );

      return (lostBet ?? cashoutPendingBet) as BetRecord;
    } catch {
      return cashoutPendingBet;
    }
  }

  private getServerCashoutMultiplierHundredths(startedAt: Date): number {
    const elapsedMs = Math.max(0, Date.now() - startedAt.getTime());

    return getMultiplierHundredths(elapsedMs);
  }
}
