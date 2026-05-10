import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PlaceBetRequestDto {
  @ApiProperty({ example: "100", description: "Bet amount in cents, serialized as a positive integer string." })
  amountInCents: string;

  @ApiPropertyOptional({ example: "my-client-seed", description: "Optional client seed for provably fair verification." })
  clientSeed?: string;

  @ApiPropertyOptional({ example: 200, description: "Optional auto cashout target multiplier in hundredths. 200 means 2.00x." })
  autoCashoutMultiplierHundredths?: number;
}
