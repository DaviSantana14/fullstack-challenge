import { Controller, Inject } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { GameEventsService } from "../../application/events/game-events.service";
import { BET_REPOSITORY, type BetRepository } from "../../domain/bets/bet.repository";
import {
  WALLET_CREDIT_RESULT_EVENT,
  type WalletCreditResultEventMessage,
} from "./wallet-debit.contract";

@Controller()
export class WalletCreditResultConsumer {
  constructor(
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
    private readonly gameEvents: GameEventsService,
  ) {}

  @EventPattern(WALLET_CREDIT_RESULT_EVENT)
  async handleResult(
    @Payload() message: WalletCreditResultEventMessage,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      if (message.status === "APPROVED") {
        const cashedOutBet = await this.betRepository.markCashoutPendingBetAsCashedOut(
          message.correlationId,
          new Date(message.processedAt),
        );

        if (cashedOutBet?.status === "CASHED_OUT") {
          this.gameEvents.emit("bet:cashed_out", { bet: cashedOutBet });
        }
      } else {
        const revertedBet =
          await this.betRepository.markCashoutPendingBetAsAcceptedIfRoundInProgress(
            message.correlationId,
            message.reason ?? "CASHOUT_CREDIT_REJECTED",
          );

        if (revertedBet?.status !== "ACCEPTED") {
          await this.betRepository.markCashoutPendingBetAsLostIfRoundCrashed(
            message.correlationId,
            new Date(message.processedAt),
          );
        }
      }

      channel.ack(originalMessage);
    } catch (error) {
      channel.nack(originalMessage, false, true);
      throw error;
    }
  }
}
