import { Controller, Get } from "@nestjs/common";
import { GetCurrentRoundUseCase } from "../../application/use-cases/get-current-round.use-case";
import { CurrentRoundResponseDto } from "../dtos/current-round-response.dto";

@Controller("rounds")
export class RoundsController {
  constructor(private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase) {}

  @Get("current")
  async getCurrentRound(): Promise<CurrentRoundResponseDto> {
    const round = await this.getCurrentRoundUseCase.execute();

    return CurrentRoundResponseDto.fromRound(round);
  }
}
