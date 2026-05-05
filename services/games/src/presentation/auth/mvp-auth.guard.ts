import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "./authenticated-user.interface";

@Injectable()
export class MvpAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const playerIdHeader = request.headers["x-player-id"];
    const playerId = Array.isArray(playerIdHeader)
      ? playerIdHeader[0]
      : playerIdHeader;

    if (!playerId || !playerId.trim()) {
      throw new UnauthorizedException("Missing x-player-id header.");
    }

    request.user = { playerId: playerId.trim() };

    return true;
  }
}
