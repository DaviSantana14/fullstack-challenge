import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CashoutCurrentBetUseCase } from "../../application/use-cases/cashout-current-bet.use-case";
import { GetCurrentRoundBetsUseCase } from "../../application/use-cases/get-current-round-bets.use-case";
import { GetMyBetsUseCase } from "../../application/use-cases/get-my-bets.use-case";
import { GetMyCurrentBetUseCase } from "../../application/use-cases/get-my-current-bet.use-case";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { MvpAuthGuard } from "../auth/mvp-auth.guard";
import { BetResponseDto } from "../dtos/bet-response.dto";
import { BetResponseOrNullDto } from "../dtos/bet-response-or-null.dto";
import { CashoutRequestDto } from "../dtos/cashout-request.dto";
import { PaginatedBetsResponseDto } from "../dtos/paginated-bets-response.dto";
import { PlaceBetRequestDto } from "../dtos/place-bet-request.dto";

@ApiTags("bets")
@Controller("bets")
export class BetsController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly getCurrentRoundBetsUseCase: GetCurrentRoundBetsUseCase,
    private readonly getMyBetsUseCase: GetMyBetsUseCase,
    private readonly getMyCurrentBetUseCase: GetMyCurrentBetUseCase,
    private readonly cashoutCurrentBetUseCase: CashoutCurrentBetUseCase,
  ) {}

  @Post()
  @UseGuards(MvpAuthGuard)
  @ApiOperation({ summary: "Place a bet in the current betting round" })
  @ApiHeader({ name: "x-player-id", required: true, example: "player-1" })
  @ApiBody({ type: PlaceBetRequestDto })
  @ApiOkResponse({ type: BetResponseDto })
  @ApiBadRequestResponse({ description: "Invalid bet amount." })
  @ApiConflictResponse({ description: "No active betting round or player already has a bet." })
  @ApiUnauthorizedResponse({ description: "Missing x-player-id header." })
  async placeBet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PlaceBetRequestDto,
  ): Promise<BetResponseDto> {
    const bet = await this.placeBetUseCase.execute(user.playerId, body.amountInCents);

    return BetResponseDto.fromBet(bet);
  }

  @Get("current-round")
  @ApiOperation({ summary: "Get bets for the current round" })
  @ApiOkResponse({ type: [BetResponseDto] })
  async getCurrentRoundBets(): Promise<BetResponseDto[]> {
    const bets = await this.getCurrentRoundBetsUseCase.execute();

    return bets.map(BetResponseDto.fromBet);
  }

  @Get("me")
  @UseGuards(MvpAuthGuard)
  @ApiOperation({ summary: "Get paginated bet history for the current player" })
  @ApiHeader({ name: "x-player-id", required: true, example: "player-1" })
  @ApiQuery({ name: "limit", required: false, example: 20, description: "Default 20, maximum 50." })
  @ApiQuery({ name: "cursor", required: false, example: "eyJwbGFjZWRBdCI6IjIwMjYtMDUtMDlUMjM6MzI6MTguNjQzWiIsImlkIjoiYmV0XzEyMyJ9" })
  @ApiOkResponse({ type: PaginatedBetsResponseDto })
  @ApiBadRequestResponse({ description: "Invalid limit or cursor." })
  @ApiUnauthorizedResponse({ description: "Missing x-player-id header." })
  async getMyBets(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<PaginatedBetsResponseDto> {
    const result = await this.getMyBetsUseCase.execute({
      playerId: user.playerId,
      limit,
      cursor,
    });

    return PaginatedBetsResponseDto.fromResult(result);
  }

  @Get("me/current")
  @UseGuards(MvpAuthGuard)
  @ApiOperation({ summary: "Get the current player's active bet, if one exists" })
  @ApiHeader({ name: "x-player-id", required: true, example: "player-1" })
  @ApiOkResponse({ type: BetResponseOrNullDto })
  @ApiUnauthorizedResponse({ description: "Missing x-player-id header." })
  async getMyCurrentBet(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BetResponseOrNullDto> {
    const bet = await this.getMyCurrentBetUseCase.execute(user.playerId);

    return BetResponseOrNullDto.fromBet(bet);
  }

  @Post("me/current/cashout")
  @UseGuards(MvpAuthGuard)
  @ApiOperation({ summary: "Cash out the current player's active bet" })
  @ApiHeader({ name: "x-player-id", required: true, example: "player-1" })
  @ApiBody({ type: CashoutRequestDto })
  @ApiOkResponse({ type: BetResponseDto })
  @ApiConflictResponse({ description: "No in-progress round or no accepted current-round bet is available." })
  @ApiUnauthorizedResponse({ description: "Missing x-player-id header." })
  async cashoutCurrentBet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() _body: CashoutRequestDto,
  ): Promise<BetResponseDto> {
    const bet = await this.cashoutCurrentBetUseCase.execute(user.playerId);

    return BetResponseDto.fromBet(bet);
  }
}
