"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import {
  Clock,
  FileText,
  Shield,
  ShieldCheck,
  Scale,
  Server,
  Sparkles,
  ChevronRight,
  Check,
  ArrowRight,
  QrCode,
  BarChart3,
  Zap,
  Menu,
} from "lucide-react";
import { Drawer } from "vaul";

// ─── Typing animation hook ───────────────────────────────────────────────────
function useTypewriter(lines: string[], speed = 45, pauseMs = 900) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (currentLine >= lines.length) { setDone(true); return; }
    if (currentChar < lines[currentLine].length) {
      const t = setTimeout(() => setCurrentChar((c) => c + 1), speed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setDisplayed((prev) => [...prev, lines[currentLine]]);
      setCurrentLine((l) => l + 1);
      setCurrentChar(0);
    }, pauseMs);
    return () => clearTimeout(t);
  }, [currentLine, currentChar, lines, speed, pauseMs]);

  const inProgress = currentLine < lines.length
    ? lines[currentLine].slice(0, currentChar)
    : "";

  return { displayed, inProgress, done };
}

// ─── Blinking cursor ─────────────────────────────────────────────────────────
function Cursor({ show = true }: { show?: boolean }) {
  const [vis, setVis] = useState(true);
  useEffect(() => {
    if (!show) return;
    const t = setInterval(() => setVis((v) => !v), 530);
    return () => clearInterval(t);
  }, [show]);
  return <span className={`inline-block w-2 h-4 bg-primary ml-0.5 align-middle ${vis ? "opacity-100" : "opacity-0"}`} />;
}

// ─── Terminal window component ────────────────────────────────────────────────
function TerminalWindow({ title = "vrema — zsh", children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-full rounded-2xl glass-panel overflow-hidden">
      <div className="flex min-w-0 items-center gap-2 border-b border-border bg-card px-4 py-3">
        <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-red-400/90" />
        <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-yellow-400/90" />
        <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-emerald-400/90" />
        <span className="ml-1 min-w-0 truncate text-xs tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="max-w-full min-w-0 break-words p-5 font-sans text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ─── Feature cards ───────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Clock, cmd: "clock-in", title: "1-Klick Stempeluhr", desc: "Start, Pause, Stop. Mehr nicht. Auf Smartphone oder Terminal." },
  { icon: BarChart3, cmd: "report --live", title: "Echtzeit-Auswertungen", desc: "Stundenübersicht, Wochenstatistik, Abweichungen. Sofort sichtbar." },
  {
    icon: ShieldCheck,
    cmd: "privacy --design",
    title: "Privacy by Design",
    desc: "Kein Standort-Tracking. 100 % DSGVO-konform – klarer Vorteil gegenüber US-Zeiterfassung mit GPS.",
  },
  { icon: FileText, cmd: "export --pdf", title: "PDF-Reports", desc: "Stundenzettel für Lohnbüro, Abrechnung oder Archiv. Ein Klick." },
  { icon: Shield, cmd: "secure --256bit", title: "Verschlüsselt & Privat", desc: "Deine Daten bleiben bei dir. DSGVO-konform, ohne Drittanbieter." },
  { icon: QrCode, cmd: "terminal --qr", title: "QR-Terminal Support", desc: "Physisches Terminal mit QR-Code. Robuste Hardware trifft Cloud." },
];

const STATS = [
  { value: "99.9%", label: "Uptime" },
  { value: "<50ms", label: "Latenz" },
  { value: "256bit", label: "Verschlüsselung" },
  { value: "100%", label: "DSGVO-konform" },
  { value: "0", label: "Standort-Tracking" },
];

