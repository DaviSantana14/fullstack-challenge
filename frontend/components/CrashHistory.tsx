"use client";

import { motion } from "framer-motion";
import type { RoundHistoryItem } from "@/types/game";

interface CrashHistoryProps {
  history: RoundHistoryItem[];
}

export function CrashHistory({ history }: CrashHistoryProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2">
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
            className={`flex h-8 min-w-[3rem] items-center justify-center rounded-lg text-xs font-bold ${
              isHigh
                ? "bg-emerald-500/20 text-emerald-400"
                : isMedium
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {crashPoint.toFixed(2)}x
          </motion.div>
        );
      })}

      {history.length === 0 && (
        <div className="text-xs text-neutral-500">Nenhum histórico ainda</div>
      )}
    </div>
  );
}
