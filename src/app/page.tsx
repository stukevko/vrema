"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
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
} from "lucide-react";

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
    <div className="rounded-2xl overflow-hidden glass-panel">
      <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/90" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/90" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
        <span className="ml-3 text-xs text-muted-foreground tracking-wider">{title}</span>
      </div>
      <div className="p-5 font-sans text-sm leading-relaxed">{children}</div>
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

// ─── Counter animation ────────────────────────────────────────────────────────
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <p className="text-2xl md:text-3xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">{label}</p>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [yearly, setYearly] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
  const [modal, setModal] = useState<"impressum" | "datenschutz" | null>(null);

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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Script
        id="ld-json-vrema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border glass-nav">
        <div className="w-full max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0 py-1">
            <Image
              src="/vrema_logo.png"
              alt="VREMA"
              width={280}
              height={78}
              className="h-10 w-auto object-contain sm:h-11 md:h-12 max-w-[min(52vw,280px)]"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preise</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-card">
              Anmelden
            </Link>
            <Link
              href="/auth/register"
              className="text-sm px-4 py-2 rounded-xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-foreground font-semibold hover:bg-card/70 transition-all"
            >
              Registrieren
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-slate-100 pt-32 pb-16">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-white text-foreground text-xs mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                VREMA - Intelligente Zeiterfassung
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 text-foreground">
                VREMA: Die intelligente Infrastruktur fuer Ihre Personalzeitwirtschaft.
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
                Digitale Zeiterfassung, Auswertung und Compliance in einer konsistenten Plattform fuer Unternehmen mit
                professionellen Prozessen.
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                <Link
                  href="/auth/register"
                  className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-foreground font-bold ring-1 ring-inset ring-white/20 transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] active:scale-95"
                >
                  Jetzt starten
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#pricing"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-border text-muted-foreground font-medium hover:text-foreground hover:border-border transition-all"
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

              <div className="flex items-center gap-6 mt-8 text-xs text-muted-foreground uppercase tracking-widest">
                <span>DSGVO-konform</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span>Made in Germany</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span>Kein Outsourcing</span>
              </div>
            </motion.div>

            {/* Right: Terminal */}
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <TerminalWindow title="vrema — zsh — 120×36">
                <div className="space-y-1 min-h-[260px]">
                  {displayed.map((line, i) => {
                    const isCmd = line.startsWith("$");
                    const isSuccess = line.startsWith("✓");
                    const isInfo = line.startsWith("→");
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={
                          isCmd ? "text-foreground" :
                          isSuccess ? "text-primary" :
                          isInfo ? "text-[#60a5fa]" :
                          "text-muted-foreground"
                        }
                      >
                        {line}
                      </motion.div>
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
      <section className="border-y border-border py-10">
        <div className="w-full max-w-7xl mx-auto px-4 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map((s) => <AnimatedStat key={s.label} {...s} />)}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="border-b border-slate-100 py-24">
        <div className="w-full max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">01 / Features</p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight text-foreground">
              Modulare Funktionen fuer
              <br />
              <span className="text-muted-foreground">eine verlaessliche Zeitwirtschaft.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-7 transition-all md:hover:bg-muted/50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{feature.cmd}</p>
                    <h3 className="font-semibold text-sm mb-1.5 text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI TEASER ───────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-100 py-20">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-violet-300/40 via-sky-300/30 to-emerald-300/40">
            <div className="rounded-2xl bg-white border border-slate-100 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">02 / Core Intelligence</p>
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                    KI-gestuetzte Analyse fuer operative Entscheidungen.
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground max-w-3xl">
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
      <section className="border-t border-border py-24">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
            <p className="text-xs text-primary uppercase tracking-widest mb-4">02 / Philosophie</p>
              <h2 className="text-4xl md:text-5xl font-black leading-tight mb-6">
                Kein Großkonzern.
                <br />
                <span className="text-muted-foreground">Dafür 100% Verlässlichkeit.</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Vrema ist ein Produkt von KevkoStudio — inhaber-geführt, lokal verwurzelt, technisch exzellent.
                Du erreichst direkt denjenigen, der deinen Code schreibt.
              </p>

              <div className="space-y-4">
                {[
                  { num: "01", title: "Direkte Kommunikation", desc: "Kein Ticket-System, kein Account-Manager. Direkt zum Entwickler." },
                  { num: "02", title: "Transparent & Fair", desc: "Feste Preise, klare Meilensteine, keine versteckten Kosten." },
                  { num: "03", title: "Lokale Verwurzelung", desc: "Speyer, Rhein-Neckar, Pfalz. Ein Handschlag zählt mehr als jedes SLA." },
                ].map((item) => (
                  <div key={item.num} className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                    <span className="text-primary text-sm font-bold shrink-0 mt-0.5">{item.num}</span>
                    <div>
                      <p className="font-semibold text-sm mb-1">{item.title}</p>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Terminal: founder card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
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
                      <div key={s.l} className="text-center p-2 rounded-xl bg-white/[0.03] border border-border">
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-border py-24">
        <div className="w-full max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="text-xs text-primary uppercase tracking-widest mb-4">03 / Preise</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Starten.</h2>
            <p className="text-muted-foreground">Kostenlos testen. Keine Kosten. Keine Verpflichtungen.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Egal ob 5 oder 50 Mitarbeiter - ein Preis. Keine versteckten Kosten pro Nutzer.
            </p>
          </motion.div>

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
          <div className="flex items-center gap-4 mb-10">
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

          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-8 border transition-all shadow-2xl shadow-black/20 ${
                  plan.highlight
                    ? "bg-card border-primary/30 shadow-[0_0_40px_rgba(34,197,94,0.07)]"
                    : "bg-card border-border hover:border-white/15"
                }`}
              >
                {"badge" in plan && plan.badge && (
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-emerald-300 text-foreground text-[10px] font-bold uppercase tracking-wider">
                    {plan.badge}
                  </div>
                )}

                {/* Plan header as terminal comment */}
                <div className="text-xs text-muted-foreground mb-4"># {plan.name.toLowerCase()}.plan</div>

                <h3 className="font-black text-xl mb-4">{plan.name}</h3>

                <AnimatePresence mode="wait">
                  {plan.monthlyPrice === null ? (
                    <div className="mb-6">
                      <p className="text-3xl font-black">Auf Anfrage</p>
                      <p className="text-muted-foreground text-xs mt-1">individuell</p>
                    </div>
                  ) : (
                    <motion.div
                      key={yearly ? "y" : "m"}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="mb-6"
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
                    </motion.div>
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
                      : "bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-muted-foreground hover:bg-card/70"
                  }`}
                >
                  {plan.key === "ENTERPRISE" ? "$ kontakt --plan enterprise" : `$ start --plan ${plan.key.toLowerCase()}`}
                </Link>
              </motion.div>
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
      <section className="border-t border-border py-24">
        <div className="w-full max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <TerminalWindow title="vrema — System-Transformation starten">
              <div className="py-8 text-center space-y-6">
                <p className="text-xs text-primary uppercase tracking-widest">03 / Starten</p>
                <h2 className="text-3xl md:text-4xl font-black">
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
          </motion.div>
        </div>
      </section>

      <section className="border-t border-border py-16">
        <div className="w-full max-w-7xl mx-auto rounded-2xl glass-panel p-8 px-4 sm:px-8">
          <h3 className="text-2xl font-bold">Werde VREMA-Partner</h3>
          <p className="mt-2 text-muted-foreground">
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
      <footer className="border-t border-border py-10">
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/vrema_logo.png"
              alt="VREMA"
              width={160}
              height={44}
              className="opacity-90 h-10 w-auto md:h-11 -my-1"
            />
            <div>
              <span className="font-bold text-sm">VREMA</span>
              <span className="ml-1.5 text-[10px] text-muted-foreground">Intelligente Zeiterfassung</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <button
              onClick={() => setModal("impressum")}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Impressum
            </button>
            <button
              onClick={() => setModal("datenschutz")}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Datenschutz
            </button>
            <Link href="/widerruf" className="hover:text-foreground transition-colors">
              Widerruf
            </Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">
              Cookies
            </Link>
            <Link href="/agb" className="hover:text-foreground transition-colors">
              AGB
            </Link>
            <Link href="/avv" className="hover:text-foreground transition-colors">
              AVV
            </Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preise</a>
            <Link href="/partner" className="hover:text-foreground transition-colors">
              Partner werden
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">© 2026 VREMA – Intelligente Zeiterfassung</p>
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
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
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
                    vrema — {modal === "impressum" ? "impressum.txt" : "datenschutz.txt"}
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
                  ) : (
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
