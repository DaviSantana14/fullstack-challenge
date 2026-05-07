import { Controller, Get, Param } from "@nestjs/common";
import { GetCurrentRoundUseCase } from "../../application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "../../application/use-cases/get-round-history.use-case";
import { VerifyRoundUseCase } from "../../application/use-cases/verify-round.use-case";
import { CurrentRoundResponseDto } from "../dtos/current-round-response.dto";
import { RoundHistoryResponseDto } from "../dtos/round-history-response.dto";
import { VerifyRoundResponseDto } from "../dtos/verify-round-response.dto";

@Controller("rounds")
export class RoundsController {
  constructor(
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
    private readonly verifyRoundUseCase: VerifyRoundUseCase,
  ) {}

  @Get("current")
  async getCurrentRound(): Promise<CurrentRoundResponseDto> {
    const round = await this.getCurrentRoundUseCase.execute();

    return CurrentRoundResponseDto.fromRound(round);
  }

  @Get("history")
  async getRoundHistory(): Promise<RoundHistoryResponseDto[]> {
    const rounds = await this.getRoundHistoryUseCase.execute(20);

    return rounds.map(RoundHistoryResponseDto.fromRound);
  }

  @Get(":roundId/verify")
  async verifyRound(
    @Param("roundId") roundId: string,
  ): Promise<VerifyRoundResponseDto> {
    const result = await this.verifyRoundUseCase.execute(roundId);

    return VerifyRoundResponseDto.fromResult(result);
  }
}
