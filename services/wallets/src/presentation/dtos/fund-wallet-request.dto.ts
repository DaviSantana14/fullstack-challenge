import { ApiProperty } from "@nestjs/swagger";

export class FundWalletRequestDto {
  @ApiProperty({ example: "player-1" })
  playerId!: string;

  @ApiProperty({ example: "10000", description: "Amount in cents, serialized as a positive integer string." })
  amountInCents!: string;
}
