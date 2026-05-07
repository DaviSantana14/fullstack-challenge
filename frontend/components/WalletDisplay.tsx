"use client";

interface WalletDisplayProps {
  balanceInCents: string | null;
}

export function WalletDisplay({ balanceInCents }: WalletDisplayProps) {
  const balance = balanceInCents ? (parseInt(balanceInCents) / 100).toFixed(2) : "0.00";

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2 backdrop-blur">
      <span className="text-lg">💰</span>
      <div>
        <div className="text-xs text-neutral-400">Saldo</div>
        <div className="text-sm font-bold text-emerald-400">R$ {balance}</div>
      </div>
    </div>
  );
}
