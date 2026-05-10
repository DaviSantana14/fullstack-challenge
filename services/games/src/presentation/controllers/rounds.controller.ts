import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { GetCurrentRoundUseCase } from "../../application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "../../application/use-cases/get-round-history.use-case";
import { VerifyRoundUseCase } from "../../application/use-cases/verify-round.use-case";
import { CurrentRoundResponseDto } from "../dtos/current-round-response.dto";
import { PaginatedRoundHistoryResponseDto } from "../dtos/round-history-response.dto";
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
  @ApiOperation({ summary: "Get paginated round history" })
  @ApiQuery({ name: "limit", required: false, example: 20, description: "Default 20, maximum 50." })
  @ApiQuery({ name: "cursor", required: false, example: "eyJyb3VuZE51bWJlciI6NDJ9" })
  @ApiOkResponse({ type: PaginatedRoundHistoryResponseDto })
  @ApiBadRequestResponse({ description: "Invalid limit or cursor." })
  async getRoundHistory(
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<PaginatedRoundHistoryResponseDto> {
    const result = await this.getRoundHistoryUseCase.execute({ limit, cursor });

    return PaginatedRoundHistoryResponseDto.fromResult(result);
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
