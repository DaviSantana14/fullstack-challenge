import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CreateWalletUseCase } from "../../application/use-cases/create-wallet.use-case";
import { FundWalletForDevelopmentUseCase } from "../../application/use-cases/fund-wallet-for-development.use-case";
import { GetMyWalletUseCase } from "../../application/use-cases/get-my-wallet.use-case";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { InternalApiGuard } from "../auth/internal-api.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FundWalletRequestDto } from "../dtos/fund-wallet-request.dto";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { WalletResponseDto } from "../dtos/wallet-response.dto";

@ApiTags("wallets")
@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getMyWalletUseCase: GetMyWalletUseCase,
    private readonly fundWalletForDevelopmentUseCase: FundWalletForDevelopmentUseCase,
  ) {}

  @Get("health")
  @ApiOperation({ summary: "Check wallets service health" })
  @ApiOkResponse({ type: HealthCheckResponseDto })
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a wallet for the current player" })
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: WalletResponseDto })
  @ApiConflictResponse({ description: "Wallet already exists for this player." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid bearer token." })
  async createWallet(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WalletResponseDto> {
    const wallet = await this.createWalletUseCase.execute(user.playerId);

    return WalletResponseDto.fromWallet(wallet);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get the current player's wallet" })
  @ApiBearerAuth()
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiNotFoundResponse({ description: "Wallet not found for this player." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid bearer token." })
  async getMyWallet(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WalletResponseDto> {
    const wallet = await this.getMyWalletUseCase.execute(user.playerId);

    return WalletResponseDto.fromWallet(wallet);
  }

  @Post("internal/dev/fund")
  @UseGuards(InternalApiGuard)
  @ApiOperation({ summary: "Fund a wallet for development and E2E flows" })
  @ApiHeader({ name: "X-Auth-Token", required: true, example: "dev-internal-token" })
  @ApiBody({ type: FundWalletRequestDto })
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiBadRequestResponse({ description: "Invalid playerId or amountInCents." })
  @ApiNotFoundResponse({ description: "Wallet not found for this player." })
  @ApiUnauthorizedResponse({ description: "Invalid internal API token." })
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
