import { createHmac } from "crypto";

export function calculateCrashPoint(serverSeed: string): number {
  const hash = createHmac("sha256", serverSeed)
    .update("crash-game-salt")
    .digest("hex");

  const seed = parseInt(hash.substring(0, 13), 16);

  // Handle edge case: seed === 0 → return max cap
  if (seed === 0) {
    return 100_000;
  }

  const max = Math.pow(2, 52);
  const result = seed / max;

  // House edge: 1% — crash point = 0.99 / result
  const crashPoint = Math.floor((0.99 / result) * 100);

  return Math.max(100, Math.min(crashPoint, 100_000));
}
