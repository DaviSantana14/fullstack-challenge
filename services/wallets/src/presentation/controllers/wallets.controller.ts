import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { CreateWalletUseCase } from "../../application/use-cases/create-wallet.use-case";
import { GetMyWalletUseCase } from "../../application/use-cases/get-my-wallet.use-case";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { MvpAuthGuard } from "../auth/mvp-auth.guard";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { WalletResponseDto } from "../dtos/wallet-response.dto";

@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getMyWalletUseCase: GetMyWalletUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @UseGuards(MvpAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createWallet(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WalletResponseDto> {
    const wallet = await this.createWalletUseCase.execute(user.playerId);

    return WalletResponseDto.fromWallet(wallet);
  }

  @Get("me")
  @UseGuards(MvpAuthGuard)
  async getMyWallet(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WalletResponseDto> {
    const wallet = await this.getMyWalletUseCase.execute(user.playerId);

    return WalletResponseDto.fromWallet(wallet);
  }
}
