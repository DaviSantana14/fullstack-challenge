import { Controller, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CrashCurrentRoundUseCase } from "../../application/use-cases/crash-current-round.use-case";
import { CreateRoundUseCase } from "../../application/use-cases/create-round.use-case";
import { StartCurrentRoundUseCase } from "../../application/use-cases/start-current-round.use-case";
import { InternalApiGuard } from "../auth/internal-api.guard";
import { CurrentRoundResponseDto } from "../dtos/current-round-response.dto";

@ApiTags("internal rounds")
@Controller("internal/rounds")
export class InternalRoundsController {
  constructor(
    private readonly createRoundUseCase: CreateRoundUseCase,
    private readonly startCurrentRoundUseCase: StartCurrentRoundUseCase,
    private readonly crashCurrentRoundUseCase: CrashCurrentRoundUseCase,
  ) {}

  @Post()
  @UseGuards(InternalApiGuard)
  @ApiOperation({ summary: "Create a betting round for deterministic/internal flows" })
  @ApiHeader({ name: "X-Auth-Token", required: true, example: "dev-internal-token" })
  @ApiOkResponse({ type: CurrentRoundResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid internal API token." })
  async createRound(): Promise<CurrentRoundResponseDto> {
    const round = await this.createRoundUseCase.execute();

    return CurrentRoundResponseDto.fromRound(round);
  }

  @Post("current/start")
  @UseGuards(InternalApiGuard)
  @ApiOperation({ summary: "Start the current betting round" })
  @ApiHeader({ name: "X-Auth-Token", required: true, example: "dev-internal-token" })
  @ApiOkResponse({ type: CurrentRoundResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid internal API token." })
  async startCurrentRound(): Promise<CurrentRoundResponseDto> {
    const round = await this.startCurrentRoundUseCase.execute();

    return CurrentRoundResponseDto.fromRound(round);
  }

  @Post("current/crash")
  @UseGuards(InternalApiGuard)
  @ApiOperation({ summary: "Crash the current in-progress round" })
  @ApiHeader({ name: "X-Auth-Token", required: true, example: "dev-internal-token" })
  @ApiOkResponse({ type: CurrentRoundResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid internal API token." })
  async crashCurrentRound(): Promise<CurrentRoundResponseDto> {
    const round = await this.crashCurrentRoundUseCase.execute();

    return CurrentRoundResponseDto.fromRound(round);
  }
}
