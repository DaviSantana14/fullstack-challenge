import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { CreateWalletUseCase } from "./application/use-cases/create-wallet.use-case";
import { CreditWalletForCashoutUseCase } from "./application/use-cases/credit-wallet-for-cashout.use-case";
import { DebitWalletForBetUseCase } from "./application/use-cases/debit-wallet-for-bet.use-case";
import { FundWalletForDevelopmentUseCase } from "./application/use-cases/fund-wallet-for-development.use-case";
import { GetMyWalletUseCase } from "./application/use-cases/get-my-wallet.use-case";
import { GAMES_RESULTS_RMQ_CLIENT } from "./infrastructure/messaging/wallet-debit.contract";
import { WalletCreditConsumer } from "./infrastructure/messaging/wallet-credit.consumer";
import { WalletDebitConsumer } from "./infrastructure/messaging/wallet-debit.consumer";
import { WALLET_REPOSITORY } from "./domain/wallets/wallet.repository";
import { PrismaService } from "./infrastructure/prisma/prisma.service";
import { PrismaWalletRepository } from "./infrastructure/wallets/prisma-wallet.repository";
import { InternalApiGuard } from "./presentation/auth/internal-api.guard";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { MvpAuthGuard } from "./presentation/auth/mvp-auth.guard";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: GAMES_RESULTS_RMQ_CLIENT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672"],
          queue: "games_bet_results_queue",
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [WalletsController, WalletDebitConsumer, WalletCreditConsumer],
  providers: [
    PrismaService,
    MvpAuthGuard,
    InternalApiGuard,
    CreateWalletUseCase,
    CreditWalletForCashoutUseCase,
    DebitWalletForBetUseCase,
    FundWalletForDevelopmentUseCase,
    GetMyWalletUseCase,
    {
      provide: WALLET_REPOSITORY,
      useClass: PrismaWalletRepository,
    },
  ],
})
export class AppModule {}
