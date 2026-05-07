"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPlayerId } from "@/lib/auth";
import { useGameState } from "@/hooks/useGameState";
import { GamePanel } from "@/components/GamePanel";
import { BetControls } from "@/components/BetControls";
import { WalletDisplay } from "@/components/WalletDisplay";
import { CrashHistory } from "@/components/CrashHistory";
import { toast } from "sonner";

export default function GamePage() {
  const router = useRouter();

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
    isPlacingBet,
    isCashingOut,
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
      </div>
    </main>
  );
}
