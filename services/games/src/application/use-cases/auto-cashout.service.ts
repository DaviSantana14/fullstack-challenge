import { Inject, Injectable } from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import { randomUUID } from "crypto";
import { firstValueFrom, timeout } from "rxjs";
import { GameEventsService } from "../events/game-events.service";
import {
  BET_REPOSITORY,
  type BetRepository,
} from "../../domain/bets/bet.repository";
import type { BetRecord } from "../../domain/bets/bet.types";
import {
  WALLET_CREDIT_PATTERN,
  WALLETS_RMQ_CLIENT,
  type WalletCreditRequestMessage,
  type WalletCreditResponseMessage,
} from "../../infrastructure/messaging/wallet-debit.contract";

export interface ProcessAutoCashoutRoundInput {
  roundId: string;
  multiplierHundredths: number;
  crashPointHundredths: number;
}

@Injectable()
export class AutoCashoutService {
  constructor(
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
    @Inject(WALLETS_RMQ_CLIENT)
    private readonly walletsClient: ClientProxy,
    private readonly gameEvents: GameEventsService,
  ) {}

  async processRound(input: ProcessAutoCashoutRoundInput): Promise<BetRecord[]> {
    const candidates = await this.betRepository.findAutoCashoutCandidates(
      input.roundId,
      input.multiplierHundredths,
    );
    const processed = await Promise.all(
      candidates.map((bet) =>
        this.processBet(bet, input.crashPointHundredths),
      ),
    );

    return processed.filter((bet): bet is BetRecord => bet !== null);
  }

  private async processBet(
    bet: BetRecord,
    crashPointHundredths: number,
  ): Promise<BetRecord | null> {
    const targetMultiplierHundredths = bet.autoCashoutMultiplierHundredths;

    if (
      targetMultiplierHundredths === null ||
      targetMultiplierHundredths >= crashPointHundredths ||
      !bet.correlationId
    ) {
      return null;
    }

    const payoutInCents =
      (bet.amountInCents * BigInt(targetMultiplierHundredths)) / BigInt(100);
    const cashoutCorrelationId = randomUUID();

    const cashoutPendingBet = await this.betRepository.startCashout({
      correlationId: bet.correlationId,
      cashoutCorrelationId,
      cashoutMultiplierHundredths: targetMultiplierHundredths,
      payoutInCents,
    });

    if (!cashoutPendingBet || cashoutPendingBet.status !== "CASHOUT_PENDING") {
      return null;
    }

    const requestMessage: WalletCreditRequestMessage = {
      messageId: randomUUID(),
      correlationId: cashoutCorrelationId,
      betId: bet.id,
      roundId: bet.roundId,
      playerId: bet.playerId,
      amountInCents: payoutInCents.toString(),
      reason: "AUTO_CASHOUT_PAYOUT",
      occurredAt: new Date().toISOString(),
    };

    try {
      const response = await firstValueFrom(
        this.walletsClient
          .send<WalletCreditResponseMessage>(WALLET_CREDIT_PATTERN, requestMessage)
          .pipe(timeout(3000)),
      );

      if (response.status === "APPROVED") {
        const cashedOutBet =
          await this.betRepository.markCashoutPendingBetAsCashedOut(
            response.correlationId,
            new Date(response.processedAt),
          );

        if (cashedOutBet) {
          this.gameEvents.emit("bet:cashed_out", { bet: cashedOutBet });
        }

        return cashedOutBet;
      }

      const revertedBet =
        await this.betRepository.markCashoutPendingBetAsAcceptedIfRoundInProgress(
          response.correlationId,
          response.reason ?? "AUTO_CASHOUT_CREDIT_REJECTED",
        );

      if (revertedBet?.status === "ACCEPTED") {
        return revertedBet;
      }

      return this.betRepository.markCashoutPendingBetAsLostIfRoundCrashed(
        response.correlationId,
        new Date(response.processedAt),
      );
    } catch {
      return cashoutPendingBet;
    }
  }
}
