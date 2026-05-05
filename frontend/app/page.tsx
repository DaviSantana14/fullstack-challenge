export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(234,179,8,0.16),_transparent_30%),#0a0a0a] px-6 py-16">
      <section className="w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur sm:p-12">
        <div className="mb-8 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-sm font-medium text-emerald-300">
          Fase 0 concluída
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-400">
              Jungle Gaming Challenge
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Frontend Next.js pronto para evoluir.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg">
              Este scaffold usa App Router, TypeScript, Tailwind CSS v4 e já está
              configurado com output standalone para o fluxo via Docker.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-sm font-semibold text-white">Stack</h2>
              <p className="mt-2 text-sm text-neutral-400">
                Next.js 16 + React 19 + Tailwind CSS v4
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-sm font-semibold text-white">Objetivo</h2>
              <p className="mt-2 text-sm text-neutral-400">
                Servir como base da interface do crash game em tempo real.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-sm font-semibold text-white">Próximo passo</h2>
              <p className="mt-2 text-sm text-neutral-400">
                Integrar autenticação, dados via Kong e eventos do jogo.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
