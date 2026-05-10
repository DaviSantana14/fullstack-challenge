import { describe, expect, test } from "bun:test";
import {
  calculateDisplayMultiplier,
  getMultiplierFromElapsedMs,
} from "@/lib/multiplier";
import type { RoundMultiplierSnapshot } from "@/types/game";

describe("multiplier display helpers", () => {
  test("starts at 1.00x", () => {
    expect(getMultiplierFromElapsedMs(0)).toBe(1);
  });

  test("progresses smoothly from elapsed time using server formula", () => {
    expect(getMultiplierFromElapsedMs(1000)).toBe(1.06);
    expect(getMultiplierFromElapsedMs(1100)).toBe(1.06);
    expect(getMultiplierFromElapsedMs(1200)).toBe(1.07);
  });

  test("ignores snapshots from another round", () => {
    const startedAt = new Date(1_000).toISOString();
    const snapshot: RoundMultiplierSnapshot = {
      roundId: "previous-round",
      multiplierHundredths: 250,
      serverTime: new Date(2_000).toISOString(),
      receivedAt: 2_000,
    };

    expect(
      calculateDisplayMultiplier({
        startedAt,
        nowMs: 2_000,
        snapshot,
        roundId: "current-round",
      }),
    ).toBe(1.06);
  });

  test("does not regress below a valid server snapshot", () => {
    const startedAt = new Date(1_000).toISOString();
    const snapshot: RoundMultiplierSnapshot = {
      roundId: "current-round",
      multiplierHundredths: 125,
      serverTime: new Date(2_000).toISOString(),
      receivedAt: 2_000,
    };

    expect(
      calculateDisplayMultiplier({
        startedAt,
        nowMs: 1_500,
        snapshot,
        roundId: "current-round",
      }),
    ).toBe(1.25);
  });
});
