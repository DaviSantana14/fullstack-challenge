import { Controller } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import {
  WALLET_DEBIT_RESULT_EVENT,
  type WalletDebitResultEventMessage,
} from "./wallet-debit.contract";
import { BET_REPOSITORY, type BetRepository } from "../../domain/bets/bet.repository";
import { Inject } from "@nestjs/common";
import { GameEventsService } from "../../application/events/game-events.service";

@Controller()
export class WalletDebitResultConsumer {
  constructor(
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
    private readonly gameEvents: GameEventsService,
  ) {}

  @EventPattern(WALLET_DEBIT_RESULT_EVENT)
  async handleResult(
    @Payload() message: WalletDebitResultEventMessage,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      const bet = await this.betRepository.findByCorrelationId(message.correlationId);

      if (!bet) {
        channel.ack(originalMessage);
        return;
      }

      if (message.status === "APPROVED") {
        const processedAt = new Date(message.processedAt);
        const acceptedBet = await this.betRepository.markPendingBetAsAcceptedIfRoundActive(
          message.correlationId,
          processedAt,
        );

        if (acceptedBet?.status !== "ACCEPTED") {
          const lostBet = await this.betRepository.markPendingBetAsLostIfRoundCrashed(
            message.correlationId,
            processedAt,
          );

          if (lostBet?.status !== "LOST") {
            await this.betRepository.markPendingBetAsRejected(
              message.correlationId,
              "ROUND_CLOSED",
              );
          }
        } else {
          this.gameEvents.emit("bet:placed", { bet: acceptedBet });
        }
      } else {
        await this.betRepository.markPendingBetAsRejected(
          message.correlationId,
          message.reason ?? "WALLET_REJECTED",
        );
      }

      channel.ack(originalMessage);
    } catch (error) {
      channel.nack(originalMessage, false, true);
      throw error;
    }
  }
}
