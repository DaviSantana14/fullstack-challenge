import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
  type RoundPaginationCursor,
} from "../../domain/rounds/round.repository";
import type { RoundRecord } from "../../domain/rounds/round.types";

const DEFAULT_ROUND_HISTORY_LIMIT = 20;
const MAX_ROUND_HISTORY_LIMIT = 50;

export interface GetRoundHistoryInput {
  limit?: string;
  cursor?: string;
}

export interface GetRoundHistoryResult {
  items: RoundRecord[];
  nextCursor: string | null;
}

@Injectable()
export class GetRoundHistoryUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  async execute(input: GetRoundHistoryInput = {}): Promise<GetRoundHistoryResult> {
    const limit = this.parseLimit(input.limit);
    const cursor = this.decodeCursor(input.cursor);

    const page = await this.roundRepository.findHistoryPage({
      limit,
      cursor,
    });

    return {
      items: page.items,
      nextCursor:
        page.hasNextPage && page.items.length > 0
          ? this.encodeCursor(page.items[page.items.length - 1])
          : null,
    };
  }

  private parseLimit(rawLimit?: string): number {
    if (!rawLimit) {
      return DEFAULT_ROUND_HISTORY_LIMIT;
    }

    const limit = Number.parseInt(rawLimit, 10);

    if (!Number.isFinite(limit) || limit < 1) {
      throw new BadRequestException("limit must be a positive integer.");
    }

    return Math.min(limit, MAX_ROUND_HISTORY_LIMIT);
  }

  private decodeCursor(rawCursor?: string): RoundPaginationCursor | undefined {
    if (!rawCursor) {
      return undefined;
    }

    try {
      const payload = JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf8")) as {
        roundNumber?: unknown;
      };
      const roundNumber = payload.roundNumber;

      if (typeof roundNumber !== "number" || !Number.isInteger(roundNumber) || roundNumber < 1) {
        throw new Error("Invalid cursor payload.");
      }

      return {
        roundNumber,
      };
    } catch {
      throw new BadRequestException("cursor is invalid.");
    }
  }

  private encodeCursor(round: RoundRecord): string {
    return Buffer.from(
      JSON.stringify({
        roundNumber: round.roundNumber,
      }),
      "utf8",
    ).toString("base64url");
  }
}
