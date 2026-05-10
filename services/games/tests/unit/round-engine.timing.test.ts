import { describe, expect, test } from "bun:test";
import { getMultiplierHundredths } from "../../src/domain/multiplier/multiplier.service";
import { getCrashDelayMs } from "../../src/application/engine/round-engine.timing";

describe("getCrashDelayMs", () => {
  test("returns a minimum delay for a 1.00x crash", () => {
    expect(getCrashDelayMs(100)).toBe(100);
  });

  test("returns a positive delay compatible with the multiplier curve", () => {
    const delayMs = getCrashDelayMs(200);

    expect(delayMs).toBeGreaterThan(0);
    expect(getMultiplierHundredths(delayMs)).toBeGreaterThanOrEqual(200);
  });

  test("returns only the remaining delay when the round already started", () => {
    const now = new Date("2026-05-09T12:00:10.000Z");
    const startedAt = new Date("2026-05-09T12:00:00.000Z");
    const totalDelayMs = getCrashDelayMs(200);
    const remainingDelayMs = getCrashDelayMs(200, startedAt, now);

    expect(remainingDelayMs).toBe(Math.max(0, totalDelayMs - 10_000));
  });

  test("returns zero when the expected crash time has already passed", () => {
    const now = new Date("2026-05-09T12:01:00.000Z");
    const startedAt = new Date("2026-05-09T12:00:00.000Z");

    expect(getCrashDelayMs(200, startedAt, now)).toBe(0);
  });
});
