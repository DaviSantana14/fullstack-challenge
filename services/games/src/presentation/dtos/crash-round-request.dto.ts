import { ApiProperty } from "@nestjs/swagger";

export class CrashRoundRequestDto {
  @ApiProperty({ example: 200, description: "Crash point in hundredths, e.g. 200 means 2.00x." })
  crashPointHundredths: number;
}
