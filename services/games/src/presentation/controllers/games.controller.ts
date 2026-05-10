import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";

@ApiTags("health")
@Controller()
export class GamesController {
  @Get("health")
  @ApiOperation({ summary: "Check games service health" })
  @ApiOkResponse({ type: HealthCheckResponseDto })
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }
}
