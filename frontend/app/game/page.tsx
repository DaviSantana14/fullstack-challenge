"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayerId } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import { useGameState } from "@/hooks/useGameState";
import { GamePanel } from "@/components/GamePanel";
import { BetControls } from "@/components/BetControls";
import { WalletDisplay } from "@/components/WalletDisplay";
import { CrashHistory } from "@/components/CrashHistory";
import { toast } from "sonner";

export default function GamePage() {
  const router = useRouter();
  const [devFundAmount, setDevFundAmount] = useState("1000");
  const showDevTools = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";

  useEffect(() => {
    if (!getPlayerId()) {
      router.push("/");
    }
  }, [router]);

  const {
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
    placeBet,
    cashout,
    fundWallet,
    createRound,
    startRound,
    crashRound,
    isPlacingBet,
    isCashingOut,
    isFundingWallet,
    isCreatingRound,
    isStartingRound,
    isCrashingRound,
  } = useGameState();

  // Toast notifications for bet status changes
  useEffect(() => {
    if (myBet?.status === "CASHED_OUT") {
      const payout = myBet.payoutInCents
        ? (parseInt(myBet.payoutInCents) / 100).toFixed(2)
        : "0.00";
      toast.success(`Cashout realizado! Ganhou R$ ${payout}`);
    }
    if (myBet?.status === "LOST") {
      toast.error("A rodada crashou! Aposta perdida.");
    }
  }, [myBet?.status, myBet?.payoutInCents]);

  async function handleDevFund() {
    const playerId = getPlayerId();

    if (!playerId) {
      toast.error("Jogador não identificado.");
      return;
    }

    try {
      await fundWallet({
        playerId,
        amountInCents: devFundAmount,
      });
      toast.success("Saldo adicionado com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao adicionar saldo.";

      if (message === "Wallet not found for this player.") {
        try {
          await apiPost("/wallets");
          await fundWallet({
            playerId,
            amountInCents: devFundAmount,
          });
          toast.success("Wallet criada e saldo adicionado com sucesso.");
          return;
        } catch (retryError) {
          toast.error(
            retryError instanceof Error
              ? retryError.message
              : "Erro ao criar wallet e adicionar saldo.",
          );
          return;
        }
      }

      toast.error(message);
    }
  }

  async function handleCreateRound() {
    try {
      await createRound();
      toast.success("Round criada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar round.");
    }
  }

  async function handleStartRound() {
    try {
      await startRound();
      toast.success("Round iniciada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar round.");
    }
  }

  async function handleCrashRound() {
    try {
      await crashRound();
      toast.success("Round crashada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao crashar round.");
    }
  }

  const roundStatusLabel =
    !round
      ? "Sem rodada ativa"
      : round.status === "BETTING"
      ? "Aceitando apostas"
      : round.status === "IN_PROGRESS"
      ? "Em andamento"
      : round.status === "CRASHED"
      ? "Crashou"
      : "Status desconhecido";

  const roundStatusColor =
    round?.status === "BETTING"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : round?.status === "IN_PROGRESS"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : round?.status === "CRASHED"
      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
      : "bg-white/5 text-neutral-300 border-white/10";

  const canCreateRound = !round || round.status === "CRASHED";
  const canStartRound = round?.status === "BETTING";
  const canCrashRound = round?.status === "IN_PROGRESS";
  const isRoundActionPending = isCreatingRound || isStartingRound || isCrashingRound;

  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎰</span>
          <h1 className="text-lg font-bold">Crash Game</h1>
        </div>
        <WalletDisplay balanceInCents={wallet?.balanceInCents ?? null} />
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-4 sm:px-6">
        {/* Crash history */}
        <div className="mb-4">
          <CrashHistory history={history} />
        </div>

        {/* Game panel */}
        <div className="mb-4">
          <GamePanel
            multiplier={multiplier}
            status={round?.status ?? null}
            crashPoint={round?.crashPointHundredths ?? null}
          />
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">Rodada atual</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {round ? `#${round.roundNumber}` : "Nenhuma rodada ativa"}
              </div>
            </div>
            <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${roundStatusColor}`}>
              {roundStatusLabel}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-xs text-neutral-500">Pode apostar?</div>
              <div className="mt-1 text-sm font-semibold text-white">{canBet ? "Sim" : "Não"}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-xs text-neutral-500">Pode cashout?</div>
              <div className="mt-1 text-sm font-semibold text-white">{canCashout ? "Sim" : "Não"}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-xs text-neutral-500">Sua bet</div>
              <div className="mt-1 text-sm font-semibold text-white">{myBet?.status ?? "Nenhuma"}</div>
            </div>
          </div>
        </div>

        {/* Seed hash display */}
        {round?.serverSeedHash && (
          <div className="mb-4 text-center">
            <span className="text-xs text-neutral-500">
              Seed: {round.serverSeedHash.slice(0, 16)}...
            </span>
          </div>
        )}

        {/* Bet controls */}
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          canBet={canBet}
          canCashout={canCashout}
          isPending={isPending}
          multiplier={multiplier}
          onPlaceBet={() => placeBet(betAmount)}
          onCashout={cashout}
          isPlacingBet={isPlacingBet}
          isCashingOut={isCashingOut}
          myBetAmount={myBet?.amountInCents ?? null}
          myBetStatus={myBet?.status ?? null}
        />

        {/* My bet info */}
        {myBet && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-400">Sua aposta</div>
                <div className="text-sm font-semibold">
                  R$ {(parseInt(myBet.amountInCents) / 100).toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-400">Status</div>
                <div
                  className={`text-sm font-semibold ${
                    myBet.status === "CASHED_OUT"
                      ? "text-emerald-400"
                      : myBet.status === "LOST"
                      ? "text-red-400"
                      : myBet.status === "ACCEPTED"
                      ? "text-yellow-400"
                      : "text-neutral-400"
                  }`}
                >
                  {myBet.status === "CASHED_OUT"
                    ? "CASHOUT"
                    : myBet.status === "LOST"
                    ? "PERDIDO"
                    : myBet.status === "ACCEPTED"
                    ? "ATIVO"
                    : myBet.status === "PENDING"
                    ? "PENDENTE"
                    : myBet.status === "CASHOUT_PENDING"
                    ? "PROCESSANDO"
                    : myBet.status}
                </div>
              </div>
            </div>
            {myBet.cashoutMultiplierHundredths && (
              <div className="mt-2 text-xs text-emerald-400">
                Multiplicador: {(myBet.cashoutMultiplierHundredths / 100).toFixed(2)}x
              </div>
            )}
            {myBet.payoutInCents && (
              <div className="mt-1 text-xs text-emerald-400">
                Payout: R$ {(parseInt(myBet.payoutInCents) / 100).toFixed(2)}
              </div>
            )}
          </div>
        )}

        {showDevTools && (
          <div className="mt-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
            <div className="mb-3 text-sm font-semibold text-amber-300">Dev tools</div>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCreateRound}
                disabled={isRoundActionPending || !canCreateRound}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
              >
                {isCreatingRound ? "Criando..." : "Criar round"}
              </button>
              <button
                type="button"
                onClick={handleStartRound}
                disabled={isRoundActionPending || !canStartRound}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {isStartingRound ? "Iniciando..." : "Iniciar round"}
              </button>
              <button
                type="button"
                onClick={handleCrashRound}
                disabled={isRoundActionPending || !canCrashRound}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                {isCrashingRound ? "Crashando..." : "Crashar round"}
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="number"
                min="1"
                value={devFundAmount}
                onChange={(e) => setDevFundAmount(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
                placeholder="amountInCents"
              />
              <button
                type="button"
                onClick={handleDevFund}
                disabled={isFundingWallet}
                className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                {isFundingWallet ? "Adicionando..." : "Adicionar saldo"}
              </button>
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              Valor em centavos. Ex.: 1000 = R$ 10,00
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
