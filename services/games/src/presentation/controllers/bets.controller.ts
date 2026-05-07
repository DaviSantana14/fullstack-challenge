import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CashoutCurrentBetUseCase } from "../../application/use-cases/cashout-current-bet.use-case";
import { GetMyCurrentBetUseCase } from "../../application/use-cases/get-my-current-bet.use-case";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { MvpAuthGuard } from "../auth/mvp-auth.guard";
import { BetResponseDto } from "../dtos/bet-response.dto";
import type { CashoutRequestDto } from "../dtos/cashout-request.dto";
import type { PlaceBetRequestDto } from "../dtos/place-bet-request.dto";

@Controller("bets")
export class BetsController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
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

  @Get("me/current")
  @UseGuards(MvpAuthGuard)
  async getMyCurrentBet(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BetResponseDto> {
    const bet = await this.getMyCurrentBetUseCase.execute(user.playerId);

    return BetResponseDto.fromBet(bet);
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
