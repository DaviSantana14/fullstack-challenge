import { Controller, Inject } from "@nestjs/common";
import { Ctx, MessagePattern, Payload, RmqContext } from "@nestjs/microservices";
import type { ClientProxy } from "@nestjs/microservices";
import { timeout } from "rxjs";
import { DebitWalletForBetUseCase } from "../../application/use-cases/debit-wallet-for-bet.use-case";
import {
  GAMES_RESULTS_RMQ_CLIENT,
  WALLET_DEBIT_PATTERN,
  WALLET_DEBIT_RESULT_EVENT,
  type WalletDebitRequestMessage,
  type WalletDebitResultEventMessage,
  type WalletDebitResponseMessage,
} from "./wallet-debit.contract";

@Controller()
export class WalletDebitConsumer {
  constructor(
    private readonly debitWalletForBetUseCase: DebitWalletForBetUseCase,
    @Inject(GAMES_RESULTS_RMQ_CLIENT)
    private readonly gamesResultsClient: ClientProxy,
  ) {}

  @MessagePattern(WALLET_DEBIT_PATTERN)
  async handleDebitRequest(
    @Payload() message: WalletDebitRequestMessage,
    @Ctx() context: RmqContext,
  ): Promise<WalletDebitResponseMessage> {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      const result = await this.debitWalletForBetUseCase.execute(
        message.playerId,
        BigInt(message.amountInCents),
        message.correlationId,
        message.betId,
      );

      const response: WalletDebitResponseMessage = {
        correlationId: message.correlationId,
        betId: message.betId,
        status: result.status,
        reason: result.reason,
        walletTransactionId: result.walletTransactionId,
        processedAt: new Date().toISOString(),
      };

      channel.ack(originalMessage);

      // Fire-and-forget: emit event without blocking the RPC response.
      // If this fails, the bet is still settled — the event is best-effort.
      const eventMessage: WalletDebitResultEventMessage = { ...response };
      this.gamesResultsClient
        .emit(WALLET_DEBIT_RESULT_EVENT, eventMessage)
        .pipe(timeout(3000))
        .subscribe({
          error: (err) =>
            console.error(
              `[WalletDebitConsumer] Failed to emit ${WALLET_DEBIT_RESULT_EVENT}:`,
              err?.message ?? err,
            ),
        });

      return response;
    } catch (error) {
      channel.nack(originalMessage, false, true);
      throw error;
    }
  }
}
