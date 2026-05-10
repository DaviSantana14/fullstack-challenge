import { Controller, Get, Param } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { GetCurrentRoundUseCase } from "../../application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "../../application/use-cases/get-round-history.use-case";
import { VerifyRoundUseCase } from "../../application/use-cases/verify-round.use-case";
import { CurrentRoundResponseDto } from "../dtos/current-round-response.dto";
import { RoundHistoryResponseDto } from "../dtos/round-history-response.dto";
import { RoundResponseOrNullDto } from "../dtos/round-response-or-null.dto";
import { VerifyRoundResponseDto } from "../dtos/verify-round-response.dto";

@ApiTags("rounds")
@Controller("rounds")
export class RoundsController {
  constructor(
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
    private readonly verifyRoundUseCase: VerifyRoundUseCase,
  ) {}

  @Get("current")
  @ApiOperation({ summary: "Get the current round, if one exists" })
  @ApiOkResponse({ type: RoundResponseOrNullDto })
  async getCurrentRound(): Promise<RoundResponseOrNullDto> {
    const round = await this.getCurrentRoundUseCase.execute();

    return RoundResponseOrNullDto.fromRound(round);
  }

  @Get("history")
  @ApiOperation({ summary: "Get recent round history" })
  @ApiOkResponse({ type: [RoundHistoryResponseDto] })
  async getRoundHistory(): Promise<RoundHistoryResponseDto[]> {
    const rounds = await this.getRoundHistoryUseCase.execute(20);

    return rounds.map(RoundHistoryResponseDto.fromRound);
  }

  @Get(":roundId/verify")
  @ApiOperation({ summary: "Verify a crashed round using its provably fair data" })
  @ApiParam({ name: "roundId", example: "round_123" })
  @ApiOkResponse({ type: VerifyRoundResponseDto })
  @ApiNotFoundResponse({ description: "Round not found or verification data is not available yet." })
  async verifyRound(
    @Param("roundId") roundId: string,
  ): Promise<VerifyRoundResponseDto> {
    const result = await this.verifyRoundUseCase.execute(roundId);

    return VerifyRoundResponseDto.fromResult(result);
  }
}
