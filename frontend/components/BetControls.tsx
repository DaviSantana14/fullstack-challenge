"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Zap } from "lucide-react";

interface BetControlsProps {
  betAmount: string;
  setBetAmount: (value: string) => void;
  isAutoCashoutEnabled: boolean;
  setIsAutoCashoutEnabled: (value: boolean) => void;
  autoCashoutMultiplier: string;
  setAutoCashoutMultiplier: (value: string) => void;
  canBet: boolean;
  canCashout: boolean;
  isPending: boolean;
  multiplier: number;
  onPlaceBet: (input: {
    amountInCents: string;
    autoCashoutMultiplierHundredths?: number;
  }) => void | Promise<unknown>;
  onCashout: () => void | Promise<unknown>;
  isPlacingBet: boolean;
  isCashingOut: boolean;
  myBetAmount: string | null;
  myBetStatus: string | null;
}

const QUICK_AMOUNTS = ["1", "2.50", "5", "10"];

function moneyToCents(value: string): number | null {
  const normalizedValue = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{0,2})?$/.test(normalizedValue)) {
    return null;
  }

  const amount = Number.parseFloat(normalizedValue);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100);
}

function multiplierToHundredths(value: string): number | null {
  const normalizedValue = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{0,2})?$/.test(normalizedValue)) {
    return null;
  }

  const multiplier = Number.parseFloat(normalizedValue);

  if (!Number.isFinite(multiplier)) {
    return null;
  }

  return Math.round(multiplier * 100);
}

export function BetControls({
  betAmount,
  setBetAmount,
  isAutoCashoutEnabled,
  setIsAutoCashoutEnabled,
  autoCashoutMultiplier,
  setAutoCashoutMultiplier,
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
  async function handlePlaceBet() {
    const amountInCents = moneyToCents(betAmount);

    if (amountInCents === null || amountInCents < 100) {
      toast.error("Aposta mínima: R$ 1,00");
      return;
    }

    if (amountInCents > 100000) {
      toast.error("Aposta máxima: R$ 1.000,00");
      return;
    }

    const autoCashoutMultiplierHundredths = isAutoCashoutEnabled
      ? multiplierToHundredths(autoCashoutMultiplier)
      : null;

    if (isAutoCashoutEnabled) {
      if (
        autoCashoutMultiplierHundredths === null ||
        autoCashoutMultiplierHundredths < 101
      ) {
        toast.error("Auto cashout mínimo: 1.01x");
        return;
      }

      if (autoCashoutMultiplierHundredths > 100000) {
        toast.error("Auto cashout máximo: 1000.00x");
        return;
      }
    }

    try {
      await onPlaceBet({
        amountInCents: amountInCents.toString(),
        ...(autoCashoutMultiplierHundredths !== null
          ? { autoCashoutMultiplierHundredths }
          : {}),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao apostar.");
    }
  }

  async function handleCashout() {
    try {
      await onCashout();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao realizar cashout.");
    }
  }

  const potentialPayout = myBetAmount
    ? ((BigInt(myBetAmount) * BigInt(Math.floor(multiplier * 100))) / BigInt(100)).toString()
    : "0";

  return (
    <Card className="border-border bg-card/85 shadow-xl shadow-black/20 backdrop-blur">
      <CardHeader>
        <CardTitle>Controle de aposta</CardTitle>
        <CardDescription>Digite o valor em reais. O backend valida os limites finais.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="bet-amount" className="text-sm font-medium text-muted-foreground">
            Valor da aposta
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id="bet-amount"
              type="number"
              min="1"
              max="1000"
              step="0.01"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={!canBet}
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(amount)}
              disabled={!canBet}
              className="h-9"
            >
              R$ {Number.parseFloat(amount).toFixed(2)}
            </Button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">Auto cashout</div>
              <div className="text-xs text-muted-foreground">
                Sacar automaticamente ao atingir o alvo
              </div>
            </div>
            <Button
              type="button"
              variant={isAutoCashoutEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setIsAutoCashoutEnabled(!isAutoCashoutEnabled)}
              disabled={!canBet}
              aria-pressed={isAutoCashoutEnabled}
            >
              {isAutoCashoutEnabled ? "Ligado" : "Desligado"}
            </Button>
          </div>

          {isAutoCashoutEnabled && (
            <div className="mt-3 flex flex-col gap-2">
              <label htmlFor="auto-cashout-multiplier" className="text-sm font-medium text-muted-foreground">
                Alvo
              </label>
              <div className="relative">
                <Input
                  id="auto-cashout-multiplier"
                  type="number"
                  min="1.01"
                  max="1000"
                  step="0.01"
                  value={autoCashoutMultiplier}
                  onChange={(e) => setAutoCashoutMultiplier(e.target.value)}
                  disabled={!canBet}
                  className="h-10 pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  x
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row">
          {canBet && (
            <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                type="button"
                onClick={handlePlaceBet}
                disabled={isPlacingBet}
                className="h-12 w-full shadow-lg shadow-primary/20"
              >
                <Zap data-icon="inline-start" />
                {isPlacingBet ? "Apostando..." : "Apostar"}
              </Button>
            </motion.div>
          )}

          {canCashout && (
            <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                type="button"
                onClick={handleCashout}
                disabled={isCashingOut}
                className="h-12 w-full bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90"
              >
                {isCashingOut ? "Processando..." : `Cashout ${multiplier.toFixed(2)}x`}
              </Button>
            </motion.div>
          )}

          {isPending && (
            <Badge variant="outline" className="flex h-12 flex-1 items-center justify-center border-sky-400/30 bg-sky-400/10 text-sky-300">
              Processando...
            </Badge>
          )}

          {!canBet && !canCashout && !isPending && myBetStatus === "CASHED_OUT" && (
            <Badge className="flex h-12 flex-1 items-center justify-center bg-primary/15 text-primary ring-1 ring-primary/20">
              Cashout realizado
            </Badge>
          )}

          {!canBet && !canCashout && !isPending && myBetStatus === "LOST" && (
            <Badge variant="destructive" className="flex h-12 flex-1 items-center justify-center">
              Aposta perdida
            </Badge>
          )}
        </div>

        {canCashout && myBetAmount && (
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-center text-sm text-muted-foreground">
            Potencial:{" "}
            <span className="font-semibold text-primary">
              R$ {(parseInt(potentialPayout) / 100).toFixed(2)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
