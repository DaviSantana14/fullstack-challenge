"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GamePanelProps {
  multiplier: number;
  status: string | null;
  crashPoint: number | null;
  isLoading?: boolean;
}

export function GamePanel({
  multiplier,
  status,
  crashPoint,
  isLoading = false,
}: GamePanelProps) {
  const isLive = status === "IN_PROGRESS";
  const isCrashed = status === "CRASHED";
  const isBetting = status === "BETTING" || !status;

  const displayMultiplier = multiplier.toFixed(2);
  const curveProgress = isLive
    ? Math.min(100, Math.max(8, (multiplier / 8) * 100))
    : isCrashed
      ? 100
      : 8;

  const curveColor = isLive
    ? "text-primary"
    : isCrashed
      ? "text-destructive"
      : "text-accent";

  return (
    <Card
      className={cn(
        "relative min-h-[23rem] justify-center overflow-hidden border-border bg-card/80 shadow-2xl shadow-black/30 backdrop-blur",
        isLive && "ring-1 ring-primary/30",
        isCrashed && "ring-1 ring-destructive/30",
      )}
    >
      <CardContent className="relative flex min-h-[21rem] flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-8 right-8 size-40 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="absolute right-4 top-4 z-10">
          <Badge
            variant="outline"
            className={cn(
              "gap-2 border-border bg-background/60 uppercase tracking-wide backdrop-blur",
              isLive && "border-primary/30 text-primary",
              isCrashed && "border-destructive/30 text-destructive",
              isBetting && "border-accent/30 text-accent",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                isLive && "animate-pulse bg-primary",
                isCrashed && "bg-destructive",
                isBetting && "bg-accent",
              )}
            />
            {isLive ? "Live" : isCrashed ? "Crash" : "Betting"}
          </Badge>
        </div>

        <motion.div
          className={cn(
            "relative z-10 text-7xl font-black tracking-normal sm:text-8xl",
            curveColor,
          )}
          animate={
            isLoading
              ? { opacity: [0.4, 1, 0.4] }
              : isLive
                ? { scale: [1, 1.025, 1], textShadow: "0 0 28px currentColor" }
                : isCrashed
                  ? { scale: [1.08, 0.98, 1] }
                  : {}
          }
          transition={{ duration: isCrashed ? 0.35 : 0.7, repeat: isLive || isLoading ? Infinity : 0 }}
        >
          {displayMultiplier}x
        </motion.div>

        {isCrashed && crashPoint && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-3 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1 text-sm font-semibold text-destructive"
          >
            Crashou em {(crashPoint / 100).toFixed(2)}x
          </motion.div>
        )}

        <div className="relative z-10 mt-10 w-full max-w-md">
          <svg
            aria-hidden="true"
            viewBox="0 0 420 150"
            className="h-32 w-full overflow-visible"
          >
            <path
              d="M 16 130 C 120 132, 190 115, 250 78 S 340 18, 404 18"
              fill="none"
              stroke="currentColor"
              strokeDasharray="6 10"
              strokeOpacity="0.18"
              strokeWidth="3"
              className={curveColor}
            />
            <motion.path
              d="M 16 130 C 120 132, 190 115, 250 78 S 340 18, 404 18"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="5"
              className={curveColor}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: curveProgress / 100 }}
              transition={{ duration: isLive ? 0.15 : 0.45 }}
              style={{ filter: "drop-shadow(0 0 14px currentColor)" }}
            />
            <motion.circle
              cx={16 + (388 * curveProgress) / 100}
              cy={130 - (112 * Math.pow(curveProgress / 100, 1.8))}
              r="6"
              fill="currentColor"
              className={curveColor}
              animate={isLive ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
          </svg>

          <Progress value={curveProgress} className="mt-1 h-1.5 bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
