export function getMultiplierHundredths(elapsedMs: number): number {
  const elapsedSeconds = elapsedMs / 1000;
  const raw = Math.exp(0.06 * elapsedSeconds);
  return Math.max(100, Math.floor(raw * 100));
}
