import { Controller, Post, UseGuards } from "@nestjs/common";
import { CrashCurrentRoundUseCase } from "../../application/use-cases/crash-current-round.use-case";
import { CreateRoundUseCase } from "../../application/use-cases/create-round.use-case";
import { StartCurrentRoundUseCase } from "../../application/use-cases/start-current-round.use-case";
import { InternalApiGuard } from "../auth/internal-api.guard";
import { CurrentRoundResponseDto } from "../dtos/current-round-response.dto";

@Controller("internal/rounds")
export class InternalRoundsController {
  constructor(
    private readonly createRoundUseCase: CreateRoundUseCase,
    private readonly startCurrentRoundUseCase: StartCurrentRoundUseCase,
    private readonly crashCurrentRoundUseCase: CrashCurrentRoundUseCase,
  ) {}

  @Post()
  @UseGuards(InternalApiGuard)
  async createRound(): Promise<CurrentRoundResponseDto> {
    const round = await this.createRoundUseCase.execute();

    return CurrentRoundResponseDto.fromRound(round);
  }

  @Post("current/start")
  @UseGuards(InternalApiGuard)
  async startCurrentRound(): Promise<CurrentRoundResponseDto> {
    const round = await this.startCurrentRoundUseCase.execute();

    return CurrentRoundResponseDto.fromRound(round);
  }

  @Post("current/crash")
  @UseGuards(InternalApiGuard)
  async crashCurrentRound(): Promise<CurrentRoundResponseDto> {
    const round = await this.crashCurrentRoundUseCase.execute();

    return CurrentRoundResponseDto.fromRound(round);
  }
}
