import { Injectable } from "@nestjs/common";
import type { BetRecord } from "../../domain/bets/bet.types";
import type { RoundRecord } from "../../domain/rounds/round.types";

export interface RoundStateEvent {
  round: RoundRecord;
  serverTime: string;
}

export interface BetPlacedEvent {
  bet: BetRecord;
}

export interface BetCashedOutEvent {
  bet: BetRecord;
}

@Injectable()
export class GameEventsService {
  private listeners: Map<string, Set<(payload: unknown) => void>> = new Map();

  on<T>(event: string, listener: (payload: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as (payload: unknown) => void);
    return () => {
      this.listeners.get(event)?.delete(listener as (payload: unknown) => void);
    };
  }

  emit<T>(event: string, payload: T): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(payload);
        } catch {
          // ignore listener errors
        }
      }
    }
  }
}
