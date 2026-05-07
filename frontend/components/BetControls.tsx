"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";

interface BetControlsProps {
  betAmount: string;
  setBetAmount: (value: string) => void;
  canBet: boolean;
  canCashout: boolean;
  isPending: boolean;
  multiplier: number;
  onPlaceBet: () => void;
  onCashout: () => void;
  isPlacingBet: boolean;
  isCashingOut: boolean;
  myBetAmount: string | null;
  myBetStatus: string | null;
}

const QUICK_AMOUNTS = ["100", "250", "500", "1000"];

export function BetControls({
  betAmount,
  setBetAmount,
  canBet,
  canCashout,
  isPending,
  multiplier,
  onPlaceBet,
  onCashout,
  isPlacingBet,
  isCashingOut,
  myBetAmount,
  myBetStatus,
}: BetControlsProps) {
  function handlePlaceBet() {
    const amount = parseInt(betAmount, 10);
    if (isNaN(amount) || amount < 1) {
      toast.error("Valor da aposta inválido");
      return;
    }
    if (amount > 100000) {
      toast.error("Aposta máxima: R$ 1.000,00");
      return;
    }
    onPlaceBet();
  }

  const potentialPayout = myBetAmount
    ? ((BigInt(myBetAmount) * BigInt(Math.floor(multiplier * 100))) / BigInt(100)).toString()
    : "0";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur">
      {/* Bet amount input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-400 mb-2">
          Valor da Aposta
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
            R$
          </span>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            disabled={!canBet}
            className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Quick amounts */}
      <div className="mb-4 flex gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            onClick={() => setBetAmount(amount)}
            disabled={!canBet}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            R$ {(parseInt(amount) / 100).toFixed(2)}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {canBet && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handlePlaceBet}
            disabled={isPlacingBet}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPlacingBet ? "Apostando..." : "Apostar"}
          </motion.button>
        )}

        {canCashout && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onCashout}
            disabled={isCashingOut}
            className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-900/20 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {isCashingOut
              ? "Processando..."
              : `Cashout ${multiplier.toFixed(2)}x`}
          </motion.button>
        )}

        {isPending && (
          <div className="flex-1 rounded-xl bg-white/5 py-3 text-center text-sm font-medium text-neutral-400">
            Processando...
          </div>
        )}

        {!canBet && !canCashout && !isPending && myBetStatus === "CASHED_OUT" && (
          <div className="flex-1 rounded-xl bg-emerald-500/10 py-3 text-center text-sm font-semibold text-emerald-400">
            Cashout realizado!
          </div>
        )}

        {!canBet && !canCashout && !isPending && myBetStatus === "LOST" && (
          <div className="flex-1 rounded-xl bg-red-500/10 py-3 text-center text-sm font-semibold text-red-400">
            Aposta perdida
          </div>
        )}
      </div>

      {/* Potential payout */}
      {canCashout && myBetAmount && (
        <div className="mt-3 text-center text-sm text-neutral-400">
          Potencial:{" "}
          <span className="font-semibold text-emerald-400">
            R$ {(parseInt(potentialPayout) / 100).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
