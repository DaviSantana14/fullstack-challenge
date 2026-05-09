import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import { Prisma } from "../../../generated/prisma/client";
import { randomUUID } from "crypto";
import { firstValueFrom, timeout } from "rxjs";
import { GameEventsService } from "../events/game-events.service";
import {
  BET_REPOSITORY,
  type BetRepository,
} from "../../domain/bets/bet.repository";
import type { BetRecord } from "../../domain/bets/bet.types";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../domain/rounds/round.repository";
import {
  WALLET_DEBIT_PATTERN,
  WALLETS_RMQ_CLIENT,
  type WalletDebitRequestMessage,
  type WalletDebitResponseMessage,
} from "../../infrastructure/messaging/wallet-debit.contract";

const MIN_BET_AMOUNT_IN_CENTS = BigInt(100);
const MAX_BET_AMOUNT_IN_CENTS = BigInt(100_000);

@Injectable()
export class PlaceBetUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
    @Inject(WALLETS_RMQ_CLIENT)
    private readonly walletsClient: ClientProxy,
    private readonly gameEvents: GameEventsService,
  ) {}

  async execute(playerId: string, amountInCentsInput: string): Promise<BetRecord> {
    const amountInCents = this.parseAmountInCents(amountInCentsInput);
    const round = await this.roundRepository.findCurrentBettingRound();

    if (!round) {
      throw new ConflictException("No active betting round is accepting bets.");
    }

    const existingBet = await this.betRepository.findByRoundIdAndPlayerId(
      round.id,
      playerId,
    );

    if (existingBet) {
      throw new ConflictException("Player already has a bet in the current round.");
    }

    let pendingBet: BetRecord;

    try {
      pendingBet = await this.betRepository.createPendingBet({
        roundId: round.id,
        playerId,
        amountInCents,
        correlationId: randomUUID(),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Player already has a bet in the current round.");
      }

      throw error;
    }

    const requestMessage: WalletDebitRequestMessage = {
      messageId: randomUUID(),
      correlationId: pendingBet.correlationId as string,
      betId: pendingBet.id,
      roundId: round.id,
      playerId,
      amountInCents: amountInCents.toString(),
      occurredAt: new Date().toISOString(),
    };

    try {
      const response = await firstValueFrom(
        this.walletsClient
          .send<WalletDebitResponseMessage>(WALLET_DEBIT_PATTERN, requestMessage)
          .pipe(timeout(3000)),
      );

      if (response.status === "APPROVED") {
        const processedAt = new Date(response.processedAt);
        const acceptedBet = await this.betRepository.markPendingBetAsAcceptedIfRoundActive(
          response.correlationId,
          processedAt,
        );

        if (acceptedBet?.status === "ACCEPTED") {
          this.gameEvents.emit("bet:placed", { bet: acceptedBet });
          return acceptedBet;
        }

        const lostBet = await this.betRepository.markPendingBetAsLostIfRoundCrashed(
          response.correlationId,
          processedAt,
        );

        if (lostBet?.status === "LOST") {
          return lostBet;
        }

        return (await this.betRepository.markPendingBetAsRejected(
          response.correlationId,
          "ROUND_CLOSED",
        )) as BetRecord;
      }

      return (await this.betRepository.markPendingBetAsRejected(
        response.correlationId,
        response.reason ?? "WALLET_REJECTED",
      )) as BetRecord;
    } catch {
      return pendingBet;
    }
  }

  private parseAmountInCents(amountInCentsInput: string): bigint {
    const normalized = amountInCentsInput?.trim();

    if (!normalized || !/^\d+$/.test(normalized)) {
      throw new BadRequestException("amountInCents must be a positive integer string.");
    }

    const amountInCents = BigInt(normalized);

    if (amountInCents <= BigInt(0)) {
      throw new BadRequestException("amountInCents must be greater than zero.");
    }

    if (amountInCents < MIN_BET_AMOUNT_IN_CENTS) {
      throw new BadRequestException("Minimum bet amount is R$ 1.00.");
    }

    if (amountInCents > MAX_BET_AMOUNT_IN_CENTS) {
      throw new BadRequestException("Maximum bet amount is R$ 1000.00.");
    }

    return amountInCents;
  }
}
