"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletCards } from "lucide-react";

interface WalletDisplayProps {
  balanceInCents: string | null;
  isLoading?: boolean;
}

export function WalletDisplay({ balanceInCents, isLoading = false }: WalletDisplayProps) {
  const balance = balanceInCents ? (parseInt(balanceInCents) / 100).toFixed(2) : "0.00";

  return (
    <div className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-2 shadow-lg shadow-black/20 backdrop-blur">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
        <WalletCards aria-hidden="true" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Saldo</div>
        {isLoading ? (
          <Skeleton className="mt-1 h-4 w-20" />
        ) : (
          <Badge className="mt-1 bg-primary/15 text-primary ring-1 ring-primary/20">
            R$ {balance}
          </Badge>
        )}
      </div>
    </div>
  );
}
