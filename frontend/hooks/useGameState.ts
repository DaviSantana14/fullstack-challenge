"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";
import type { Round, Bet, Wallet, RoundHistoryItem } from "@/types/game";

function useCurrentRound() {
  return useQuery({
    queryKey: ["round", "current"],
    queryFn: async () => {
      const response = await apiGet<{ round: Round | null }>("/games/rounds/current");
      return response.round;
    },
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
    queryFn: async () => {
      const response = await apiGet<{ bet: Bet | null }>("/games/bets/me/current");
      return response.bet;
    },
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
    queryFn: async () => {
      try {
        return await apiGet<Wallet>("/wallets/me");
      } catch (error) {
        if (error instanceof Error && error.message === "Wallet not found for this player.") {
          return apiPost<Wallet>("/wallets");
        }

        throw error;
      }
    },
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

function useCurrentRoundBets() {
  return useQuery({
    queryKey: ["bets", "current-round"],
    queryFn: () => apiGet<Bet[]>("/games/bets/current-round"),
    refetchInterval: 3000,
  });
}

export function useGameState() {
  const queryClient = useQueryClient();
  const [betAmount, setBetAmount] = useState<string>("2.50");

  async function refreshGameState(options?: { wallet?: boolean; history?: boolean; bets?: boolean }) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["round", "current"], exact: true }),
      queryClient.invalidateQueries({ queryKey: ["bet", "current"], exact: true }),
      options?.bets
        ? queryClient.invalidateQueries({ queryKey: ["bets", "current-round"], exact: true })
        : Promise.resolve(),
      options?.wallet
        ? queryClient.invalidateQueries({ queryKey: ["wallet"], exact: true })
        : Promise.resolve(),
      options?.history
        ? queryClient.invalidateQueries({ queryKey: ["rounds", "history"], exact: true })
        : Promise.resolve(),
    ]);
  }

  // WebSocket for real-time updates
  useWebSocket();

  const roundQuery = useCurrentRound();
  const myBetQuery = useMyCurrentBet();
  const walletQuery = useWallet();
  const historyQuery = useRoundHistory();
  const currentRoundBetsQuery = useCurrentRoundBets();

  const round = roundQuery.data ?? null;
  const myBet = myBetQuery.data ?? null;
  const wallet = walletQuery.data ?? null;
  const history = historyQuery.data ?? [];
  const bets = currentRoundBetsQuery.data ?? [];

  const placeBetMutation = useMutation({
    mutationFn: (amountInCents: string) =>
      apiPost<Bet>("/games/bets", { amountInCents }),
    onSuccess: async () => {
      await refreshGameState({ wallet: true, bets: true });
    },
  });

  const cashoutMutation = useMutation({
    mutationFn: () => apiPost<Bet>("/games/bets/me/current/cashout", {}),
    onSuccess: async () => {
      await refreshGameState({ wallet: true, bets: true });
    },
  });

  const fundWalletMutation = useMutation({
    mutationFn: async (input: { playerId: string; amountInCents: string }) => {
      const response = await fetch("/api/dev/wallet/fund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const payload = await response.json().catch(() => ({ message: "Unknown error" }));

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      return payload;
    },
    onSuccess: async () => {
      await refreshGameState({ wallet: true });
    },
  });

  const createRoundMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/dev/rounds/create", { method: "POST" });
      const payload = await response.json().catch(() => ({ message: "Unknown error" }));
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      return payload;
    },
    onSuccess: async () => {
      await refreshGameState({ history: true });
    },
  });

  const startRoundMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/dev/rounds/start", { method: "POST" });
      const payload = await response.json().catch(() => ({ message: "Unknown error" }));
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      return payload;
    },
    onSuccess: async () => {
      await refreshGameState();
    },
  });

  const crashRoundMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/dev/rounds/crash", { method: "POST" });
      const payload = await response.json().catch(() => ({ message: "Unknown error" }));
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      return payload;
    },
    onSuccess: async () => {
      await refreshGameState({ wallet: true, history: true });
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
  const bettingCountdownMs = useBettingCountdown(round);

  return {
    round,
    myBet,
    wallet,
    history,
    bets,
    bettingCountdownMs,
    betAmount,
    setBetAmount,
    multiplier,
    canBet,
    canCashout,
    isPending,
    placeBet: placeBetMutation.mutateAsync,
    cashout: cashoutMutation.mutateAsync,
    fundWallet: fundWalletMutation.mutateAsync,
    createRound: createRoundMutation.mutateAsync,
    startRound: startRoundMutation.mutateAsync,
    crashRound: crashRoundMutation.mutateAsync,
    isPlacingBet: placeBetMutation.isPending,
    isCashingOut: cashoutMutation.isPending,
    isFundingWallet: fundWalletMutation.isPending,
    isCreatingRound: createRoundMutation.isPending,
    isStartingRound: startRoundMutation.isPending,
    isCrashingRound: crashRoundMutation.isPending,
    isRoundLoading: roundQuery.isLoading,
    isBetLoading: myBetQuery.isLoading,
    isWalletLoading: walletQuery.isLoading,
    isHistoryLoading: historyQuery.isLoading,
    isBetsLoading: currentRoundBetsQuery.isLoading,
    roundError: roundQuery.error,
    betError: myBetQuery.error,
    walletError: walletQuery.error,
    historyError: historyQuery.error,
    betsError: currentRoundBetsQuery.error,
  };
}

function useBettingCountdown(round: Round | null): number | null {
  const [countdownMs, setCountdownMs] = useState<number | null>(null);

  useEffect(() => {
    if (!round || round.status !== "BETTING") {
      return;
    }

    const bettingClosesAt = round.bettingClosesAt;

    function tick() {
      const remainingMs = new Date(bettingClosesAt).getTime() - Date.now();
      setCountdownMs(Math.max(0, remainingMs));
    }

    const timeoutId = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, 250);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [round]);

  return round?.status === "BETTING" ? countdownMs : null;
}

function useMultiplier(round: Round | null): number {
  const [multiplier, setMultiplier] = useState(1.0);
  const queryClient = useQueryClient();

  const calculateMultiplier = useCallback(() => {
    if (!round || round.status !== "IN_PROGRESS" || !round.startedAt) {
      return round?.crashPointHundredths ? round.crashPointHundredths / 100 : 1.0;
    }

    // Prefer authoritative server value when available
    const serverHundredths = queryClient.getQueryData<number>([
      "round",
      "multiplier",
    ]);
    if (serverHundredths !== undefined) {
      return serverHundredths / 100;
    }

    const startedAt = new Date(round.startedAt).getTime();
    const elapsedMs = Math.max(0, Date.now() - startedAt);
    const elapsedSeconds = elapsedMs / 1000;

    // Formula: e^(0.06 * t), must match server-side getMultiplierHundredths exactly
    const raw = Math.exp(0.06 * elapsedSeconds);
    return Math.max(1.0, Math.floor(raw * 100) / 100);
  }, [round, queryClient]);

  useEffect(() => {
    if (!round || round.status !== "IN_PROGRESS") {
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

  return round?.status === "IN_PROGRESS" ? multiplier : calculateMultiplier();
}
