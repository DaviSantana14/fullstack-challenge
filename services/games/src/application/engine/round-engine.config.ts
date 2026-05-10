export interface RoundEngineConfig {
  enabled: boolean;
  bettingWindowMs: number;
  restartDelayMs: number;
}

export function getRoundEngineConfig(): RoundEngineConfig {
  return {
    enabled: process.env.ROUND_ENGINE_ENABLED !== "false",
    bettingWindowMs: parseSecondsEnv("ROUND_BETTING_SECONDS", 10) * 1000,
    restartDelayMs: parseSecondsEnv("ROUND_RESTART_DELAY_SECONDS", 3) * 1000,
  };
}

function parseSecondsEnv(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
