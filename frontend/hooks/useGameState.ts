"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";
import type { Round, Bet, Wallet, RoundHistoryItem } from "@/types/game";

function useCurrentRound() {
  return useQuery({
    queryKey: ["round", "current"],
    queryFn: () => apiGet<Round>("/games/rounds/current"),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "IN_PROGRESS") return 500;
      return 2000;
    },
  });
}

function useMyCurrentBet() {
  return useQuery({
    queryKey: ["bet", "current"],
    queryFn: () => apiGet<Bet>("/games/bets/me/current"),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "CASHOUT_PENDING") return 500;
      return 2000;
    },
  });
}

function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => apiGet<Wallet>("/wallets/me"),
    refetchInterval: 5000,
  });
}

function useRoundHistory() {
  return useQuery({
    queryKey: ["rounds", "history"],
    queryFn: () => apiGet<RoundHistoryItem[]>("/games/rounds/history"),
    refetchInterval: 10000,
  });
}

export function useGameState() {
  const queryClient = useQueryClient();
  const [betAmount, setBetAmount] = useState<string>("250");

  // WebSocket for real-time updates
  useWebSocket();

  const roundQuery = useCurrentRound();
  const myBetQuery = useMyCurrentBet();
  const walletQuery = useWallet();
  const historyQuery = useRoundHistory();

  const round = roundQuery.data ?? null;
  const myBet = myBetQuery.data ?? null;
  const wallet = walletQuery.data ?? null;
  const history = historyQuery.data ?? [];

  const placeBetMutation = useMutation({
    mutationFn: (amountInCents: string) =>
      apiPost<Bet>("/games/bets", { amountInCents }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bet", "current"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  const cashoutMutation = useMutation({
    mutationFn: () => apiPost<Bet>("/games/bets/me/current/cashout", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bet", "current"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  const canBet =
    round?.status === "BETTING" &&
    (!myBet || myBet.status === "REJECTED" || myBet.status === "LOST");

  const canCashout =
    round?.status === "IN_PROGRESS" &&
    myBet?.status === "ACCEPTED";

  const isPending = myBet?.status === "PENDING" || myBet?.status === "CASHOUT_PENDING";

  const multiplier = useMultiplier(round);

  return {
    round,
    myBet,
    wallet,
    history,
    betAmount,
    setBetAmount,
    multiplier,
    canBet,
    canCashout,
    isPending,
    placeBet: placeBetMutation.mutate,
    cashout: cashoutMutation.mutate,
    isPlacingBet: placeBetMutation.isPending,
    isCashingOut: cashoutMutation.isPending,
  };
}

function useMultiplier(round: Round | null): number {
  const [multiplier, setMultiplier] = useState(1.0);

  const calculateMultiplier = useCallback(() => {
    if (!round || round.status !== "IN_PROGRESS" || !round.startedAt) {
      return round?.crashPointHundredths ? round.crashPointHundredths / 100 : 1.0;
    }

    const startedAt = new Date(round.startedAt).getTime();
    const elapsedMs = Math.max(0, Date.now() - startedAt);
    const elapsedSeconds = elapsedMs / 1000;

    // Formula: e^(0.06 * t), same as server-side logic
    const raw = Math.exp(0.06 * elapsedSeconds);
    return Math.floor(raw * 100) / 100;
  }, [round]);

  useEffect(() => {
    if (!round || round.status !== "IN_PROGRESS") {
      setMultiplier(calculateMultiplier());
      return;
    }

    let animationFrameId: number;

    function tick() {
      setMultiplier(calculateMultiplier());
      animationFrameId = requestAnimationFrame(tick);
    }

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [round, calculateMultiplier]);

  return multiplier;
}
