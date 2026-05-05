import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

interface InternalRequest {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class InternalApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<InternalRequest>();
    const tokenHeader = request.headers["x-internal-token"];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
    const expectedToken = process.env.INTERNAL_API_TOKEN ?? "dev-internal-token";

    if (!token || token !== expectedToken) {
      throw new UnauthorizedException("Invalid internal API token.");
    }

    return true;
  }
}
