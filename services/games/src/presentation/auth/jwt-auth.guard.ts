import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import type { AuthenticatedRequest } from "./authenticated-user.interface";

const keycloakIssuer =
  process.env.KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/crash-game";
const keycloakJwksUri =
  process.env.KEYCLOAK_JWKS_URI ??
  "http://keycloak:8080/realms/crash-game/protocol/openid-connect/certs";
const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID ?? "crash-game-client";
const keycloakJwks = createRemoteJWKSet(new URL(keycloakJwksUri));

type KeycloakJwtPayload = JWTPayload & {
  azp?: string;
  preferred_username?: string;
  email?: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    try {
      const { payload } = await jwtVerify<KeycloakJwtPayload>(token, keycloakJwks, {
        issuer: keycloakIssuer,
      });

      if (!payload.sub) {
        throw new UnauthorizedException("Token subject is missing.");
      }

      if (payload.azp !== keycloakClientId) {
        throw new UnauthorizedException("Token client is invalid.");
      }

      request.user = {
        playerId: payload.sub,
        username: payload.preferred_username ?? payload.email ?? payload.sub,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Invalid bearer token.");
    }
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const authorizationHeader = request.headers.authorization;
    const authorization = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;

    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return null;
    }

    return token;
  }
}
