import type { BetRecord } from "../../domain/bets/bet.types";
import { BetResponseDto } from "./bet-response.dto";

export class PaginatedBetsResponseDto {
  items: BetResponseDto[];
  nextCursor: string | null;

  static fromResult(input: {
    items: BetRecord[];
    nextCursor: string | null;
  }): PaginatedBetsResponseDto {
    return {
      items: input.items.map(BetResponseDto.fromBet),
      nextCursor: input.nextCursor,
    };
  }
}