const PLANS = [
  {
    key: "STARTER",
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 24,
    highlight: false,
    features: [
      "Bis zu 10 Mitarbeiter",
      "Live-Terminal",
      "Saldo-Übersicht",
      "Urlaubsanträge",
      "Privacy by Design (ohne Standort-Tracking)",
      "E-Mail-Support",
    ],
    missing: ["PDF-Export", "Lohnbüro-Versand"],
  },
  {
    key: "BUSINESS",
    name: "Business",
    monthlyPrice: 79,
    yearlyPrice: 66,
    highlight: true,
    badge: "Beliebtester Plan",
    features: [
      "Bis zu 100 Mitarbeiter",
      "Alles aus Starter",
      "PDF-Export",
      "Lohnbüro-Versand",
      "Privacy by Design (ohne Standort-Tracking)",
      "Prioritäts-Support",
    ],
    missing: ["API-Zugang"],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    highlight: false,
    features: [
      "Unbegrenzte Mitarbeiter",
      "Alles aus Business",
      "API-Zugang",
      "Custom Branding",
      "Privacy by Design (ohne Standort-Tracking)",
      "Dedizierter Support",
      "SLA-Garantie",
    ],
    missing: [],
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
  const [terminalReady, setTerminalReady] = useState(false);
  const [modal, setModal] = useState<"impressum" | "datenschutz" | "widerruf" | "cookies" | "agb" | "avv" | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const TERMINAL_LINES = [
    "$ vrema login --company muster-gmbh",
    "✓ Authentifiziert als kevin@muster.de",
    "$ vrema clock-in",
    "✓ Eingestempelt: 08:02 Uhr · ohne Standortdaten",
    "$ vrema status",
    "→ Heute: 7h 23m · Saldo: +12h 45m · Urlaub: 18 Tage",
    "$ vrema export --month 04-2026 --format pdf",
    "✓ Stundenzettel April.pdf erstellt (42 Einträge)",
  ];

  const { displayed, inProgress, done } = useTypewriter(
    terminalReady ? TERMINAL_LINES : [],
    38,
    600
  );

  useEffect(() => {
    const t = setTimeout(() => setTerminalReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vrema.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${appUrl}/#organization`,
        name: "KevkoStudio",
        url: appUrl,
        email: "kontakt@kevko.studio",
        brand: {
          "@type": "Brand",
          name: "Vrema",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${appUrl}/#website`,
        url: appUrl,
        name: "Vrema",
        publisher: {
          "@id": `${appUrl}/#organization`,
        },
        inLanguage: "de-DE",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${appUrl}/#software`,
        name: "Vrema",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Digitale Zeiterfassung mit Stempeluhr und Berichten. Privacy by Design: 100 % DSGVO-konform ohne Standort-Tracking, DATEV-freundlicher Export.",
        url: appUrl,
        brand: {
          "@type": "Brand",
          name: "Vrema by KevkoStudio",
        },
        provider: {
          "@id": `${appUrl}/#organization`,
        },
      },
    ],
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden overscroll-x-none bg-slate-50 text-foreground selection:bg-primary/10">
      <Script
        id="ld-json-vrema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50 w-full max-w-full overflow-x-hidden border-b border-slate-200 glass-nav">
        <div className="mx-auto flex h-16 w-full min-w-0 max-w-7xl items-center justify-between gap-2 overflow-x-hidden px-4">
          <Link href="/" className="flex min-w-0 max-w-[45%] shrink-0 items-center py-1 sm:max-w-none">
            <Image
              src="/vrema_logo.png"
              alt="VREMA"
              width={280}
              height={78}
              sizes="(max-width: 640px) 45vw, 280px"
              className="h-auto w-full max-w-full object-contain object-left max-h-9 sm:max-h-10 md:max-h-12"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preise</a>
            <Link href="/blog" className="font-medium text-foreground transition-colors hover:text-primary">
              Insights
            </Link>
          </div>

          <div className="hidden min-w-0 max-w-[55%] flex-shrink-0 flex-wrap items-center justify-end gap-x-1.5 gap-y-1 sm:max-w-none sm:gap-3 md:flex">
            <Link
              href="/auth/login"
              className="max-w-full break-words text-right text-sm text-muted-foreground transition-colors hover:text-foreground px-2 py-1.5 rounded-xl hover:bg-card sm:px-3 md:whitespace-nowrap"
            >
              Anmelden
            </Link>
            <Link
              href="/auth/register"
              className="max-w-full break-words text-right text-sm rounded-xl border border-border bg-card px-3 py-2 font-semibold text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all hover:bg-card/70 sm:px-4 md:whitespace-nowrap"
            >
              Registrieren
            </Link>
          </div>
          <button
            type="button"
            aria-label="Menü öffnen"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-white text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-colors active:scale-95 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Drawer.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-[120] bg-black/45" />
              <Drawer.Content className="fixed inset-x-0 bottom-0 z-[121] rounded-t-[28px] border border-border bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.18)] outline-none">
                <Drawer.Handle className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/35" />
                <Drawer.Title className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Menü</Drawer.Title>
                <nav className="mt-4 space-y-2">
                  <a
                    href="#pricing"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-12 items-center rounded-2xl border border-border px-4 text-base font-medium text-foreground"
                  >
                    Preise
                  </a>
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

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative w-full max-w-full border-b border-slate-200 bg-white pt-32 pb-16">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="grid min-w-0 max-w-full items-center gap-12 lg:grid-cols-2">

            {/* Left: Text */}
            <div className="min-w-0 max-w-full transition-all duration-300">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-white text-foreground text-xs mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                VREMA - Intelligente Zeiterfassung
              </div>

              <h1 className="mb-6 max-w-full hyphens-auto break-words text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-6xl">
                VREMA: Die intelligente Infrastruktur für Ihre Personalzeitwirtschaft.
              </h1>

              <p className="mb-10 max-w-full hyphens-auto break-words text-lg leading-relaxed text-muted-foreground md:max-w-xl">
                Digitale Zeiterfassung, Auswertung und Compliance in einer konsistenten Plattform für Unternehmen mit
                professionellen Prozessen.
              </p>

              <div className="flex max-w-full flex-wrap items-center gap-4">
                <Link
                  href="/auth/register"
                  className="group flex min-w-0 max-w-full items-center gap-2 rounded-2xl bg-primary px-7 py-3.5 font-bold text-foreground ring-1 ring-inset ring-white/20 transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] active:scale-95"
                >
                  Jetzt starten
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#pricing"
                  className="flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-border px-7 py-3.5 font-medium text-muted-foreground transition-all hover:border-border hover:text-foreground"
                >
                  Pläne ansehen
                </a>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { label: "DATEV-Ready", text: "Lohnbüro-Export optimiert." },
                  { label: "Revisionssicher", text: "Audit-Trail nach GoBD." },
                  { label: "Hosted in Germany", text: "DSGVO-konform & sicher." },
                ].map((seal) => (
                  <div
                    key={seal.label}
                    className="rounded-2xl bg-white border border-slate-100 px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
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

            {/* Right: Terminal */}
            <div className="min-w-0 max-w-full overflow-x-hidden transition-all duration-300">
              <TerminalWindow title="vrema — zsh — 120×36">
                <div className="min-h-[260px] min-w-0 max-w-full space-y-1 break-words">
                  {displayed.map((line, i) => {
                    const isCmd = line.startsWith("$");
                    const isSuccess = line.startsWith("✓");
                    const isInfo = line.startsWith("→");
                    return (
                      <div
                        key={i}
                        className={
                          isCmd ? "text-foreground" :
                          isSuccess ? "text-primary" :
                          isInfo ? "text-[#60a5fa]" :
                          "text-muted-foreground"
                        }
                      >
                        {line}
                      </div>
                    );
                  })}
                  {!done && (
                    <div className={inProgress.startsWith("$") ? "text-foreground" : inProgress.startsWith("✓") ? "text-primary" : "text-[#60a5fa]"}>
                      {inProgress}
                      <Cursor show={true} />
                    </div>
                  )}
                  {done && (
                    <div className="text-muted-foreground flex items-center gap-1 mt-2">
                      $<Cursor show={true} />
                    </div>
                  )}
                </div>
              </TerminalWindow>

              {/* Mini status badges */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { label: "Live eingestempelt", value: "08:02 Uhr", color: "#22c55e" },
                  { label: "Saldo diesen Monat", value: "+12h 45m", color: "#22c55e" },
                  { label: "Team aktiv", value: "8 / 12", color: "#60a5fa" },
                  { label: "Offene Anträge", value: "2 Urlaub", color: "#f59e0b" },
                ].map((badge) => (
                  <div key={badge.label} className="rounded-2xl glass-panel px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{badge.label}</p>
                    <p className="font-bold text-sm tabular-nums" style={{ color: badge.color }}>{badge.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
      <section className="w-full max-w-full border-y border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map((s) => <AnimatedStat key={s.label} {...s} />)}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="w-full max-w-full border-b border-slate-200 bg-white py-24">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="mb-16 min-w-0 transition-all duration-300">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">01 / Features</p>
            <h2 className="max-w-full hyphens-auto break-words text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Modulare Funktionen für
              <br />
              <span className="text-muted-foreground">eine verlaessliche Zeitwirtschaft.</span>
            </h2>
          </div>

          <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="max-w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 md:hover:bg-muted/50"
              >
                <div className="flex min-w-0 max-w-full items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                    <feature.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="min-w-0 max-w-full">
                    <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">{feature.cmd}</p>
                    <h3 className="mb-1.5 max-w-full hyphens-auto break-words text-sm font-semibold text-foreground">{feature.title}</h3>
                    <p className="hyphens-auto break-words text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI TEASER ───────────────────────────────────────────────────────── */}
      <section className="w-full max-w-full border-b border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="relative max-w-full rounded-2xl bg-gradient-to-r from-violet-300/40 via-sky-300/30 to-emerald-300/40 p-[1px]">
            <div className="max-w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex min-w-0 max-w-full flex-col flex-wrap items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0 max-w-full">
                  <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">02 / Core Intelligence</p>
                  <h3 className="max-w-full hyphens-auto break-words text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                    KI-gestützte Analyse für operative Entscheidungen.
                  </h3>
                  <p className="mt-3 max-w-full hyphens-auto break-words text-sm text-muted-foreground md:max-w-3xl">
                    VREMA AI erkennt Muster in Arbeitszeiten, weist auf Auffaelligkeiten hin und unterstuetzt eine
                    praezise Steuerung Ihrer Teams.
                  </p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY ──────────────────────────────────────────────────────── */}
      <section className="w-full max-w-full border-t border-slate-200 bg-white py-24">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="grid min-w-0 max-w-full items-center gap-16 lg:grid-cols-2">
            <div className="min-w-0 max-w-full transition-all duration-300">
            <p className="text-xs text-primary uppercase tracking-widest mb-4">02 / Philosophie</p>
              <h2 className="mb-6 max-w-full hyphens-auto break-words text-4xl font-black leading-tight md:text-5xl">
                Kein Großkonzern.
                <br />
                <span className="text-muted-foreground">Dafür 100% Verlässlichkeit.</span>
              </h2>
              <p className="mb-8 hyphens-auto break-words leading-relaxed text-muted-foreground">
                Vrema ist ein Produkt von KevkoStudio — inhaber-geführt, lokal verwurzelt, technisch exzellent.
                Du erreichst direkt denjenigen, der deinen Code schreibt.
              </p>

              <div className="space-y-4">
                {[
                  { num: "01", title: "Direkte Kommunikation", desc: "Kein Ticket-System, kein Account-Manager. Direkt zum Entwickler." },
                  { num: "02", title: "Transparent & Fair", desc: "Feste Preise, klare Meilensteine, keine versteckten Kosten." },
                  { num: "03", title: "Lokale Verwurzelung", desc: "Speyer, Rhein-Neckar, Pfalz. Ein Handschlag zählt mehr als jedes SLA." },
                ].map((item) => (
                  <div key={item.num} className="flex max-w-full min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="mt-0.5 shrink-0 text-sm font-bold text-primary">{item.num}</span>
                    <div className="min-w-0 max-w-full">
                      <p className="mb-1 hyphens-auto break-words text-sm font-semibold">{item.title}</p>
                      <p className="hyphens-auto break-words text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal: founder card */}
            <div className="min-w-0 max-w-full overflow-x-hidden transition-all duration-300">
              <TerminalWindow title="whoami — KevkoStudio">
                <div className="space-y-4">
                  <div className="text-muted-foreground">
                    <span className="text-muted-foreground">$</span> whoami --verbose
                  </div>
                  <div className="border-l-2 border-[#22c55e]/30 pl-4 space-y-2">
                    <p className="text-primary">Kevin Konkin</p>
                    <p className="text-muted-foreground text-xs">Gründer & Entwickler, KevkoStudio</p>
                    <p className="text-muted-foreground text-xs">Kolbstr. 5 · 67346 Speyer · Deutschland</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[{ v: "10+", l: "Jahre" }, { v: "Full", l: "Stack" }, { v: "5★", l: "Feedback" }].map((s) => (
                      <div key={s.l} className="rounded-xl border border-slate-200 bg-white p-2 text-center shadow-sm">
                        <p className="text-primary font-bold text-lg">{s.v}</p>
                        <p className="text-muted-foreground text-xs">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-primary/80 text-sm">
                      &gt; "Problemlösung durch Handschlagqualität."
                    </p>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    $<Cursor show={true} />
                  </div>
                </div>
              </TerminalWindow>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="w-full max-w-full border-t border-slate-200 bg-slate-50 py-24">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="mb-12 min-w-0 transition-all duration-300">
            <p className="text-xs text-primary uppercase tracking-widest mb-4">03 / Preise</p>
            <h2 className="mb-4 max-w-full hyphens-auto break-words text-4xl font-black md:text-5xl">Starten.</h2>
            <p className="text-muted-foreground">Kostenlos testen. Keine Kosten. Keine Verpflichtungen.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Egal ob 5 oder 50 Mitarbeiter - ein Preis. Keine versteckten Kosten pro Nutzer.
            </p>
          </div>

          <div className="mb-10 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl glass-panel p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-sm font-semibold">DATEV-Ready</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Exportformate für Ihr Lohnbüro optimiert.</p>
            </div>
            <div className="rounded-2xl glass-panel p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Scale className="h-4 w-4" />
                <p className="text-sm font-semibold">Revisionssicher</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Vollständiger Audit-Trail nach GoBD-Standards.</p>
            </div>
            <div className="rounded-2xl glass-panel p-4">
              <div className="flex items-center gap-2 text-emerald-700">
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

          <div className="mt-4 grid min-w-0 max-w-full grid-cols-1 gap-5 pt-1 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative max-w-full min-w-0 overflow-visible rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 ${
                  plan.highlight
                    ? "border-primary/30"
                    : "hover:border-slate-300"
                }`}
              >
                {"badge" in plan && plan.badge && (
                  <div className="absolute -top-3 left-6 z-10 whitespace-nowrap rounded-full bg-emerald-300 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm">
                    {plan.badge}
                  </div>
                )}

                {/* Plan header as terminal comment */}
                <div className="text-xs text-muted-foreground mb-4"># {plan.name.toLowerCase()}.plan</div>

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
                        <span className="text-muted-foreground text-sm mb-1.5">/mo</span>
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
                  href={
                    plan.key === "ENTERPRISE"
                      ? "mailto:kontakt@kevko.studio?subject=Enterprise%20Anfrage%20Vrema"
                      : `/auth/register?plan=${plan.key}&interval=${yearly ? "yearly" : "monthly"}`
                  }
                  className={`block w-full text-center py-3 rounded-2xl font-bold text-sm transition-all ${
                    plan.highlight
                      ? "bg-primary text-foreground hover:bg-primary/90"
                      : "bg-card border border-slate-200 text-muted-foreground shadow-sm hover:bg-card/70"
                  }`}
                >
                  {plan.key === "ENTERPRISE" ? "$ kontakt --plan enterprise" : `$ start --plan ${plan.key.toLowerCase()}`}
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
      <section className="w-full max-w-full border-t border-slate-200 bg-white py-24">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4">
          <div className="min-w-0 max-w-full transition-all duration-300">
            <TerminalWindow title="vrema — System-Transformation starten">
              <div className="py-8 text-center space-y-6">
                <p className="text-xs text-primary uppercase tracking-widest">03 / Starten</p>
                <h2 className="max-w-full hyphens-auto break-words text-3xl font-black md:text-4xl">
                  System-Transformation starten.
                </h2>
                <p className="text-muted-foreground text-sm">
                  Kostenlos testen. Keine Kosten. Keine Verpflichtungen.
                </p>
                <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
                  <Link
                    href="/auth/register"
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-foreground font-bold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    Jetzt registrieren
                  </Link>
                  <a
                    href="#pricing"
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-border text-muted-foreground font-medium hover:text-foreground hover:border-border transition-all"
                  >
                    Pläne & Preise
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </TerminalWindow>
          </div>
        </div>
      </section>

      <section className="w-full max-w-full border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden rounded-2xl glass-panel p-8 px-4 sm:px-8">
          <h3 className="max-w-full hyphens-auto break-words text-2xl font-bold">Werde VREMA-Partner</h3>
          <p className="mt-2 hyphens-auto break-words text-muted-foreground">
            Du kennst Betriebe, die eine moderne Zeiterfassung brauchen? Empfiehl VREMA und erhalte bis zu 15€ pro
            Abschluss. Ohne Haken, direkt in dein Dashboard.
          </p>
          <div className="mt-5">
            <Link
              href="/partner-login"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-foreground hover:bg-primary/90 transition-colors"
            >
              Jetzt Partner werden
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="w-full max-w-full border-t border-slate-900 bg-slate-950 py-10 text-slate-300">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col items-start justify-between gap-6 overflow-x-hidden px-4 md:flex-row md:items-center">
          <div className="flex min-w-0 max-w-full items-center gap-3">
            <Image
              src="/vrema_logo.png"
              alt="VREMA"
              width={160}
              height={44}
              sizes="(max-width: 640px) 120px, 160px"
              className="-my-1 h-auto w-full max-w-[120px] object-contain opacity-90 sm:max-w-[140px] md:max-h-11 md:max-w-[160px]"
            />
            <div className="min-w-0 max-w-full">
              <span className="block hyphens-auto break-words text-sm font-bold text-slate-100">VREMA</span>
              <span className="mt-0.5 block text-[10px] text-slate-400">Intelligente Zeiterfassung</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
            <button
              onClick={() => setModal("impressum")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-slate-300 transition-colors hover:text-white"
            >
              Impressum
            </button>
            <button
              onClick={() => setModal("datenschutz")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-slate-300 transition-colors hover:text-white"
            >
              Datenschutz
            </button>
            <button
              onClick={() => setModal("widerruf")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-slate-300 transition-colors hover:text-white"
            >
              Widerruf
            </button>
            <button
              onClick={() => setModal("cookies")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-slate-300 transition-colors hover:text-white"
            >
              Cookies
            </button>
            <button
              onClick={() => setModal("agb")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-slate-300 transition-colors hover:text-white"
            >
              AGB
            </button>
            <button
              onClick={() => setModal("avv")}
              className="!min-h-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs text-slate-300 transition-colors hover:text-white"
            >
              AVV
            </button>
            <Link href="/blog" className="text-xs text-slate-300 transition-colors hover:text-white">
              Insights
            </Link>
            <a href="#pricing" className="text-xs text-slate-300 transition-colors hover:text-white">Preise</a>
            <Link href="/partner" className="text-xs text-slate-300 transition-colors hover:text-white">
              Partner werden
            </Link>
          </div>

          <p className="text-xs text-slate-400">© 2026 VREMA – Intelligente Zeiterfassung</p>
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
            className="fixed inset-0 z-50 bg-white/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full min-w-0 max-w-lg"
            >
              <div className="rounded-2xl overflow-hidden glass-panel">
                {/* Title bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModal(null)}
                      aria-label="Fenster schließen"
                      className="w-2.5 h-2.5 rounded-full bg-red-400/90 hover:brightness-110 transition-all"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/90" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
                  </div>
                  <span className="text-xs text-muted-foreground font-sans tracking-wider">
                    vrema — {
                      modal === "impressum"
                        ? "impressum.txt"
                        : modal === "datenschutz"
                        ? "datenschutz.txt"
                        : modal === "widerruf"
                        ? "widerruf.txt"
                        : modal === "cookies"
                        ? "cookies.txt"
                        : modal === "agb"
                        ? "agb.txt"
                        : "avv.txt"
                    }
                  </span>
                  <span className="w-6" aria-hidden />
                </div>

                {/* Content */}
                <div className="p-6 font-sans text-sm space-y-4">
                  {modal === "impressum" ? (
                    <>
                      <div className="text-primary text-xs uppercase tracking-widest mb-2">
                        # impressum — Angaben gemäß § 5 TMG
                      </div>
                      {[
                        ["name", "Kevin Konkin · KevkoStudio"],
                        ["address", "Kolbstr. 5 · 67346 Speyer · Deutschland"],
                        ["email", "kontakt@kevko.studio"],
                        ["tel", "+49 176 84844803"],
                        ["§ 19 UStG", "Kleinunternehmer — keine Umsatzsteuer-ID"],
                        ["§ 55 RStV", "Kevin Konkin, Kolbstr. 5, 67346 Speyer"],
                      ].map(([key, val]) => (
                        <div key={key} className="flex gap-3">
                          <span className="text-muted-foreground shrink-0 w-24 text-right">{key}:</span>
                          <span className="text-muted-foreground">{val}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-border text-muted-foreground text-xs leading-relaxed">
                        # Trotz sorgfältiger Kontrolle keine Haftung für externe Links.
                        <br />
                        # Für verlinkte Seiten sind deren Betreiber verantwortlich.
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/impressum" className="text-primary hover:underline">
                          Vollständige Seite öffnen
                        </Link>
                      </div>
                    </>
                  ) : modal === "datenschutz" ? (
                    <>
                      <div className="text-primary text-xs uppercase tracking-widest mb-2">
                        # datenschutz — DSGVO-Erklärung
                      </div>
                      {[
                        ["1. Verantwortlich", "Kevin Konkin (KevkoStudio), Kolbstr. 5, 67346 Speyer"],
                        ["kontakt", "kontakt@kevko.studio"],
                        ["2. Erhebung", "Nur soweit nötig für Website & Vrema-Dienste"],
                        ["3. Rechtsgrundlage", "Art. 6 Abs. 1 lit. b, c, f DSGVO"],
                        ["4. Ihre Rechte", "Auskunft · Berichtigung · Löschung · Widerspruch"],
                        ["Anfragen", "kontakt@kevko.studio"],
                      ].map(([key, val]) => (
                        <div key={key} className="flex gap-3">
                          <span className="text-muted-foreground shrink-0 w-32 text-right text-xs leading-5">{key}:</span>
                          <span className="text-muted-foreground text-xs leading-5">{val}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-border text-muted-foreground text-xs">
                        # Datenübertragbarkeit & Einschränkung der Verarbeitung auf Anfrage.
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/datenschutz" className="text-primary hover:underline">
                          Vollständige Seite öffnen
                        </Link>
                      </div>
                    </>
                  ) : modal === "widerruf" ? (
                    <>
                      <div className="text-primary text-xs uppercase tracking-widest mb-2">
                        # widerruf — Hinweise für Verbraucher
                      </div>
                      <div className="space-y-3 text-xs leading-5 text-muted-foreground">
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
                        <Link href="/widerruf" className="text-primary hover:underline">
                          Vollständige Seite öffnen
                        </Link>
                      </div>
                    </>
                  ) : modal === "cookies" ? (
                    <>
                      <div className="text-primary text-xs uppercase tracking-widest mb-2">
                        # cookies — Einsatz & Optionen
                      </div>
                      <div className="space-y-3 text-xs leading-5 text-muted-foreground">
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
                        <Link href="/cookies" className="text-primary hover:underline">
                          Vollständige Seite öffnen
                        </Link>
                      </div>
                    </>
                  ) : modal === "agb" ? (
                    <>
                      <div className="text-primary text-xs uppercase tracking-widest mb-2">
                        # agb — Vertragsgrundlagen
                      </div>
                      <div className="space-y-3 text-xs leading-5 text-muted-foreground">
                        <p>
                          Unsere Allgemeinen Geschäftsbedingungen regeln Leistungen, Laufzeiten, Kündigung,
                          Haftungsrahmen und weitere Vertragsbedingungen.
                        </p>
                        <p>
                          Bitte lesen Sie die vollständige Fassung vor Abschluss eines Vertrags.
                        </p>
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/agb" className="text-primary hover:underline">
                          Vollständige Seite öffnen
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-primary text-xs uppercase tracking-widest mb-2">
                        # avv — Auftragsverarbeitung
                      </div>
                      <div className="space-y-3 text-xs leading-5 text-muted-foreground">
                        <p>
                          Die AVV beschreibt datenschutzrechtliche Rollen, technische und organisatorische Maßnahmen
                          sowie Pflichten im Rahmen der Auftragsverarbeitung.
                        </p>
                        <p>
                          Die vollständigen Vertragsinhalte und Anlagen finden Sie auf der AVV-Seite.
                        </p>
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/avv" className="text-primary hover:underline">
                          Vollständige Seite öffnen
                        </Link>
                      </div>
                    </>
                  )}

                  <div className="pt-2 flex items-center gap-1 text-muted-foreground">
                    <span>$</span>
                    <Cursor show />
                  </div>
                </div>
              </div>

              {/* Click outside hint */}
              <p className="text-center text-xs text-muted-foreground font-sans mt-3">
                Klick außerhalb oder auf den roten Punkt zum Schließen
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
