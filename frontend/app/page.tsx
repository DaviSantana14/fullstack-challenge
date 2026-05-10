"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, loginWithKeycloak } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Gamepad2, LogIn, ShieldCheck } from "lucide-react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/game");
    }
  }, [router]);

  async function handleLogin() {
    setIsLoading(true);

    try {
      await loginWithKeycloak();
    } catch {
      toast.error("Erro ao iniciar login com Keycloak.");
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
          <CardDescription>Login seguro via Keycloak</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck size={16} aria-hidden="true" />
                Autenticação OIDC
              </div>
              Use o usuário de teste configurado no realm: player / player123.
            </div>

            <Button type="button" onClick={handleLogin} disabled={isLoading} className="h-11 w-full shadow-lg shadow-primary/20">
              <LogIn data-icon="inline-start" />
              {isLoading ? "Redirecionando..." : "Entrar com Keycloak"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
