import { NextResponse } from "next/server";

const INTERNAL_GAMES_BASE_URL = process.env.INTERNAL_GAMES_BASE_URL ?? "http://games:4001";
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN ?? "dev-internal-token";
const ENABLE_DEV_TOOLS = process.env.ENABLE_DEV_TOOLS === "true";

export async function POST() {
  if (!ENABLE_DEV_TOOLS) {
    return NextResponse.json({ message: "Dev tools are disabled." }, { status: 404 });
  }

  const response = await fetch(`${INTERNAL_GAMES_BASE_URL}/internal/rounds`, {
    method: "POST",
    headers: {
      "x-internal-token": INTERNAL_API_TOKEN,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({ message: "Unknown error" }));

  return NextResponse.json(payload, { status: response.status });
}
