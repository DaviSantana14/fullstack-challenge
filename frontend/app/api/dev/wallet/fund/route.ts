import { NextRequest, NextResponse } from "next/server";

const INTERNAL_WALLETS_BASE_URL =
  process.env.INTERNAL_WALLETS_BASE_URL ?? "http://wallets:4002";
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN ?? "dev-internal-token";
const ENABLE_DEV_TOOLS = process.env.ENABLE_DEV_TOOLS === "true";

export async function POST(request: NextRequest) {
  if (!ENABLE_DEV_TOOLS) {
    return NextResponse.json({ message: "Dev tools are disabled." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.playerId || !body?.amountInCents) {
    return NextResponse.json(
      { message: "playerId and amountInCents are required." },
      { status: 400 },
    );
  }

  const response = await fetch(`${INTERNAL_WALLETS_BASE_URL}/internal/dev/fund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": INTERNAL_API_TOKEN,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({ message: "Unknown error" }));

  return NextResponse.json(payload, { status: response.status });
}
