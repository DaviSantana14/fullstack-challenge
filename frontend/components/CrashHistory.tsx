"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RoundHistoryItem } from "@/types/game";

interface CrashHistoryProps {
  history: RoundHistoryItem[];
  isLoading?: boolean;
}

export function CrashHistory({ history, isLoading = false }: CrashHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-hidden pb-1">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-8 min-w-14 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {history.map((item, index) => {
        const crashPoint = item.crashPointHundredths
          ? item.crashPointHundredths / 100
          : 0;
        const isHigh = crashPoint >= 2.0;
        const isMedium = crashPoint >= 1.5 && crashPoint < 2.0;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            className={`flex h-8 min-w-14 items-center justify-center rounded-lg text-xs font-bold ring-1 ${
              isHigh
                ? "bg-primary/15 text-primary ring-primary/20"
                : isMedium
                  ? "bg-accent/15 text-accent ring-accent/20"
                  : "bg-destructive/15 text-destructive ring-destructive/20"
            }`}
          >
            {crashPoint.toFixed(2)}x
          </motion.div>
        );
      })}

      {history.length === 0 && (
        <Badge variant="outline" className="text-muted-foreground">
          Nenhum histórico ainda
        </Badge>
      )}
    </div>
  );
}
