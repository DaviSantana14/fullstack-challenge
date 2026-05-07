import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { CreateWalletUseCase } from "../../application/use-cases/create-wallet.use-case";
import { FundWalletForDevelopmentUseCase } from "../../application/use-cases/fund-wallet-for-development.use-case";
import { GetMyWalletUseCase } from "../../application/use-cases/get-my-wallet.use-case";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { InternalApiGuard } from "../auth/internal-api.guard";
import { MvpAuthGuard } from "../auth/mvp-auth.guard";
import { FundWalletRequestDto } from "../dtos/fund-wallet-request.dto";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { WalletResponseDto } from "../dtos/wallet-response.dto";

@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getMyWalletUseCase: GetMyWalletUseCase,
    private readonly fundWalletForDevelopmentUseCase: FundWalletForDevelopmentUseCase,
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

  @Post("internal/dev/fund")
  @UseGuards(InternalApiGuard)
  async fundWalletForDevelopment(
    @Body() body: FundWalletRequestDto,
  ): Promise<WalletResponseDto> {
    const wallet = await this.fundWalletForDevelopmentUseCase.execute(
      body.playerId,
      body.amountInCents,
    );

    return WalletResponseDto.fromWallet(wallet);
  }
}
