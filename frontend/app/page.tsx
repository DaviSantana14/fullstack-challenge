"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPlayerId } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Gamepad2, LogIn } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <Card className="w-full max-w-md border-border bg-card/85 shadow-2xl shadow-black/40 backdrop-blur">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Gamepad2 aria-hidden="true" />
          </div>
          <CardTitle className="text-3xl font-black">Crash Game</CardTitle>
          <CardDescription>Multiplayer em tempo real</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="nickname" className="text-sm font-medium text-muted-foreground">
                Digite seu nickname para jogar
              </label>
              <Input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: jogador123"
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="h-11 w-full shadow-lg shadow-primary/20">
              <LogIn data-icon="inline-start" />
              {isLoading ? "Entrando..." : "Entrar no jogo"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
