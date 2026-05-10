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

  test("is deterministic for the same server seed and client seed", () => {
    const seed = "server";
    const client = "client";

    expect(calculateCrashPoint(seed, client)).toBe(
      calculateCrashPoint(seed, client),
    );
  });

  test("produces different crash point with different client seed", () => {
    const seed = "server";

    const withoutClient = calculateCrashPoint(seed);
    const withClient = calculateCrashPoint(seed, "different-client");

    expect(withoutClient).not.toBe(withClient);
  });

  test("defaults to crash-game-salt when client seed is absent", () => {
    const seed = "known-server-seed";

    expect(calculateCrashPoint(seed)).toBe(calculateCrashPoint(seed, null));
    expect(calculateCrashPoint(seed)).toBe(calculateCrashPoint(seed, undefined));
  });
});
