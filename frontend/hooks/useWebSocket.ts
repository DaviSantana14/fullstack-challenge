"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { getPlayerId } from "@/lib/auth";
import type { Round, Bet } from "@/types/game";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4001";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      path: "/socket.io",
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected");
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    socket.on("round:betting_started", (payload: { round: Round }) => {
      queryClient.setQueryData(["round", "current"], payload.round);
      queryClient.invalidateQueries({ queryKey: ["bet", "current"] });
    });

    socket.on("round:started", (payload: { round: Round }) => {
      queryClient.setQueryData(["round", "current"], payload.round);
    });

    socket.on("round:crashed", (payload: { round: Round }) => {
      queryClient.setQueryData(["round", "current"], payload.round);
      queryClient.invalidateQueries({ queryKey: ["bet", "current"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["rounds", "history"] });
    });

    socket.on("bet:placed", (payload: { bet: Bet }) => {
      // Only update if this bet belongs to the current player
      const currentPlayerId = getPlayerId();
      if (payload.bet.playerId === currentPlayerId) {
        queryClient.setQueryData(["bet", "current"], payload.bet);
      }
    });

    socket.on("bet:cashed_out", (payload: { bet: Bet }) => {
      const currentPlayerId = getPlayerId();
      if (payload.bet.playerId === currentPlayerId) {
        queryClient.setQueryData(["bet", "current"], payload.bet);
      }
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return socketRef.current;
}
