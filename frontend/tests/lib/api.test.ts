import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { apiGet, apiPost } from "@/lib/api";

const mockFetch = mock(async (_input: string | URL | Request, _init?: RequestInit) =>
  new Response(),
);

describe("apiGet", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    globalThis.fetch = mockFetch as typeof fetch;
    // Set a valid session so getValidAccessToken returns a token
    localStorage.setItem(
      "crashGameAuthSession",
      JSON.stringify({
        accessToken: "test-token",
        refreshToken: null,
        expiresAt: Date.now() + 3600_000,
        playerId: "p-1",
        username: "u",
      }),
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("adds Authorization header when token exists", async () => {
    mockFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ id: "1" }), { status: 200 }),
    );

    await apiGet<{ id: string }>("/test");

    const call = mockFetch.mock.calls[0];
    const init = call[1] as RequestInit;
    expect(init.headers).toBeInstanceOf(Headers);
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  test("parses JSON on 200", async () => {
    mockFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const result = await apiGet<{ ok: boolean }>("/test");
    expect(result.ok).toBe(true);
  });

  test("throws on 401 and clears session", async () => {
    mockFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
    );

    await expect(apiGet("/test")).rejects.toThrow("Unauthorized");
    expect(localStorage.getItem("crashGameAuthSession")).toBeNull();
  });
});

describe("apiPost", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    globalThis.fetch = mockFetch as typeof fetch;
    localStorage.setItem(
      "crashGameAuthSession",
      JSON.stringify({
        accessToken: "test-token",
        refreshToken: null,
        expiresAt: Date.now() + 3600_000,
        playerId: "p-1",
        username: "u",
      }),
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("adds Content-Type header with body", async () => {
    mockFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await apiPost("/test", { foo: "bar" });

    const call = mockFetch.mock.calls[0];
    const init = call[1] as RequestInit;
    expect((init.headers as Headers).get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ foo: "bar" }));
  });

  test("does not add Content-Type when body is undefined", async () => {
    mockFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await apiPost("/test");

    const call = mockFetch.mock.calls[0];
    const init = call[1] as RequestInit;
    expect((init.headers as Headers).get("Content-Type")).toBeNull();
  });
});
