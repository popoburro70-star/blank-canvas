const Index = () => {
  return (
    <main className="relative min-h-screen bg-background">
      {/* Signature moment: subtle ambient light fields */}
      <div className="pointer-events-none absolute inset-0 bg-hero" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
        <section className="w-full rounded-lg border bg-card/70 p-8 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <header className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Starter</p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Projeto em branco
            </h1>
            <p className="max-w-prose text-pretty text-base text-muted-foreground">
              Este é um canvas limpo para você começar. Diga o que quer construir (landing page, dashboard,
              app com login, etc.) e eu monto a primeira versão.
            </p>
          </header>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Começar
            </a>
            <a
              href="https://docs.lovable.dev/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Ver docs
            </a>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Dica: descreva o objetivo, público-alvo e 2–3 referências visuais.
        </footer>
      </div>
    </main>
  );
};

export default Index;
