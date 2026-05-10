import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CashoutCurrentBetUseCase } from "../../application/use-cases/cashout-current-bet.use-case";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BetResponseDto } from "../dtos/bet-response.dto";
import { CashoutRequestDto } from "../dtos/cashout-request.dto";
import { PlaceBetRequestDto } from "../dtos/place-bet-request.dto";

@ApiTags("bet aliases")
@Controller("bet")
export class BetAliasController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashoutCurrentBetUseCase: CashoutCurrentBetUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Place a bet using the README-compatible alias route" })
  @ApiBearerAuth()
  @ApiBody({ type: PlaceBetRequestDto })
  @ApiOkResponse({ type: BetResponseDto })
  @ApiBadRequestResponse({ description: "Invalid bet amount." })
  @ApiConflictResponse({ description: "No active betting round or player already has a bet." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid bearer token." })
  async placeBet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PlaceBetRequestDto,
  ): Promise<BetResponseDto> {
    const bet = await this.placeBetUseCase.execute(user.playerId, body.amountInCents);

    return BetResponseDto.fromBet(bet);
  }

  @Post("cashout")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Cash out using the README-compatible alias route" })
  @ApiBearerAuth()
  @ApiBody({ type: CashoutRequestDto })
  @ApiOkResponse({ type: BetResponseDto })
  @ApiConflictResponse({ description: "No in-progress round or no accepted current-round bet is available." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid bearer token." })
  async cashoutCurrentBet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() _body: CashoutRequestDto,
  ): Promise<BetResponseDto> {
    const bet = await this.cashoutCurrentBetUseCase.execute(user.playerId);

    return BetResponseDto.fromBet(bet);
  }
}
