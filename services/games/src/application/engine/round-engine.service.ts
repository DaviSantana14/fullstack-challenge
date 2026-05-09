import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { calculateCrashPoint } from "../../domain/provably-fair/provably-fair.service";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";
import { CrashCurrentRoundUseCase } from "../use-cases/crash-current-round.use-case";
import { CreateRoundUseCase } from "../use-cases/create-round.use-case";
import { StartCurrentRoundUseCase } from "../use-cases/start-current-round.use-case";
import { getRoundEngineConfig, type RoundEngineConfig } from "./round-engine.config";
import { getCrashDelayMs } from "./round-engine.timing";

@Injectable()
export class RoundEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoundEngineService.name);
  private readonly config: RoundEngineConfig = getRoundEngineConfig();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private isRunning = false;
  private isStopped = false;

  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    private readonly createRoundUseCase: CreateRoundUseCase,
    private readonly startCurrentRoundUseCase: StartCurrentRoundUseCase,
    private readonly crashCurrentRoundUseCase: CrashCurrentRoundUseCase,
  ) {}

  onModuleInit(): void {
    if (!this.config.enabled) {
      this.logger.log("Round engine disabled by ROUND_ENGINE_ENABLED=false.");
      return;
    }

    void this.run();
  }

  onModuleDestroy(): void {
    this.isStopped = true;

    for (const timer of this.timers) {
      clearTimeout(timer);
    }

    this.timers.clear();
  }

  private async run(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    while (!this.isStopped) {
      try {
        await this.tick();
      } catch (error) {
        if (error instanceof ConflictException) {
          this.logger.debug(`Recoverable round engine conflict: ${error.message}`);
        } else {
          this.logger.error("Round engine tick failed.", error);
        }

        await this.sleep(500);
      }
    }

    this.isRunning = false;
  }

  private async tick(): Promise<void> {
    const currentRound = await this.roundRepository.findCurrentActiveRound();

    if (!currentRound) {
      await this.createRoundUseCase.execute();
      return;
    }

    if (currentRound.status === "BETTING") {
      await this.handleBettingRound(currentRound);
      return;
    }

    if (currentRound.status === "IN_PROGRESS") {
      await this.handleInProgressRound(currentRound);
    }
  }

  private async handleBettingRound(round: RoundRecord): Promise<void> {
    const delayMs = Math.max(0, round.bettingClosesAt.getTime() - Date.now());

    await this.sleep(delayMs);

    if (this.isStopped) {
      return;
    }

    await this.startCurrentRoundUseCase.execute();
  }

  private async handleInProgressRound(round: RoundRecord): Promise<void> {
    if (!round.serverSeed) {
      throw new ConflictException("Round does not have a server seed.");
    }

    const crashPointHundredths = calculateCrashPoint(round.serverSeed);
    const delayMs = getCrashDelayMs(crashPointHundredths, round.startedAt);

    await this.sleep(delayMs);

    if (this.isStopped) {
      return;
    }

    await this.crashCurrentRoundUseCase.execute();
    await this.sleep(this.config.restartDelayMs);
  }

  private async sleep(ms: number): Promise<void> {
    if (this.isStopped) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        resolve();
      }, Math.max(0, ms));

      this.timers.add(timer);
    });
  }
}
