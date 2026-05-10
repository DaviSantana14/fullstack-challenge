import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { BetRecord } from "../../domain/bets/bet.types";
import { BetResponseDto } from "./bet-response.dto";

export class PaginatedBetsResponseDto {
  @ApiProperty({ type: () => [BetResponseDto] })
  items: BetResponseDto[];

  @ApiPropertyOptional({ example: "eyJwbGFjZWRBdCI6IjIwMjYtMDUtMDlUMjM6MzI6MTguNjQzWiIsImlkIjoiYmV0XzEyMyJ9", nullable: true })
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
