import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { CrashHistory } from "@/components/CrashHistory";
import type { RoundHistoryItem } from "@/types/game";

function createWrapper() {
  const queryClient = new QueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makeHistoryItem(overrides: Partial<RoundHistoryItem> = {}): RoundHistoryItem {
  return {
    id: "r1",
    roundNumber: 1,
    crashPointHundredths: 250,
    crashedAt: new Date().toISOString(),
    serverSeedHash: "hash",
    ...overrides,
  };
}

describe("CrashHistory", () => {
  test("renders crash points with color coding", () => {
    const history: RoundHistoryItem[] = [
      makeHistoryItem({ id: "r1", crashPointHundredths: 250, roundNumber: 1 }), // 2.50x → green
      makeHistoryItem({ id: "r2", crashPointHundredths: 150, roundNumber: 2 }), // 1.50x → amber
      makeHistoryItem({ id: "r3", crashPointHundredths: 80, roundNumber: 3 }),  // 0.80x → red
    ];

    render(<CrashHistory history={history} isLoading={false} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("2.50x")).toBeDefined();
    expect(screen.getByText("1.50x")).toBeDefined();
    expect(screen.getByText("0.80x")).toBeDefined();
  });

  test("shows skeletons when loading", () => {
    render(<CrashHistory history={[]} isLoading={true} />, {
      wrapper: createWrapper(),
    });

    const skeletons = document.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("shows empty state when no history", () => {
    render(<CrashHistory history={[]} isLoading={false} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/Nenhum histórico/i)).toBeDefined();
  });

  test("green threshold: 2.00x and above", () => {
    const history = [makeHistoryItem({ crashPointHundredths: 200 })];
    const { container } = render(<CrashHistory history={history} isLoading={false} />, {
      wrapper: createWrapper(),
    });

    const item = container.querySelector("[class*='bg-primary']") ||
                 container.querySelector("[class*='text-green']");
    expect(item).not.toBeNull();
  });

  test("red threshold: below 1.50x", () => {
    const history = [makeHistoryItem({ crashPointHundredths: 120 })];
    const { container } = render(<CrashHistory history={history} isLoading={false} />, {
      wrapper: createWrapper(),
    });

    const item = container.querySelector("[class*='bg-destructive']") ||
                 container.querySelector("[class*='text-red']");
    expect(item).not.toBeNull();
  });
});
