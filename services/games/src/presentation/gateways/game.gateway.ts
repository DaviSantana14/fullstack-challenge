import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { Injectable } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { GameEventsService } from "../../application/events/game-events.service";
import type { RoundStateEvent, BetPlacedEvent, BetCashedOutEvent, MultiplierTickEvent } from "../../application/events/game-events.service";
import type { BetRecord } from "../../domain/bets/bet.types";

const keycloakIssuer =
  process.env.KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/crash-game";
const keycloakJwksUri =
  process.env.KEYCLOAK_JWKS_URI ??
  "http://keycloak:8080/realms/crash-game/protocol/openid-connect/certs";
const keycloakClientId =
  process.env.KEYCLOAK_CLIENT_ID ?? "crash-game-client";
const keycloakJwks = createRemoteJWKSet(new URL(keycloakJwksUri));

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/game",
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private unsubscribers: (() => void)[] = [];

  constructor(private readonly gameEvents: GameEventsService) {
    this.unsubscribers.push(
      this.gameEvents.on<RoundStateEvent>("round:betting_started", (payload) => {
        this.server.emit("round:betting_started", this.serializeRoundState(payload));
      }),
    );
    this.unsubscribers.push(
      this.gameEvents.on<RoundStateEvent>("round:started", (payload) => {
        this.server.emit("round:started", this.serializeRoundState(payload));
      }),
    );
    this.unsubscribers.push(
      this.gameEvents.on<RoundStateEvent>("round:crashed", (payload) => {
        this.server.emit("round:crashed", this.serializeRoundState(payload));
      }),
    );
    this.unsubscribers.push(
      this.gameEvents.on<BetPlacedEvent>("bet:placed", (payload) => {
        this.server.emit("bet:placed", this.serializeBet(payload.bet));
      }),
    );
    this.unsubscribers.push(
      this.gameEvents.on<BetCashedOutEvent>("bet:cashed_out", (payload) => {
        this.server.emit("bet:cashed_out", this.serializeBet(payload.bet));
      }),
    );
    this.unsubscribers.push(
      this.gameEvents.on<MultiplierTickEvent>("round:multiplier", (payload) => {
        this.server.emit("round:multiplier", payload);
      }),
    );
  }

  afterInit(server: Server): void {
    server.use(async (socket, next) => {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      try {
        const { payload } = await jwtVerify(token, keycloakJwks, {
          issuer: keycloakIssuer,
        });
        if (!payload.sub || payload.azp !== keycloakClientId) {
          return next(new Error("Invalid token"));
        }
        (socket as any).playerId = payload.sub;
        next();
      } catch {
        next(new Error("Invalid token"));
      }
    });
  }

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
  }

  private serializeRoundState(payload: RoundStateEvent): Record<string, unknown> {
    return {
      round: {
        id: payload.round.id,
        roundNumber: payload.round.roundNumber,
        status: payload.round.status,
        serverSeedHash: payload.round.serverSeedHash,
        serverSeed: payload.round.status === "CRASHED" ? payload.round.serverSeed : null,
        crashPointHundredths: payload.round.crashPointHundredths,
        bettingStartsAt: payload.round.bettingStartsAt.toISOString(),
        bettingClosesAt: payload.round.bettingClosesAt.toISOString(),
        startedAt: payload.round.startedAt?.toISOString() ?? null,
        crashedAt: payload.round.crashedAt?.toISOString() ?? null,
        settledAt: payload.round.settledAt?.toISOString() ?? null,
      },
      serverTime: payload.serverTime,
    };
  }

  private serializeBet(bet: BetRecord): Record<string, unknown> {
    return {
      id: bet.id,
      roundId: bet.roundId,
      playerId: bet.playerId,
      amountInCents: bet.amountInCents.toString(),
      status: bet.status,
      cashoutMultiplierHundredths: bet.cashoutMultiplierHundredths,
      payoutInCents: bet.payoutInCents?.toString() ?? null,
      placedAt: bet.placedAt.toISOString(),
      acceptedAt: bet.acceptedAt?.toISOString() ?? null,
      cashedOutAt: bet.cashedOutAt?.toISOString() ?? null,
      settledAt: bet.settledAt?.toISOString() ?? null,
    };
  }
}
