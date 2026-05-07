import { Controller, Inject } from "@nestjs/common";
import { Ctx, MessagePattern, Payload, RmqContext } from "@nestjs/microservices";
import type { ClientProxy } from "@nestjs/microservices";
import { timeout } from "rxjs";
import { CreditWalletForCashoutUseCase } from "../../application/use-cases/credit-wallet-for-cashout.use-case";
import {
  GAMES_RESULTS_RMQ_CLIENT,
  WALLET_CREDIT_PATTERN,
  WALLET_CREDIT_RESULT_EVENT,
  type WalletCreditRequestMessage,
  type WalletCreditResponseMessage,
  type WalletCreditResultEventMessage,
} from "./wallet-debit.contract";

@Controller()
export class WalletCreditConsumer {
  constructor(
    private readonly creditWalletForCashoutUseCase: CreditWalletForCashoutUseCase,
    @Inject(GAMES_RESULTS_RMQ_CLIENT)
    private readonly gamesResultsClient: ClientProxy,
  ) {}

  @MessagePattern(WALLET_CREDIT_PATTERN)
  async handleCreditRequest(
    @Payload() message: WalletCreditRequestMessage,
    @Ctx() context: RmqContext,
  ): Promise<WalletCreditResponseMessage> {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      const result = await this.creditWalletForCashoutUseCase.execute(
        message.playerId,
        BigInt(message.amountInCents),
        message.correlationId,
        message.betId,
      );

      const response: WalletCreditResponseMessage = {
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
      const eventMessage: WalletCreditResultEventMessage = { ...response };
      this.gamesResultsClient
        .emit(WALLET_CREDIT_RESULT_EVENT, eventMessage)
        .pipe(timeout(3000))
        .subscribe({
          error: (err) =>
            console.error(
              `[WalletCreditConsumer] Failed to emit ${WALLET_CREDIT_RESULT_EVENT}:`,
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
