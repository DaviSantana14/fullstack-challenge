import { ApiProperty } from "@nestjs/swagger";

export class PlaceBetRequestDto {
  @ApiProperty({ example: "100", description: "Bet amount in cents, serialized as a positive integer string." })
  amountInCents: string;
}
