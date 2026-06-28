"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Drawer } from "vaul";
import { VremaLandingLogo } from "@/components/brand/VremaMarkLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Gemeinsame Marketing-Navigation & Footer für Blog etc. (Landing bleibt eigenständig, gleicher Look).
 */
export function MarketingSiteChrome({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 w-full max-w-full border-b border-border bg-background/85 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 w-full min-w-0 max-w-7xl items-center justify-between gap-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex min-w-0 items-center gap-x-8 lg:gap-x-12">
            <Link
              href="/"
              className="flex min-w-0 max-w-[45%] shrink-0 items-center py-1 sm:max-w-none"
              aria-label="VREMA"
            >
              <VremaLandingLogo size={44} />
            </Link>

            <div className="hidden items-center gap-x-8 text-sm text-muted-foreground md:flex">
              <Link href="/features" className="transition-colors hover:text-foreground">
                Features
              </Link>
              <Link href="/#pricing" className="transition-colors hover:text-foreground">
                Preise
              </Link>
              <Link
                href="/blog"
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                Insights
              </Link>
            </div>
          </div>

          <div className="hidden min-w-0 max-w-[55%] flex-shrink-0 flex-wrap items-center justify-end gap-x-1.5 gap-y-1 sm:max-w-none sm:gap-3 md:flex">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="max-w-full break-words rounded-xl px-2 py-1.5 text-right text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground sm:px-3 md:whitespace-nowrap"
            >
              Anmelden
            </Link>
            <Link
              href="/auth/register"
              className="max-w-full break-words rounded-xl border border-border bg-card px-3 py-2 text-right text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-card/70 sm:px-4 md:whitespace-nowrap"
            >
              Registrieren
            </Link>
          </div>

          <button
            type="button"
            aria-label="Menü öffnen"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition-colors active:scale-95 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Drawer.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-[120] bg-black/45" />
              <Drawer.Content className="fixed inset-x-0 bottom-0 z-[121] rounded-t-[28px] border border-border bg-popover p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.18)] outline-none">
                <Drawer.Handle className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/35" />
                <Drawer.Title className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Menü</Drawer.Title>
                <nav className="mt-4 space-y-2">
                  <Link
                    href="/features"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-12 items-center rounded-2xl border border-border px-4 text-base font-medium text-foreground"
                  >
                    Features
                  </Link>
                  <Link href="/blog" onClick={() => setMobileNavOpen(false)} className="flex min-h-12 items-center rounded-2xl border border-border px-4 text-base font-medium text-foreground">
                    Insights
                  </Link>
                  <Link href="/#pricing" onClick={() => setMobileNavOpen(false)} className="flex min-h-12 items-center rounded-2xl border border-border px-4 text-base font-medium text-foreground">
                    Preise
                  </Link>
                </nav>
                <div className="mt-5 space-y-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground"
                  >
                    Anmelden
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20"
                  >
                    Registrieren
                  </Link>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </nav>

      <div className="flex flex-1 flex-col pt-[calc(5rem+env(safe-area-inset-top))]">{children}</div>

      <footer className="mt-auto w-full border-t border-slate-900 bg-slate-950 py-10 text-slate-300 dark:border-white/[0.06] dark:bg-[#0a0c10]">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
          <Link href="/" className="flex min-w-0 max-w-full items-center gap-3 text-slate-100" aria-label="VREMA">
            <VremaLandingLogo size={38} onDark />
          </Link>

          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
            <Link href="/impressum" className="transition-colors hover:text-white">
              Impressum
            </Link>
            <Link href="/datenschutz" className="transition-colors hover:text-white">
              Datenschutz
            </Link>
            <Link href="/blog" className="transition-colors hover:text-white">
              Insights
            </Link>
            <Link href="/#pricing" className="transition-colors hover:text-white">
              Preise
            </Link>
            <Link href="/status" className="transition-colors hover:text-white">
              System-Status
            </Link>
            <Link href="/partner" className="transition-colors hover:text-white">
              Partner werden
            </Link>
          </div>

          <p className="text-xs text-slate-400">© 2026 VREMA – Intelligente Zeiterfassung</p>
        </div>
      </footer>
    </div>
  );
}
