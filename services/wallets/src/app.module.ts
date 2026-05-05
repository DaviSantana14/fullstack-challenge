import { Module } from "@nestjs/common";
import { CreateWalletUseCase } from "./application/use-cases/create-wallet.use-case";
import { GetMyWalletUseCase } from "./application/use-cases/get-my-wallet.use-case";
import { WALLET_REPOSITORY } from "./domain/wallets/wallet.repository";
import { PrismaService } from "./infrastructure/prisma/prisma.service";
import { PrismaWalletRepository } from "./infrastructure/wallets/prisma-wallet.repository";
import { WalletsController } from "./presentation/controllers/wallets.controller";

@Module({
  controllers: [WalletsController],
  providers: [
    PrismaService,
    CreateWalletUseCase,
    GetMyWalletUseCase,
    {
      provide: WALLET_REPOSITORY,
      useClass: PrismaWalletRepository,
    },
  ],
})
export class AppModule {}
