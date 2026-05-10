import type { RoundMultiplierSnapshot } from "@/types/game";

const MULTIPLIER_GROWTH_RATE = 0.06;

export function getMultiplierFromElapsedMs(elapsedMs: number): number {
  const elapsedSeconds = Math.max(0, elapsedMs) / 1000;
  const raw = Math.exp(MULTIPLIER_GROWTH_RATE * elapsedSeconds);
  return Math.max(1, Math.floor(raw * 100) / 100);
}

type CalculateDisplayMultiplierInput = {
  startedAt: string;
  nowMs: number;
  snapshot?: RoundMultiplierSnapshot;
  roundId?: string;
};

export function calculateDisplayMultiplier({
  startedAt,
  nowMs,
  snapshot,
  roundId,
}: CalculateDisplayMultiplierInput): number {
  const startedAtMs = new Date(startedAt).getTime();
  const localMultiplier = getMultiplierFromElapsedMs(nowMs - startedAtMs);

  if (!snapshot || snapshot.roundId !== roundId) {
    return localMultiplier;
  }

  return Math.max(localMultiplier, snapshot.multiplierHundredths / 100);
}
