"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPlayerId } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nickname.trim()) {
      toast.error("Digite um nickname para continuar");
      return;
    }

    setIsLoading(true);

    try {
      const playerId = nickname.trim().toLowerCase().replace(/\s+/g, "_");
      setPlayerId(playerId);

      // Try to create wallet (idempotent if already exists)
      await apiPost("/wallets").catch(() => {
        // Wallet may already exist, that's fine
      });

      router.push("/game");
    } catch {
      toast.error("Erro ao entrar no jogo. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(234,179,8,0.16),_transparent_30%),#0a0a0a] px-6 py-16">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            🎰 Crash Game
          </h1>
          <p className="mt-2 text-neutral-400">
            Multiplayer em tempo real
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Digite seu nickname para jogar
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: jogador123"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Entrando..." : "Entrar no Jogo"}
          </button>
        </form>
      </section>
    </main>
  );
}
