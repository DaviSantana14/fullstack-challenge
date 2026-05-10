import type { Bet } from "@/types/game";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface RoundBetsProps {
  bets: Bet[];
  isLoading?: boolean;
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

function statusVariant(status: Bet["status"]): string {
  switch (status) {
    case "ACCEPTED":
      return "border-accent/30 bg-accent/10 text-accent";
    case "CASHED_OUT":
      return "border-primary/30 bg-primary/10 text-primary";
    case "LOST":
    case "REJECTED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "PENDING":
    case "CASHOUT_PENDING":
      return "border-sky-400/30 bg-sky-400/10 text-sky-300";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

export function RoundBets({ bets, isLoading = false }: RoundBetsProps) {
  const visibleBets = bets.slice(0, 12);

  return (
    <Card className="border-border bg-card/80 shadow-xl shadow-black/20 backdrop-blur">
      <CardHeader>
        <CardTitle>Apostas da rodada</CardTitle>
        <CardDescription>
          {bets.length === 0 ? "Nenhuma aposta registrada" : `${bets.length} aposta${bets.length === 1 ? "" : "s"}`}
        </CardDescription>
        <CardAction>
          <Badge variant="outline" className="border-primary/30 text-primary">
            Live
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {isLoading &&
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}

        {!isLoading && visibleBets.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
            Aguardando as primeiras apostas.
          </div>
        )}

        {!isLoading &&
          visibleBets.map((bet) => (
            <div
              key={bet.id}
              className="grid min-h-14 grid-cols-[1fr_auto] gap-3 rounded-xl bg-secondary/60 px-3 py-2 ring-1 ring-border/70"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                  {bet.playerId}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {formatMoney(bet.amountInCents)}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className={statusVariant(bet.status)}>
                  {statusLabel(bet.status)}
                </Badge>
                {bet.cashoutMultiplierHundredths && (
                  <span className="text-xs text-primary">
                    {(bet.cashoutMultiplierHundredths / 100).toFixed(2)}x
                  </span>
                )}
                {bet.payoutInCents && (
                  <span className="text-xs text-primary">
                    {formatMoney(bet.payoutInCents)}
                  </span>
                )}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
