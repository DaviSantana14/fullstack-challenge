"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { getPlayerId, getValidAccessToken } from "@/lib/auth";
import type { Round, Bet, RoundMultiplierSnapshot } from "@/types/game";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4001";

function upsertBet(current: Bet[] | undefined, bet: Bet): Bet[] {
  const bets = current ?? [];
  const existingIndex = bets.findIndex((item) => item.id === bet.id);

  if (existingIndex === -1) {
    return [bet, ...bets];
  }

  const next = [...bets];
  next[existingIndex] = bet;
  return next;
}

export function useWebSocket() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let socket: ReturnType<typeof io> | undefined;
    let cancelled = false;

    void (async () => {
      const token = await getValidAccessToken();
      if (!token || cancelled) return;

      socket = io(`${WS_URL}/game`, {
        transports: ["websocket", "polling"],
        path: "/socket.io",
        auth: { token },
      });

      socket.on("connect", () => {
        setIsConnected(true);
        console.log("WebSocket connected");
      });

      socket.on("connect_error", (err) => {
        console.error("WebSocket auth failed:", err.message);
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
        console.log("WebSocket disconnected");
      });

      socket.on("round:betting_started", (payload: { round: Round }) => {
        queryClient.setQueryData(["round", "current"], payload.round);
        queryClient.removeQueries({ queryKey: ["round", "multiplier"], exact: true });
        queryClient.setQueryData(["bets", "current-round"], []);
        queryClient.invalidateQueries({ queryKey: ["bet", "current"] });
      });

      socket.on("round:started", (payload: { round: Round }) => {
        queryClient.setQueryData(["round", "current"], payload.round);
        queryClient.removeQueries({ queryKey: ["round", "multiplier"], exact: true });
      });

      socket.on("round:crashed", (payload: { round: Round }) => {
        queryClient.setQueryData(["round", "current"], payload.round);
        queryClient.removeQueries({ queryKey: ["round", "multiplier"], exact: true });
        queryClient.invalidateQueries({ queryKey: ["bet", "current"] });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["rounds", "history"] });
        queryClient.invalidateQueries({ queryKey: ["bets", "current-round"] });
      });

      socket.on("bet:placed", (bet: Bet) => {
        queryClient.setQueryData<Bet[]>(["bets", "current-round"], (current) =>
          upsertBet(current, bet),
        );

        // Only update if this bet belongs to the current player
        const currentPlayerId = getPlayerId();
        if (bet.playerId === currentPlayerId) {
          queryClient.setQueryData(["bet", "current"], bet);
        }
      });

      socket.on("bet:cashed_out", (bet: Bet) => {
        queryClient.setQueryData<Bet[]>(["bets", "current-round"], (current) =>
          upsertBet(current, bet),
        );

        const currentPlayerId = getPlayerId();
        if (bet.playerId === currentPlayerId) {
          queryClient.setQueryData(["bet", "current"], bet);
        }
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
      });

      socket.on(
        "round:multiplier",
        (payload: { roundId: string; multiplierHundredths: number; serverTime: string }) => {
          queryClient.setQueryData<RoundMultiplierSnapshot>(["round", "multiplier"], {
            roundId: payload.roundId,
            multiplierHundredths: payload.multiplierHundredths,
            serverTime: payload.serverTime,
            receivedAt: Date.now(),
          });
        },
      );
    })();

    return () => {
      cancelled = true;
      setIsConnected(false);
      socket?.disconnect();
    };
  }, [queryClient]);

  return { isConnected };
}
