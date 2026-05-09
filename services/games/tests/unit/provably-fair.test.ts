import { describe, expect, test } from "bun:test";
import { calculateCrashPoint } from "../../src/domain/provably-fair/provably-fair.service";

describe("calculateCrashPoint", () => {
  test("is deterministic for the same server seed", () => {
    const seed = "5a7f9d2e8c4b1a0f6d3c9b8e7a2f1c0d";

    expect(calculateCrashPoint(seed)).toBe(calculateCrashPoint(seed));
  });

  test("never returns less than 1.00x", () => {
    const crashPointHundredths = calculateCrashPoint("low-crash-seed");

    expect(crashPointHundredths).toBeGreaterThanOrEqual(100);
  });

  test("never returns more than the configured cap", () => {
    const crashPointHundredths = calculateCrashPoint("high-crash-seed");

    expect(crashPointHundredths).toBeLessThanOrEqual(100_000);
  });

  test("keeps a stable value for a known seed", () => {
    expect(calculateCrashPoint("known-server-seed")).toBe(118);
  });
});
