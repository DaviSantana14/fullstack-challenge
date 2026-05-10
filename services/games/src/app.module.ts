import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { GameEventsService } from "./application/events/game-events.service";
import { RoundEngineService } from "./application/engine/round-engine.service";
import { AutoCashoutService } from "./application/use-cases/auto-cashout.service";
import { CashoutCurrentBetUseCase } from "./application/use-cases/cashout-current-bet.use-case";
import { CrashCurrentRoundUseCase } from "./application/use-cases/crash-current-round.use-case";
import { CreateRoundUseCase } from "./application/use-cases/create-round.use-case";
import { GetCurrentRoundUseCase } from "./application/use-cases/get-current-round.use-case";
import { GetCurrentRoundBetsUseCase } from "./application/use-cases/get-current-round-bets.use-case";
import { GetMyBetsUseCase } from "./application/use-cases/get-my-bets.use-case";
import { GetMyCurrentBetUseCase } from "./application/use-cases/get-my-current-bet.use-case";
import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { GetRoundHistoryUseCase } from "./application/use-cases/get-round-history.use-case";
import { StartCurrentRoundUseCase } from "./application/use-cases/start-current-round.use-case";
import { VerifyRoundUseCase } from "./application/use-cases/verify-round.use-case";
import { BET_REPOSITORY } from "./domain/bets/bet.repository";
import { ROUND_REPOSITORY } from "./domain/rounds/round.repository";
import { PrismaBetRepository } from "./infrastructure/bets/prisma-bet.repository";
import { WALLETS_RMQ_CLIENT } from "./infrastructure/messaging/wallet-debit.contract";
import { WalletCreditResultConsumer } from "./infrastructure/messaging/wallet-credit-result.consumer";
import { WalletDebitResultConsumer } from "./infrastructure/messaging/wallet-debit-result.consumer";
import { PrismaService } from "./infrastructure/prisma/prisma.service";
import { PrismaRoundRepository } from "./infrastructure/rounds/prisma-round.repository";
import { BetAliasController } from "./presentation/controllers/bet-alias.controller";
import { BetsController } from "./presentation/controllers/bets.controller";
import { GamesController } from "./presentation/controllers/games.controller";
import { InternalRoundsController } from "./presentation/controllers/internal-rounds.controller";
import { RoundsController } from "./presentation/controllers/rounds.controller";
import { GameGateway } from "./presentation/gateways/game.gateway";
import { JwtAuthGuard } from "./presentation/auth/jwt-auth.guard";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: WALLETS_RMQ_CLIENT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672"],
          queue: "wallets_debit_queue",
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [
    GamesController,
    InternalRoundsController,
    RoundsController,
    BetAliasController,
    BetsController,
    WalletCreditResultConsumer,
    WalletDebitResultConsumer,
  ],
  providers: [
    PrismaService,
    GameEventsService,
    RoundEngineService,
    GameGateway,
    JwtAuthGuard,
    AutoCashoutService,
    CashoutCurrentBetUseCase,
    CrashCurrentRoundUseCase,
    CreateRoundUseCase,
    GetCurrentRoundUseCase,
    GetCurrentRoundBetsUseCase,
    PlaceBetUseCase,
    GetMyBetsUseCase,
    GetMyCurrentBetUseCase,
    GetRoundHistoryUseCase,
    StartCurrentRoundUseCase,
    VerifyRoundUseCase,
    {
      provide: ROUND_REPOSITORY,
      useClass: PrismaRoundRepository,
    },
    {
      provide: BET_REPOSITORY,
      useClass: PrismaBetRepository,
    },
  ],
})
export class AppModule {}
