"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayerId, getUsername, isAuthenticated, logout } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import { useGameState } from "@/hooks/useGameState";
import { GamePanel } from "@/components/GamePanel";
import { BetControls } from "@/components/BetControls";
import { WalletDisplay } from "@/components/WalletDisplay";
import { CrashHistory } from "@/components/CrashHistory";
import { RoundBets } from "@/components/RoundBets";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Activity, Gamepad2, LogOut, Radio, ShieldCheck, User } from "lucide-react";

export default function GamePage() {
  const router = useRouter();
  const [devFundAmount, setDevFundAmount] = useState("1000");
  const showDevTools = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";
  const username = getUsername();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  const {
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
    isRoundLoading,
    isBetLoading,
    isWalletLoading,
    isHistoryLoading,
    isBetsLoading,
    roundError,
    betError,
    walletError,
    historyError,
    betsError,
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

  useEffect(() => {
    const errors = [roundError, betError, walletError, historyError, betsError].filter(Boolean);

    if (errors.length === 0) {
      return;
    }

    const firstError = errors[0];
    toast.error(firstError instanceof Error ? firstError.message : "Erro ao carregar dados do jogo.");
  }, [roundError, betError, walletError, historyError, betsError]);

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
      ? "border-accent/30 bg-accent/10 text-accent"
      : round?.status === "IN_PROGRESS"
        ? "border-primary/30 bg-primary/10 text-primary"
        : round?.status === "CRASHED"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-secondary text-secondary-foreground";

  const canCreateRound = !round || round.status === "CRASHED";
  const canStartRound = round?.status === "BETTING";
  const canCrashRound = round?.status === "IN_PROGRESS";
  const isRoundActionPending = isCreatingRound || isStartingRound || isCrashingRound;
  const bettingCountdownSeconds =
    bettingCountdownMs === null ? null : Math.ceil(bettingCountdownMs / 1000);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/75 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Gamepad2 aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold sm:text-lg">Crash Game</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Multiplayer em tempo real
              </p>
            </div>
          </div>
          <WalletDisplay
            balanceInCents={wallet?.balanceInCents ?? null}
            isLoading={isWalletLoading}
          />
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm sm:flex">
            <User size={16} aria-hidden="true" />
            <span className="max-w-32 truncate">{username ?? "player"}</span>
            <Button type="button" variant="ghost" size="icon" onClick={logout} aria-label="Sair">
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:py-6">
        <section className="flex min-w-0 flex-col gap-4">
          <Card className="border-border bg-card/80 shadow-xl shadow-black/20 backdrop-blur">
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>Últimos crashes encerrados</CardDescription>
            </CardHeader>
            <CardContent>
              <CrashHistory history={history} isLoading={isHistoryLoading} />
            </CardContent>
          </Card>

          <GamePanel
            multiplier={multiplier}
            status={round?.status ?? null}
            crashPoint={round?.crashPointHundredths ?? null}
            isLoading={isRoundLoading}
          />

          <Card className="border-border bg-card/80 shadow-xl shadow-black/20 backdrop-blur">
            <CardHeader>
              <CardTitle>Rodada atual</CardTitle>
              <CardDescription>
                {isRoundLoading
                  ? "Sincronizando estado"
                  : round
                    ? `Rodada #${round.roundNumber}`
                    : "Nenhuma rodada ativa"}
              </CardDescription>
              <CardAction>
                <Badge variant="outline" className={cn("border", roundStatusColor)}>
                  <Radio data-icon="inline-start" />
                  {roundStatusLabel}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard
                  label="Fecha em"
                  value={bettingCountdownSeconds === null ? "-" : `${bettingCountdownSeconds}s`}
                  isLoading={isRoundLoading}
                />
                <MetricCard label="Apostar" value={canBet ? "Sim" : "Não"} isLoading={isRoundLoading || isBetLoading} />
                <MetricCard label="Cashout" value={canCashout ? "Sim" : "Não"} isLoading={isRoundLoading || isBetLoading} />
                <MetricCard label="Sua bet" value={myBet?.status ?? "Nenhuma"} isLoading={isBetLoading} />
              </div>

              {round?.serverSeedHash && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck aria-hidden="true" />
                    <span className="truncate">Seed hash: {round.serverSeedHash}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <BetControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            canBet={canBet}
            canCashout={canCashout}
            isPending={isPending}
            multiplier={multiplier}
            onPlaceBet={(amountInCents) => placeBet(amountInCents)}
            onCashout={cashout}
            isPlacingBet={isPlacingBet}
            isCashingOut={isCashingOut}
            myBetAmount={myBet?.amountInCents ?? null}
            myBetStatus={myBet?.status ?? null}
          />

          {myBet && (
            <Card className="border-border bg-card/80 shadow-xl shadow-black/20 backdrop-blur">
              <CardHeader>
                <CardTitle>Sua aposta</CardTitle>
                <CardDescription>
                  R$ {(parseInt(myBet.amountInCents) / 100).toFixed(2)}
                </CardDescription>
                <CardAction>
                  <Badge
                    variant="outline"
                    className={cn(
                      myBet.status === "CASHED_OUT" && "border-primary/30 bg-primary/10 text-primary",
                      myBet.status === "LOST" && "border-destructive/30 bg-destructive/10 text-destructive",
                      myBet.status === "ACCEPTED" && "border-accent/30 bg-accent/10 text-accent",
                    )}
                  >
                    {formatBetStatus(myBet.status)}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {myBet.cashoutMultiplierHundredths && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Multiplicador</span>
                    <span className="font-semibold text-primary">
                      {(myBet.cashoutMultiplierHundredths / 100).toFixed(2)}x
                    </span>
                  </div>
                )}
                {myBet.payoutInCents && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Payout</span>
                    <span className="font-semibold text-primary">
                      R$ {(parseInt(myBet.payoutInCents) / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                {myBet.rejectionReason && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive">
                    {myBet.rejectionReason}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <RoundBets bets={bets} isLoading={isBetsLoading} />

          {showDevTools && (
            <Card className="border-dashed border-accent/35 bg-accent/5 shadow-xl shadow-black/20">
              <CardHeader>
                <CardTitle>Dev tools</CardTitle>
                <CardDescription>Controles locais para testar rodada e saldo.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateRound}
                    disabled={isRoundActionPending || !canCreateRound}
                  >
                    {isCreatingRound ? "Criando..." : "Criar round"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleStartRound}
                    disabled={isRoundActionPending || !canStartRound}
                  >
                    {isStartingRound ? "Iniciando..." : "Iniciar round"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleCrashRound}
                    disabled={isRoundActionPending || !canCrashRound}
                  >
                    {isCrashingRound ? "Crashando..." : "Crashar round"}
                  </Button>
                </div>
                <Separator />
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <Input
                    type="number"
                    min="1"
                    value={devFundAmount}
                    onChange={(e) => setDevFundAmount(e.target.value)}
                    placeholder="amountInCents"
                  />
                  <Button
                    type="button"
                    onClick={handleDevFund}
                    disabled={isFundingWallet}
                    className="sm:min-w-36 lg:min-w-0"
                  >
                    {isFundingWallet ? "Adicionando..." : "Adicionar saldo"}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Valor em centavos. Ex.: 1000 = R$ 10,00
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string;
  isLoading?: boolean;
}) {
  return (
    <div className="min-h-20 rounded-xl border border-border bg-secondary/60 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity aria-hidden="true" />
        {label}
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-5 w-16" />
      ) : (
        <div className="mt-2 truncate text-sm font-semibold text-foreground">{value}</div>
      )}
    </div>
  );
}

function formatBetStatus(status: string): string {
  switch (status) {
    case "CASHED_OUT":
      return "Cashout";
    case "LOST":
      return "Perdida";
    case "ACCEPTED":
      return "Ativa";
    case "PENDING":
      return "Pendente";
    case "CASHOUT_PENDING":
      return "Processando";
    case "REJECTED":
      return "Rejeitada";
    default:
      return status;
  }
}
