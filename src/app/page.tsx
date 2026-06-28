"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  trialHeroBadge,
  trialHeroCta,
  trialHeroSubline,
  trialLandingCtaLine,
  trialPricingIntroLine,
} from "@/lib/marketing/trial-copy";
import { TRIAL_DAYS } from "@/lib/trial/constants";
import { VremaLandingLogo, VremaMarkLogo } from "@/components/brand/VremaMarkLogo";
import { RoiCalculator } from "@/components/marketing/RoiCalculator";
import {
  Clock,
  FileText,
  ShieldCheck,
  Scale,
  Server,
  ChevronRight,
  Check,
  ArrowRight,
  Zap,
  Menu,
  ExternalLink,
  X,
  Users,
  LayoutGrid,
} from "lucide-react";
import { Drawer } from "vaul";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// ─── App window – ruhiger Produkt-Frame statt CLI/Terminal ───────────────────
function AppWindow({
  title,
  subtitle,
  live = false,
  children,
}: {
  title: string;
  subtitle?: string;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-full overflow-hidden rounded-3xl border border-line glass-panel shadow-[0_30px_90px_-30px_rgba(15,32,55,0.18)]">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-line/70 bg-surface/60 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <VremaMarkLogo size={18} variant="glyph" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[12px] font-semibold tracking-tight text-foreground">{title}</p>
            {subtitle && (
              <p className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {live && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        )}
      </div>
      <div className="max-w-full min-w-0 space-y-4 break-words p-5 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ─── Die 3 Kern-Versprechen (ehrlich · federleicht) ─────────────────────────
const PILLARS = [
  {
    icon: Zap,
    tag: "Einfach",
    title: "In Minuten live — nicht in Wochen",
    desc: "Stempeln, Schichtplan und Team in einer App. Am Handy oder am Terminal — ohne Schulungsmarathon und ohne SAP-Rollout.",
  },
  {
    icon: Users,
    tag: "Skalierbar",
    title: "Vom 5er-Team bis 50+ Leute",
    desc: "Gleiche Oberfläche für kleine Teams und wachsende Betriebe: Drag-&-Drop-Planer, Wochen-Saldo, Abwesenheit und Teamverwaltung — ohne neue Software pro Standort.",
  },
  {
    icon: FileText,
    tag: "Lohnbüro",
    title: "Export, der ankommt",
    desc: "Stundenzettel als PDF, CSV oder DATEV für dein Lohnbüro. Korrekturen mit Begründung — du entscheidest, was rausgeht.",
  },
];

const CORE_MODULES = ["Stempeln", "Planer", "Team", "Abwesenheit", "Berichte"];
const EXTENSION_MODULES = [
  "Schicht-Tausch",
  "Schicht-Checklisten",
  "Wetter im Planer",
  "Stoßzeiten & Umsatz",
];

const STATS = [
  { value: "99.9%", label: "Uptime" },
  { value: "<50ms", label: "Latenz" },
  { value: "256bit", label: "Verschlüsselung" },
  { value: "100%", label: "DSGVO-konform" },
];

const PLANS = [
  {
    key: "PETITE",
    name: "Petite",
    monthlyPrice: 29,
    yearlyPrice: 24,
    highlight: true,
    badge: "All-In",
    features: [
      "Bis zu 50 Mitarbeitende",
      "Stempeln, Planer, Team & Abwesenheit",
      "Schicht-Tausch",
      "PDF-Export & DATEV-CSV",
      "E-Mail ans Lohnbüro",
      "QR-Terminal",
    ],
    missing: [] as string[],
  },
  {
    key: "MAJOR",
    name: "Major",
    monthlyPrice: 90,
    yearlyPrice: 75,
    highlight: false,
    features: [
      "Unbegrenzte Mitarbeitende (ab 51 MA)",
      "Alles aus Petite — gleiche Features",
      "Prioritäts-Support",
    ],
    missing: [] as string[],
  },
];

// ─── Stats display ────────────────────────────────────────────────────────────
function AnimatedStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center transition-all duration-300">
      <p className="text-2xl md:text-3xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [yearly, setYearly] = useState(false);
  const [modal, setModal] = useState<"impressum" | "datenschutz" | "widerruf" | "cookies" | "agb" | "avv" | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden overscroll-x-none bg-background text-foreground selection:bg-brand/15">
      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50 w-full max-w-full overflow-x-hidden border-b border-line glass-nav pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 w-full min-w-0 max-w-7xl items-center justify-between gap-4 overflow-x-hidden pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex min-w-0 items-center gap-x-8 lg:gap-x-12">
            <Link
              href="/"
              className="flex shrink-0 items-center py-1"
              aria-label="VREMA"
            >
              <VremaLandingLogo size={40} />
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
              className="max-w-full break-words text-right text-sm text-fg-muted transition-colors hover:text-foreground px-2 py-1.5 rounded-xl hover:bg-surface-muted sm:px-3 md:whitespace-nowrap"
            >
              Anmelden
            </Link>
            <Link
              href="/auth/register"
              className="btn-primary-solid !py-2 !px-3 sm:!px-4 text-sm md:whitespace-nowrap"
            >
              {trialHeroCta()}
            </Link>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Menü öffnen"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface text-foreground shadow-sm transition-colors active:scale-95"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <Drawer.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-[120] bg-black/45" />
              <Drawer.Content className="fixed inset-x-0 bottom-0 z-[121] rounded-t-[28px] border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.18)] outline-none">
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
                  <Link
                    href="/#pricing"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-12 items-center rounded-2xl border border-border px-4 text-base font-medium text-foreground"
                  >
                    Preise
                  </Link>
                  <Link
                    href="/blog"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-12 items-center rounded-2xl border border-border px-4 text-base font-medium text-foreground"
                  >
                    Insights
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
                    className="btn-primary-solid flex min-h-12 w-full items-center justify-center px-4 text-sm"
                  >
                    {trialHeroCta()}
                  </Link>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative w-full max-w-full border-b border-line bg-surface pb-12 pt-[calc(7rem+env(safe-area-inset-top))] sm:pb-16 sm:pt-[calc(8rem+env(safe-area-inset-top))]">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-4">
          <div className="grid min-w-0 max-w-full items-center gap-12 lg:grid-cols-2">

            {/* Left: Text */}
            <div className="min-w-0 max-w-full transition-all duration-300">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-foreground text-xs mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                {trialHeroBadge()} · Gastro, Handwerk, Pflege & Handel
              </div>

              <h1 className="mb-5 max-w-full hyphens-auto break-words text-[1.65rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-[3.25rem]">
                Schichtplan & Zeiterfassung — federleicht für deinen Betrieb.
              </h1>

              <p className="mb-10 max-w-full hyphens-auto break-words text-lg leading-relaxed text-muted-foreground md:max-w-xl">
                Stempeln, Planen, Team und Berichte in einer modernen App. Kein SAP, keine Excel-Listen, keine
                KI-Versprechen — nur das, was du wirklich brauchst. Für Gastro, Handwerk, Pflege und Handel.
              </p>

              <div className="flex max-w-full flex-col items-stretch gap-3 sm:items-start">
                <Link
                  href="/auth/register"
                  className="btn-primary-solid group flex min-w-0 max-w-full items-center justify-center gap-2 px-7 py-3.5 text-center sm:justify-start"
                >
                  {trialHeroCta()}
                  <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="text-center text-xs text-muted-foreground sm:text-left">
                  {trialHeroSubline()}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { label: "Stempeln", text: "Mobil & Terminal." },
                  { label: "Planer", text: "Drag & Drop Board." },
                  { label: "Berichte", text: "PDF & DATEV-CSV." },
                ].map((seal) => (
                  <div
                    key={seal.label}
                    className="rounded-2xl bg-surface border border-line px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
                  >
                    <p className="text-[11px] font-semibold text-muted-foreground">{seal.label}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{seal.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-widest text-muted-foreground">
                <span>DSGVO-konform</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span>Made in Germany</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span>Kein Outsourcing</span>
              </div>
            </div>

            {/* Right: Dashboard-Vorschau (echte App-Optik statt Terminal) */}
            <div className="min-w-0 max-w-full overflow-x-hidden transition-all duration-300">
              <AppWindow title="Übersicht" subtitle="Mittwoch · 13. Mai" live>
                {/* Heute / Saldo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-line bg-surface p-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Eingestempelt</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">08:02</p>
                    <p className="mt-1 text-xs text-muted-foreground">Kevin K. · Service</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-surface p-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo · Mai</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      +12h 45m
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Ziel erreicht</p>
                  </div>
                </div>

                {/* Aktivität */}
                <div className="rounded-2xl border border-line bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Letzte Aktivität</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Heute</p>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      { name: "Kevin Konkin", action: "Start", time: "08:02", tone: "brand" as const },
                      { name: "Lisa Bauer", action: "Pause", time: "12:30", tone: "warning" as const },
                      { name: "Tom Heller", action: "Ende", time: "16:45", tone: "muted" as const },
                    ].map((row) => (
                      <li key={row.name} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={
                              "h-1.5 w-1.5 shrink-0 rounded-full " +
                              (row.tone === "brand"
                                ? "bg-brand"
                                : row.tone === "warning"
                                ? "bg-amber-500"
                                : "bg-muted-foreground/40")
                            }
                          />
                          <span className="truncate font-medium text-foreground">{row.name}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="truncate text-muted-foreground">{row.action}</span>
                        </div>
                        <span className="shrink-0 tabular-nums text-foreground">{row.time}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Wochenfortschritt */}
                <div className="rounded-2xl border border-line bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Diese Woche</p>
                    <p className="text-xs font-bold tabular-nums text-brand">87 % Ziel</p>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {[
                      { d: "Mo", pct: 92 },
                      { d: "Di", pct: 100 },
                      { d: "Mi", pct: 95 },
                      { d: "Do", pct: 87 },
                      { d: "Fr", pct: 70 },
                      { d: "Sa", pct: 0 },
                      { d: "So", pct: 0 },
                    ].map((day) => (
                      <div key={day.d} className="flex flex-col items-stretch gap-1">
                        <div className="flex h-12 items-end overflow-hidden rounded-md bg-muted/50">
                          {day.pct > 0 && (
                            <div
                              className="w-full bg-gradient-to-t from-brand to-brand/60"
                              style={{ height: `${day.pct}%` }}
                            />
                          )}
                        </div>
                        <p className="text-center text-[9px] uppercase tracking-widest text-muted-foreground">
                          {day.d}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </AppWindow>

              {/* Mini status badges – Brand-Tokens, gedämpfte Erfolg-/Warn-Töne */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {([
                  { label: "Live eingestempelt", value: "08:02 Uhr", tone: "brand" as const },
                  { label: "Saldo diesen Monat", value: "+12h 45m", tone: "success" as const },
                  { label: "Team aktiv", value: "8 / 12", tone: "brand" as const },
                  { label: "Offene Anträge", value: "2 Urlaub", tone: "warning" as const },
                ]).map((badge) => (
                  <div
                    key={badge.label}
                    className="rounded-2xl glass-panel px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
                  >
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      {badge.label}
                    </p>
                    <p
                      className={
                        "font-bold text-sm tabular-nums " +
                        (badge.tone === "brand"
                          ? "text-brand"
                          : badge.tone === "success"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400")
                      }
                    >
                      {badge.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
      <section className="w-full max-w-full border-y border-line bg-surface-muted py-10">
        <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-4">
          {STATS.map((s) => <AnimatedStat key={s.label} {...s} />)}
        </div>
      </section>

      {/* ── KERN-VERSPRECHEN (3 Säulen) ─────────────────────────────────────── */}
      <section id="features" className="w-full max-w-full border-b border-line bg-surface py-24">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="mb-16 min-w-0 transition-all duration-300">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">01 / Warum VREMA</p>
            <h2 className="max-w-full hyphens-auto break-words text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Federleicht.
              <br />
              <span className="text-muted-foreground">Ehrlich. Für echten Betrieb.</span>
            </h2>
          </div>

          <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((pillar, index) => (
              <div
                key={pillar.title}
                className="group relative max-w-full min-w-0 overflow-hidden rounded-2xl border border-line bg-surface p-7 shadow-sm transition-all duration-300 md:hover:border-brand/30 md:hover:bg-muted/40"
              >
                <span className="pointer-events-none absolute right-5 top-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex min-w-0 max-w-full flex-col gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-brand">
                    <pillar.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 max-w-full">
                    <p className="mb-2 inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {pillar.tag}
                    </p>
                    <h3 className="mb-2 max-w-full hyphens-auto break-words text-lg font-semibold text-foreground">
                      {pillar.title}
                    </h3>
                    <p className="hyphens-auto break-words text-sm leading-relaxed text-muted-foreground">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEGO, NICHT SAP (Module) ────────────────────────────────────────── */}
      <section className="w-full max-w-full border-b border-line bg-surface-muted py-24">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="grid min-w-0 max-w-full items-center gap-16 lg:grid-cols-2">
            <div className="min-w-0 max-w-full transition-all duration-300">
              <p className="text-xs text-primary uppercase tracking-widest mb-4">02 / Schlank bleiben</p>
              <h2 className="mb-6 max-w-full hyphens-auto break-words text-4xl font-black leading-tight md:text-5xl">
                Kern immer dabei.
                <br />
                <span className="text-muted-foreground">Erweiterungen nur bei Bedarf.</span>
              </h2>
              <p className="hyphens-auto break-words leading-relaxed text-muted-foreground">
                Stempeln, Planer, Team, Abwesenheit und Berichte sind für jeden Betrieb da. Schicht-Tausch,
                Checklisten, Wetter im Planer oder Stoßzeiten schaltest du in den Einstellungen an — aus ist weg aus
                der Navigation. Kein Menü-Chaos, kein Feature-Zoo.
              </p>
              <p className="mt-4 text-sm font-medium text-foreground">Lego, nicht SAP — schlank starten, modular wachsen.</p>
            </div>

            <div className="min-w-0 max-w-full overflow-x-hidden transition-all duration-300">
              <AppWindow title="Einstellungen · Module" subtitle="Pro Betrieb ein-/ausschalten">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <LayoutGrid className="h-3.5 w-3.5 text-brand" aria-hidden />
                      Kern — immer aktiv
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CORE_MODULES.map((m) => (
                        <span
                          key={m}
                          className="rounded-full border border-brand/30 bg-brand-soft/50 px-3 py-1 text-xs font-semibold text-brand"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Erweiterungen — optional
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EXTENSION_MODULES.map((m) => (
                        <span
                          key={m}
                          className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted-foreground"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="rounded-xl border border-dashed border-line bg-surface/80 px-3 py-2 text-xs text-muted-foreground">
                    Ausgeschaltete Module verschwinden aus der Navigation — kein Menü-Chaos für dein Team.
                  </p>
                </div>
              </AppWindow>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI-CALCULATOR ────────────────────────────────────────────────── */}
      <RoiCalculator />

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="w-full max-w-full border-t border-line bg-surface-muted py-24">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="mb-12 min-w-0 transition-all duration-300">
            <p className="text-xs text-primary uppercase tracking-widest mb-4">04 / Preise</p>
            <h2 className="mb-4 max-w-full hyphens-auto break-words text-4xl font-black md:text-5xl">Starten.</h2>
            <p className="text-muted-foreground">{trialPricingIntroLine()}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {TRIAL_DAYS} Tage gratis — danach All-In: Petite bis 50 MA (29 €), Major unbegrenzt (90 €), Rechnung statt
              Kreditkarte.
            </p>
          </div>

          <div className="mb-10 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl glass-panel p-4">
              <div className="flex items-center gap-2 text-brand">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-sm font-semibold">DATEV-Ready</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Exportformate für dein Lohnbüro optimiert.</p>
            </div>
            <div className="rounded-2xl glass-panel p-4">
              <div className="flex items-center gap-2 text-brand">
                <Scale className="h-4 w-4" />
                <p className="text-sm font-semibold">Revisionssicher</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Vollständiger Audit-Trail nach GoBD-Standards.</p>
            </div>
            <div className="rounded-2xl glass-panel p-4">
              <div className="flex items-center gap-2 text-brand">
                <Server className="h-4 w-4" />
                <p className="text-sm font-semibold">Hosted in Germany</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">100% DSGVO-konform & sicher.</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="mb-10 flex min-w-0 max-w-full flex-wrap items-center gap-4">
            <span className={`text-sm transition-colors ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>monatlich</span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? "bg-primary" : "bg-card"}`}
            >
              <motion.div
                layout
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                animate={{ left: yearly ? "calc(100% - 20px)" : "4px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm transition-colors ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
              jährlich
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold">-2 Monate</span>
            </span>
          </div>

          <div className="mt-4 grid min-w-0 max-w-full grid-cols-1 gap-5 pt-1 md:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative max-w-full min-w-0 overflow-visible rounded-2xl border border-line bg-surface p-8 shadow-sm transition-all duration-300 ${
                  plan.highlight
                    ? "border-primary/30"
                    : "hover:border-line-strong"
                }`}
              >
                {"badge" in plan && plan.badge && (
                  <div className="absolute -top-3 left-6 z-10 whitespace-nowrap rounded-full border border-white/30 bg-gradient-to-b from-brand to-brand-hover px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-foreground shadow-[0_8px_24px_-6px_hsl(var(--brand)_/_0.5)] backdrop-blur dark:border-white/10">
                    {plan.badge}
                  </div>
                )}

                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Tarif
                </p>
                <h3 className="mb-4 max-w-full hyphens-auto break-words text-xl font-black">{plan.name}</h3>

                <AnimatePresence mode="wait">
                  {plan.monthlyPrice === null ? (
                    <div className="mb-6">
                      <p className="text-3xl font-black">Auf Anfrage</p>
                      <p className="text-muted-foreground text-xs mt-1">individuell</p>
                    </div>
                  ) : (
                    <div
                      key={yearly ? "y" : "m"}
                      className="mb-6 transition-all duration-300"
                    >
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-black">
                          {yearly ? plan.yearlyPrice : plan.monthlyPrice}€
                        </span>
                        <span className="text-muted-foreground text-sm mb-1.5"> / Monat</span>
                      </div>
                      {yearly && (
                        <p className="text-muted-foreground text-xs mt-1">
                          = {(plan.yearlyPrice! * 12)}€/Jahr · spare {((plan.monthlyPrice! - plan.yearlyPrice!) * 12)}€
                        </p>
                      )}
                    </div>
                  )}
                </AnimatePresence>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm opacity-25">
                      <span className="w-3.5 h-3.5 shrink-0 text-center text-muted-foreground text-xs">—</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/auth/register?plan=${plan.key}&interval=${yearly ? "yearly" : "monthly"}`}
                  className={
                    plan.highlight
                      ? "btn-primary-solid block w-full text-center py-3 text-sm"
                      : "btn-secondary-outline block w-full text-center py-3 text-sm"
                  }
                >
                  {`${TRIAL_DAYS} Tage testen · ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            <Link
              href="/partner"
              className="text-primary/90 hover:text-primary underline underline-offset-2 text-xs"
            >
              Partner werden
            </Link>
            <span className="text-muted-foreground mx-2">·</span>
            <span className="text-muted-foreground">Schreib uns kurz — kein Login, nur Link teilen.</span>
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="w-full max-w-full border-t border-line bg-surface py-24">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="relative max-w-full rounded-3xl bg-gradient-to-r from-brand/35 via-brand/25 to-brand-hover/35 p-[1px]">
            <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-14 text-center shadow-[0_40px_120px_-40px_rgba(15,32,55,0.25)] sm:px-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-1/2 mx-auto h-[520px] w-[520px] rounded-full bg-brand/12 blur-3xl"
              />
              <div className="relative">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand">
                  05 / Loslegen
                </p>
                <h2 className="mx-auto max-w-3xl hyphens-auto break-words text-3xl font-black tracking-tight text-foreground md:text-4xl">
                  Schluss mit der Excel-Hölle.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {trialLandingCtaLine()} Stempeln, Planer und Berichte in wenigen Minuten — danach kurz Zugang anfragen,
                  wir schalten frei.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/auth/register"
                    className="btn-primary-solid flex items-center gap-2 px-8 py-3.5"
                  >
                    <Zap className="h-4 w-4" />
                    {trialHeroCta()}
                  </Link>
                  <Link
                    href="/#pricing"
                    className="flex items-center gap-2 rounded-2xl border border-border bg-surface/60 px-8 py-3.5 font-medium text-muted-foreground transition-all hover:border-border hover:text-foreground"
                  >
                    Preise für später
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full max-w-full border-t border-line bg-surface-muted py-16">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden rounded-2xl glass-panel p-8 px-4 sm:px-8">
          <h3 className="max-w-full hyphens-auto break-words text-2xl font-bold">Werde VREMA-Partner</h3>
          <p className="mt-2 hyphens-auto break-words text-muted-foreground">
            Du kennst Betriebe, die eine moderne Zeiterfassung brauchen? Empfehle VREMA und erhalte bis zu 15 € pro
            Abschluss. Ohne Haken, direkt in dein Dashboard.
          </p>
          <div className="mt-5">
            <Link
              href="/partner-login"
              className="btn-primary-solid inline-flex items-center gap-2 px-6 py-3"
            >
              Jetzt Partner werden
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="w-full max-w-full border-t border-line bg-surface-muted py-10 text-fg-muted">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col items-start justify-between gap-6 overflow-x-hidden px-4 md:flex-row md:items-center">
          <div className="flex min-w-0 max-w-full items-center gap-3 text-foreground">
            <VremaLandingLogo size={38} />
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
            <button
              onClick={() => setModal("impressum")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-fg-muted transition-colors hover:text-foreground"
            >
              Impressum
            </button>
            <button
              onClick={() => setModal("datenschutz")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-fg-muted transition-colors hover:text-foreground"
            >
              Datenschutz
            </button>
            <button
              onClick={() => setModal("widerruf")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-fg-muted transition-colors hover:text-foreground"
            >
              Widerruf
            </button>
            <button
              onClick={() => setModal("cookies")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-fg-muted transition-colors hover:text-foreground"
            >
              Cookies
            </button>
            <button
              onClick={() => setModal("agb")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-fg-muted transition-colors hover:text-foreground"
            >
              AGB
            </button>
            <button
              onClick={() => setModal("avv")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-fg-muted transition-colors hover:text-foreground"
            >
              AVV
            </button>
            <Link href="/blog" className="text-xs text-fg-muted transition-colors hover:text-foreground">
              Insights
            </Link>
            <Link href="/features" className="text-xs text-fg-muted transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="/#pricing" className="text-xs text-fg-muted transition-colors hover:text-foreground">
              Preise
            </Link>
            <Link href="/partner" className="text-xs text-fg-muted transition-colors hover:text-foreground">
              Partner werden
            </Link>
          </div>

          <p className="text-xs text-fg-subtle">© 2026 VREMA – Intelligente Zeiterfassung</p>
        </div>
      </footer>

      {/* ── TERMINAL MODALS ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full min-w-0 max-w-lg"
            >
              <div className="max-h-[85vh] overflow-y-auto rounded-3xl border border-line bg-surface/95 shadow-2xl backdrop-blur-md">
                <div className="relative border-b border-line/70 px-6 py-5 text-center">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    aria-label="Dialog schließen"
                    className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/80 text-fg-muted transition-colors hover:bg-surface"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                  <h3 className="text-xl font-bold text-foreground">
                    {modal === "impressum"
                      ? "Impressum"
                      : modal === "datenschutz"
                      ? "Datenschutz"
                      : modal === "widerruf"
                      ? "Widerruf"
                      : modal === "cookies"
                      ? "Cookies"
                      : modal === "agb"
                      ? "AGB"
                      : "AVV"}
                  </h3>
                </div>

                <div className="space-y-5 p-6 text-sm leading-relaxed">
                  {modal === "impressum" ? (
                    <>
                      <div className="text-xs uppercase tracking-wide text-fg-muted">
                        Angaben gemäß § 5 TMG
                      </div>
                      {[
                        ["Name", "Kevin Konkin · KevkoStudio"],
                        ["Adresse", "Kolbstr. 5 · 67346 Speyer · Deutschland"],
                        ["E-Mail", "kontakt@kevko.studio"],
                        ["Telefon", "+49 176 84844803"],
                        ["§ 19 UStG", "Kleinunternehmer — keine Umsatzsteuer-ID"],
                        ["§ 55 RStV", "Kevin Konkin, Kolbstr. 5, 67346 Speyer"],
                      ].map(([key, val]) => (
                        <div key={key} className="flex gap-3">
                          <span className="w-24 shrink-0 text-right text-fg-muted">{key}:</span>
                          <span className="text-foreground">{val}</span>
                        </div>
                      ))}
                      <div className="border-t border-line pt-3 text-xs leading-relaxed text-fg-muted">
                        Trotz sorgfältiger Kontrolle keine Haftung für externe Links.
                        <br />
                        Für verlinkte Seiten sind deren Betreiber verantwortlich.
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/impressum" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                          Vollständige Seite öffnen <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </>
                  ) : modal === "datenschutz" ? (
                    <>
                      <div className="text-xs uppercase tracking-wide text-fg-muted">
                        DSGVO-Erklärung
                      </div>
                      {[
                        ["1. Verantwortlich", "Kevin Konkin (KevkoStudio), Kolbstr. 5, 67346 Speyer"],
                        ["Kontakt", "kontakt@kevko.studio"],
                        ["2. Erhebung", "Nur soweit nötig für Website & Vrema-Dienste"],
                        ["3. Rechtsgrundlage", "Art. 6 Abs. 1 lit. b, c, f DSGVO"],
                        ["4. Ihre Rechte", "Auskunft · Berichtigung · Löschung · Widerspruch"],
                        ["Anfragen", "kontakt@kevko.studio"],
                      ].map(([key, val]) => (
                        <div key={key} className="flex gap-3">
                          <span className="w-32 shrink-0 text-right text-xs leading-5 text-fg-muted">{key}:</span>
                          <span className="text-xs leading-5 text-foreground">{val}</span>
                        </div>
                      ))}
                      <div className="border-t border-line pt-3 text-xs text-fg-muted">
                        Datenübertragbarkeit & Einschränkung der Verarbeitung auf Anfrage.
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/datenschutz" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                          Vollständige Seite öffnen <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </>
                  ) : modal === "widerruf" ? (
                    <>
                      <div className="text-xs uppercase tracking-wide text-fg-muted">
                        Hinweise für Verbraucher
                      </div>
                      <div className="space-y-3 text-xs leading-relaxed text-foreground">
                        <p>
                          Für digitale Leistungen gelten die gesetzlichen Widerrufsrechte gemäß den jeweils
                          anwendbaren Verbraucherschutzvorschriften.
                        </p>
                        <p>
                          Die genaue Frist, Form und Ausübung des Widerrufs sowie Mustertexte finden Sie auf der
                          vollständigen Widerrufsseite.
                        </p>
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/widerruf" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                          Vollständige Seite öffnen <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </>
                  ) : modal === "cookies" ? (
                    <>
                      <div className="text-xs uppercase tracking-wide text-fg-muted">
                        Einsatz & Optionen
                      </div>
                      <div className="space-y-3 text-xs leading-relaxed text-foreground">
                        <p>
                          Wir verwenden technisch notwendige Cookies für Authentifizierung, Sicherheit und
                          Sitzungsverwaltung.
                        </p>
                        <p>
                          Details zu Kategorien, Speicherdauer und Widerspruchsmöglichkeiten finden Sie auf der
                          vollständigen Cookies-Seite.
                        </p>
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/cookies" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                          Vollständige Seite öffnen <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </>
                  ) : modal === "agb" ? (
                    <>
                      <div className="text-xs uppercase tracking-wide text-fg-muted">
                        Vertragsgrundlagen
                      </div>
                      <div className="space-y-3 text-xs leading-relaxed text-foreground">
                        <p>
                          Unsere Allgemeinen Geschäftsbedingungen regeln Leistungen, Laufzeiten, Kündigung,
                          Haftungsrahmen und weitere Vertragsbedingungen.
                        </p>
                        <p>
                          Bitte lesen Sie die vollständige Fassung vor Abschluss eines Vertrags.
                        </p>
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/agb" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                          Vollständige Seite öffnen <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs uppercase tracking-wide text-fg-muted">
                        Auftragsverarbeitung
                      </div>
                      <div className="space-y-3 text-xs leading-relaxed text-foreground">
                        <p>
                          Die AVV beschreibt datenschutzrechtliche Rollen, technische und organisatorische Maßnahmen
                          sowie Pflichten im Rahmen der Auftragsverarbeitung.
                        </p>
                        <p>
                          Die vollständigen Vertragsinhalte und Anlagen finden Sie auf der AVV-Seite.
                        </p>
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/avv" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                          Vollständige Seite öffnen <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Click outside hint */}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Klick außerhalb zum Schließen
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
