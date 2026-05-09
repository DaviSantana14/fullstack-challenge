import type { Bet } from "@/types/game";

interface RoundBetsProps {
  bets: Bet[];
}

function formatMoney(amountInCents: string | null): string {
  if (!amountInCents) {
    return "-";
  }

  return `R$ ${(Number.parseInt(amountInCents, 10) / 100).toFixed(2)}`;
}

function statusLabel(status: Bet["status"]): string {
  switch (status) {
    case "ACCEPTED":
      return "Ativa";
    case "PENDING":
      return "Pendente";
    case "CASHOUT_PENDING":
      return "Cashout...";
    case "CASHED_OUT":
      return "Cashout";
    case "LOST":
      return "Perdida";
    case "REJECTED":
      return "Rejeitada";
    default:
      return status;
  }
}

function statusClass(status: Bet["status"]): string {
  switch (status) {
    case "ACCEPTED":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "CASHED_OUT":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "LOST":
    case "REJECTED":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    case "PENDING":
    case "CASHOUT_PENDING":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    default:
      return "border-white/10 bg-white/5 text-neutral-200";
  }
}

export function RoundBets({ bets }: RoundBetsProps) {
  const visibleBets = bets.slice(0, 12);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Apostas da rodada
          </div>
          <div className="mt-1 text-sm text-neutral-400">
            {bets.length === 0 ? "Nenhuma aposta registrada" : `${bets.length} aposta${bets.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
          Live
        </div>
      </div>

      <div className="space-y-2">
        {visibleBets.map((bet) => (
          <div
            key={bet.id}
            className="grid grid-cols-[1fr_auto] gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {bet.playerId}
              </div>
              <div className="mt-0.5 text-xs text-neutral-500">
                {formatMoney(bet.amountInCents)}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(bet.status)}`}>
                {statusLabel(bet.status)}
              </span>
              {bet.cashoutMultiplierHundredths && (
                <span className="text-xs text-emerald-300">
                  {(bet.cashoutMultiplierHundredths / 100).toFixed(2)}x
                </span>
              )}
              {bet.payoutInCents && (
                <span className="text-xs text-emerald-400">
                  {formatMoney(bet.payoutInCents)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
