const MULTIPLIER_GROWTH_RATE = 0.06;
const MIN_CRASH_DELAY_MS = 100;

export function getCrashDelayMs(
  crashPointHundredths: number,
  startedAt?: Date | null,
  now: Date = new Date(),
): number {
  const crashMultiplier = Math.max(1, crashPointHundredths / 100);
  const totalDelayMs = Math.max(
    MIN_CRASH_DELAY_MS,
    Math.ceil((Math.log(crashMultiplier) / MULTIPLIER_GROWTH_RATE) * 1000),
  );

  if (!startedAt) {
    return totalDelayMs;
  }

  const elapsedMs = now.getTime() - startedAt.getTime();
  return Math.max(0, totalDelayMs - elapsedMs);
}
