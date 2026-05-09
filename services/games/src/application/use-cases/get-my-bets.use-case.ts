import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  BET_REPOSITORY,
  type BetPaginationCursor,
  type BetRepository,
} from "../../domain/bets/bet.repository";
import type { BetRecord } from "../../domain/bets/bet.types";

const DEFAULT_MY_BETS_LIMIT = 20;
const MAX_MY_BETS_LIMIT = 50;

export interface GetMyBetsInput {
  playerId: string;
  limit?: string;
  cursor?: string;
}

export interface GetMyBetsResult {
  items: BetRecord[];
  nextCursor: string | null;
}

@Injectable()
export class GetMyBetsUseCase {
  constructor(
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
  ) {}

  async execute(input: GetMyBetsInput): Promise<GetMyBetsResult> {
    const limit = this.parseLimit(input.limit);
    const cursor = this.decodeCursor(input.cursor);
    const page = await this.betRepository.findPlayerBetsPage({
      playerId: input.playerId,
      limit,
      cursor,
    });

    return {
      items: page.items,
      nextCursor: page.hasNextPage
        ? this.encodeCursor(page.items[page.items.length - 1])
        : null,
    };
  }

  private parseLimit(rawLimit: string | undefined): number {
    if (!rawLimit) {
      return DEFAULT_MY_BETS_LIMIT;
    }

    const limit = Number.parseInt(rawLimit, 10);

    if (!Number.isFinite(limit) || limit < 1) {
      throw new BadRequestException("limit must be a positive integer.");
    }

    return Math.min(limit, MAX_MY_BETS_LIMIT);
  }

  private decodeCursor(rawCursor: string | undefined): BetPaginationCursor | undefined {
    if (!rawCursor) {
      return undefined;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(rawCursor, "base64url").toString("utf8"),
      ) as Partial<{ placedAt: string; id: string }>;
      const placedAt = decoded.placedAt ? new Date(decoded.placedAt) : null;

      if (
        !decoded.id ||
        typeof decoded.id !== "string" ||
        !placedAt ||
        Number.isNaN(placedAt.getTime())
      ) {
        throw new Error("Invalid cursor payload.");
      }

      return {
        placedAt,
        id: decoded.id,
      };
    } catch {
      throw new BadRequestException("cursor is invalid.");
    }
  }

  private encodeCursor(bet: BetRecord | undefined): string | null {
    if (!bet) {
      return null;
    }

    return Buffer.from(
      JSON.stringify({
        placedAt: bet.placedAt.toISOString(),
        id: bet.id,
      }),
      "utf8",
    ).toString("base64url");
  }
}
