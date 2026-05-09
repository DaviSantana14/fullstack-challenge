import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
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
import type { CashoutRequestDto } from "../dtos/cashout-request.dto";
import { PaginatedBetsResponseDto } from "../dtos/paginated-bets-response.dto";
import type { PlaceBetRequestDto } from "../dtos/place-bet-request.dto";

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
  async placeBet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PlaceBetRequestDto,
  ): Promise<BetResponseDto> {
    const bet = await this.placeBetUseCase.execute(user.playerId, body.amountInCents);

    return BetResponseDto.fromBet(bet);
  }

  @Get("current-round")
  async getCurrentRoundBets(): Promise<BetResponseDto[]> {
    const bets = await this.getCurrentRoundBetsUseCase.execute();

    return bets.map(BetResponseDto.fromBet);
  }

  @Get("me")
  @UseGuards(MvpAuthGuard)
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
  async getMyCurrentBet(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BetResponseOrNullDto> {
    const bet = await this.getMyCurrentBetUseCase.execute(user.playerId);

    return BetResponseOrNullDto.fromBet(bet);
  }

  @Post("me/current/cashout")
  @UseGuards(MvpAuthGuard)
  async cashoutCurrentBet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() _body: CashoutRequestDto,
  ): Promise<BetResponseDto> {
    const bet = await this.cashoutCurrentBetUseCase.execute(user.playerId);

    return BetResponseDto.fromBet(bet);
  }
}
