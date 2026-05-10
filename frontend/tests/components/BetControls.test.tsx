import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BetControls } from "@/components/BetControls";

function renderBetControls(
  overrides: Partial<Parameters<typeof BetControls>[0]> = {},
) {
  const props: Parameters<typeof BetControls>[0] = {
    betAmount: "2.50",
    setBetAmount: mock(() => undefined),
    isAutoCashoutEnabled: false,
    setIsAutoCashoutEnabled: mock(() => undefined),
    autoCashoutMultiplier: "2.00",
    setAutoCashoutMultiplier: mock(() => undefined),
    canBet: true,
    canCashout: false,
    isPending: false,
    multiplier: 1,
    onPlaceBet: mock(() => undefined),
    onCashout: mock(() => undefined),
    isPlacingBet: false,
    isCashingOut: false,
    myBetAmount: null,
    myBetStatus: null,
    ...overrides,
  };

  render(<BetControls {...props} />);

  return props;
}

describe("BetControls", () => {
  test("places a bet without auto cashout when disabled", async () => {
    const props = renderBetControls();

    fireEvent.click(screen.getByRole("button", { name: "Apostar" }));

    await waitFor(() => {
      expect(props.onPlaceBet).toHaveBeenCalledWith({ amountInCents: "250" });
    });
  });

  test("places a bet with auto cashout target when enabled", async () => {
    const props = renderBetControls({
      isAutoCashoutEnabled: true,
      autoCashoutMultiplier: "2.50",
    });

    fireEvent.click(screen.getByRole("button", { name: "Apostar" }));

    await waitFor(() => {
      expect(props.onPlaceBet).toHaveBeenCalledWith({
        amountInCents: "250",
        autoCashoutMultiplierHundredths: 250,
      });
    });
  });

  test("rejects an auto cashout target below 1.01x", async () => {
    const props = renderBetControls({
      isAutoCashoutEnabled: true,
      autoCashoutMultiplier: "1.00",
    });

    fireEvent.click(screen.getByRole("button", { name: "Apostar" }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(props.onPlaceBet).not.toHaveBeenCalled();
  });
});
