import { Controller, Post, UseGuards } from "@nestjs/common";
import { CreateRoundUseCase } from "../../application/use-cases/create-round.use-case";
import { InternalApiGuard } from "../auth/internal-api.guard";
import { CurrentRoundResponseDto } from "../dtos/current-round-response.dto";

@Controller("internal/rounds")
export class InternalRoundsController {
  constructor(private readonly createRoundUseCase: CreateRoundUseCase) {}

  @Post()
  @UseGuards(InternalApiGuard)
  async createRound(): Promise<CurrentRoundResponseDto> {
    const round = await this.createRoundUseCase.execute();

    return CurrentRoundResponseDto.fromRound(round);
  }
}
