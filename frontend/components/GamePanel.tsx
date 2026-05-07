"use client";

import { motion } from "framer-motion";

interface GamePanelProps {
  multiplier: number;
  status: string | null;
  crashPoint: number | null;
}

export function GamePanel({ multiplier, status, crashPoint }: GamePanelProps) {
  const isLive = status === "IN_PROGRESS";
  const isCrashed = status === "CRASHED";

  const displayMultiplier = multiplier.toFixed(2);

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur">
      {/* Status indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            isLive
              ? "animate-pulse bg-emerald-500"
              : isCrashed
              ? "bg-red-500"
              : "bg-yellow-500"
          }`}
        />
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          {isLive ? "LIVE" : isCrashed ? "CRASHED" : "BETTING"}
        </span>
      </div>

      {/* Multiplier display */}
      <motion.div
        className={`text-7xl font-bold tracking-tighter sm:text-8xl ${
          isLive
            ? "text-emerald-400"
            : isCrashed
            ? "text-red-500"
            : "text-white"
        }`}
        animate={isLive ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        {displayMultiplier}x
      </motion.div>

      {/* Crash point display */}
      {isCrashed && crashPoint && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-lg font-semibold text-red-400"
        >
          Crashou em {(crashPoint / 100).toFixed(2)}x
        </motion.div>
      )}

      {/* Curve visualization placeholder */}
      <div className="mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={`h-full rounded-full ${
            isLive ? "bg-emerald-500" : isCrashed ? "bg-red-500" : "bg-yellow-500"
          }`}
          animate={
            isLive
              ? { width: `${Math.min(100, (multiplier / 10) * 100)}%` }
              : { width: isCrashed ? "100%" : "0%" }
          }
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
}
