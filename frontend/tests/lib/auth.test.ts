import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  getSession,
  clearSession,
  getPlayerId,
  getUsername,
  isAuthenticated,
} from "@/lib/auth";

describe("auth utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getSession / clearSession", () => {
    test("returns null when no session", () => {
      expect(getSession()).toBeNull();
    });

    test("parses valid session from localStorage", () => {
      const session = {
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 3600_000,
        playerId: "player-1",
        username: "player",
      };
      localStorage.setItem("crashGameAuthSession", JSON.stringify(session));

      expect(getSession()).toEqual(session);
    });

    test("returns null and clears corrupted session", () => {
      localStorage.setItem("crashGameAuthSession", "not-json");
      expect(getSession()).toBeNull();
      expect(localStorage.getItem("crashGameAuthSession")).toBeNull();
    });

    test("clearSession removes session and pkce", () => {
      localStorage.setItem("crashGameAuthSession", "{}");
      localStorage.setItem("crashGamePkce", "{}");
      clearSession();
      expect(localStorage.getItem("crashGameAuthSession")).toBeNull();
      expect(localStorage.getItem("crashGamePkce")).toBeNull();
    });
  });

  describe("getPlayerId / getUsername", () => {
    test("returns null when no session", () => {
      expect(getPlayerId()).toBeNull();
      expect(getUsername()).toBeNull();
    });

    test("extracts playerId and username from session", () => {
      const session = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: Date.now() + 3600_000,
        playerId: "p-123",
        username: "gambler",
      };
      localStorage.setItem("crashGameAuthSession", JSON.stringify(session));

      expect(getPlayerId()).toBe("p-123");
      expect(getUsername()).toBe("gambler");
    });
  });

  describe("isAuthenticated", () => {
    test("returns false when no session", () => {
      expect(isAuthenticated()).toBe(false);
    });

    test("returns true for valid non-expired session", () => {
      const session = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: Date.now() + 3600_000,
        playerId: "p-1",
        username: "u",
      };
      localStorage.setItem("crashGameAuthSession", JSON.stringify(session));
      expect(isAuthenticated()).toBe(true);
    });

    test("returns false for expired session", () => {
      const session = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: Date.now() - 1000,
        playerId: "p-1",
        username: "u",
      };
      localStorage.setItem("crashGameAuthSession", JSON.stringify(session));
      expect(isAuthenticated()).toBe(false);
    });
  });
});
