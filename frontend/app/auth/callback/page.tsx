"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { handleAuthCallback } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallback />
    </Suspense>
  );
}

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const callbackError = !code || !state ? "Callback de autenticação inválido." : null;

  useEffect(() => {
    if (!code || !state) {
      return;
    }

    handleAuthCallback(code, state)
      .then(() => router.replace("/game"))
      .catch((callbackError) => {
        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "Erro ao autenticar com Keycloak.",
        );
      });
  }, [code, router, state]);

  if (callbackError || error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <Card className="w-full max-w-md border-destructive/30 bg-card">
          <CardHeader>
            <CardTitle>Falha no login</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {callbackError ?? error}
          </CardContent>
        </Card>
      </main>
    );
  }

  return <CallbackLoading />;
}

function CallbackLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader>
          <CardTitle>Autenticando</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </main>
  );
}
