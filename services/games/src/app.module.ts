import { Module } from "@nestjs/common";
import { CreateRoundUseCase } from "./application/use-cases/create-round.use-case";
import { GetCurrentRoundUseCase } from "./application/use-cases/get-current-round.use-case";
import { GetMyCurrentBetUseCase } from "./application/use-cases/get-my-current-bet.use-case";
import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { BET_REPOSITORY } from "./domain/bets/bet.repository";
import { ROUND_REPOSITORY } from "./domain/rounds/round.repository";
import { PrismaBetRepository } from "./infrastructure/bets/prisma-bet.repository";
import { PrismaService } from "./infrastructure/prisma/prisma.service";
import { PrismaRoundRepository } from "./infrastructure/rounds/prisma-round.repository";
import { BetsController } from "./presentation/controllers/bets.controller";
import { GamesController } from "./presentation/controllers/games.controller";
import { InternalRoundsController } from "./presentation/controllers/internal-rounds.controller";
import { RoundsController } from "./presentation/controllers/rounds.controller";

@Module({
  controllers: [GamesController, InternalRoundsController, RoundsController, BetsController],
  providers: [
    PrismaService,
    CreateRoundUseCase,
    GetCurrentRoundUseCase,
    PlaceBetUseCase,
    GetMyCurrentBetUseCase,
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
