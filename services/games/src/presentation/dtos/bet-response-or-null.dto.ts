import type { BetRecord } from "../../domain/bets/bet.types";
import { BetResponseDto } from "./bet-response.dto";

export class BetResponseOrNullDto {
  bet: BetResponseDto | null;

  static fromBet(bet: BetRecord | null): BetResponseOrNullDto {
    return {
      bet: bet ? BetResponseDto.fromBet(bet) : null,
    };
  }
}
