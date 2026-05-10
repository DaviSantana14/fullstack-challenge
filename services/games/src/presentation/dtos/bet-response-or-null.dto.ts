import { ApiProperty } from "@nestjs/swagger";
import type { BetRecord } from "../../domain/bets/bet.types";
import { BetResponseDto } from "./bet-response.dto";

export class BetResponseOrNullDto {
  @ApiProperty({ type: () => BetResponseDto, nullable: true })
  bet: BetResponseDto | null;

  static fromBet(bet: BetRecord | null): BetResponseOrNullDto {
    return {
      bet: bet ? BetResponseDto.fromBet(bet) : null,
    };
  }
}
