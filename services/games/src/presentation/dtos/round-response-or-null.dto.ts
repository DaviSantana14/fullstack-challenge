import { ApiProperty } from "@nestjs/swagger";
import type { RoundRecord } from "../../domain/rounds/round.types";
import { CurrentRoundResponseDto } from "./current-round-response.dto";

export class RoundResponseOrNullDto {
  @ApiProperty({ type: () => CurrentRoundResponseDto, nullable: true })
  round: CurrentRoundResponseDto | null;

  static fromRound(round: RoundRecord | null): RoundResponseOrNullDto {
    return {
      round: round ? CurrentRoundResponseDto.fromRound(round) : null,
    };
  }
}
