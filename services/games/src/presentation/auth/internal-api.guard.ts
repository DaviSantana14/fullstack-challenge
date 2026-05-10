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
  private readonly expectedToken: string;

  constructor() {
    const token = process.env.INTERNAL_API_TOKEN;
    if (!token) {
      throw new Error(
        "INTERNAL_API_TOKEN environment variable is not configured.",
      );
    }
    this.expectedToken = token;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<InternalRequest>();
    const tokenHeader = request.headers["x-internal-token"];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

    if (!token || token !== this.expectedToken) {
      throw new UnauthorizedException("Invalid internal API token.");
    }

    return true;
  }
}
