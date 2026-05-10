import { ApiPropertyOptional } from "@nestjs/swagger";

export class CashoutRequestDto {
  @ApiPropertyOptional({
    example: 150,
    description: "Client-observed multiplier in hundredths. The server calculates the authoritative cashout multiplier.",
  })
  cashoutMultiplierHundredths?: number;
}
