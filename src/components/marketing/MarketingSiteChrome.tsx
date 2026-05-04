import Image from "next/image";
import Link from "next/link";

/**
 * Gemeinsame Marketing-Navigation & Footer für Blog etc. (Landing bleibt eigenständig, gleicher Look).
 */
export function MarketingSiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 w-full max-w-full border-b border-border glass-nav">
        <div className="mx-auto flex h-16 w-full min-w-0 max-w-7xl items-center justify-between gap-2 px-4">
          <Link href="/" className="flex min-w-0 max-w-[45%] shrink-0 items-center py-1 sm:max-w-none">
            <Image
              src="/vrema_logo.png"
              alt="VREMA"
              width={280}
              height={78}
              sizes="(max-width: 640px) 45vw, 280px"
              className="h-auto max-h-9 w-full max-w-full object-contain object-left sm:max-h-10 md:max-h-12"
              priority
            />
          </Link>

          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex md:gap-8">
            <Link href="/#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="/#pricing" className="transition-colors hover:text-foreground">
              Preise
            </Link>
            <Link href="/blog" className="font-medium text-foreground transition-colors hover:text-primary">
              Insights
            </Link>
          </div>

          <div className="flex min-w-0 max-w-[55%] flex-shrink-0 flex-wrap items-center justify-end gap-x-1.5 gap-y-1 sm:max-w-none sm:gap-3">
            <Link
              href="/auth/login"
              className="max-w-full break-words rounded-xl px-2 py-1.5 text-right text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground sm:px-3 md:whitespace-nowrap"
            >
              Anmelden
            </Link>
            <Link
              href="/auth/register"
              className="max-w-full break-words rounded-xl border border-border bg-card px-3 py-2 text-right text-sm font-semibold text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all hover:bg-card/70 sm:px-4 md:whitespace-nowrap"
            >
              Registrieren
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 flex-col pt-20">{children}</div>

      <footer className="mt-auto w-full border-t border-border py-10">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
          <Link href="/" className="flex min-w-0 max-w-full items-center gap-3">
            <Image
              src="/vrema_logo.png"
              alt="VREMA"
              width={160}
              height={44}
              sizes="(max-width: 640px) 120px, 160px"
              className="-my-1 h-auto max-h-10 w-full max-w-[120px] object-contain opacity-90 sm:max-w-[140px] md:max-h-11 md:max-w-[160px]"
            />
            <div className="min-w-0">
              <span className="block text-sm font-bold">VREMA</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">Intelligente Zeiterfassung</span>
            </div>
          </Link>

          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link href="/impressum" className="transition-colors hover:text-foreground">
              Impressum
            </Link>
            <Link href="/datenschutz" className="transition-colors hover:text-foreground">
              Datenschutz
            </Link>
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Insights
            </Link>
            <Link href="/#pricing" className="transition-colors hover:text-foreground">
              Preise
            </Link>
            <Link href="/partner" className="transition-colors hover:text-foreground">
              Partner werden
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">© 2026 VREMA – Intelligente Zeiterfassung</p>
        </div>
      </footer>
    </div>
  );
}
