"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import {
  Clock,
  Terminal,
  MapPin,
  FileText,
  Shield,
  ShieldCheck,
  Scale,
  Server,
  Wifi,
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
  return <span className={`inline-block w-2 h-4 bg-[#22c55e] ml-0.5 align-middle ${vis ? "opacity-100" : "opacity-0"}`} />;
}

// ─── Terminal window component ────────────────────────────────────────────────
function TerminalWindow({ title = "vrema — zsh", children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl overflow-hidden border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-card/90 backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-white/35 tracking-wider">{title}</span>
      </div>
      <div className="p-5 font-sans text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ─── Feature cards ───────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Clock, cmd: "clock-in", title: "1-Klick Stempeluhr", desc: "Start, Pause, Stop. Mehr nicht. Auf Smartphone oder Terminal." },
  { icon: BarChart3, cmd: "report --live", title: "Echtzeit-Auswertungen", desc: "Stundenübersicht, Wochenstatistik, Abweichungen. Sofort sichtbar." },
  { icon: MapPin, cmd: "gps --verify", title: "GPS-Tracking", desc: "Baustelle, Kundenbesuch, Außendienst. Position wird sicher erfasst." },
  { icon: FileText, cmd: "export --pdf", title: "PDF-Reports", desc: "Stundenzettel für Lohnbüro, Abrechnung oder Archiv. Ein Klick." },
  { icon: Shield, cmd: "secure --256bit", title: "Verschlüsselt & Privat", desc: "Deine Daten bleiben bei dir. DSGVO-konform, ohne Drittanbieter." },
  { icon: QrCode, cmd: "terminal --qr", title: "QR-Terminal Support", desc: "Physisches Terminal mit QR-Code. Robuste Hardware trifft Cloud." },
];

const STATS = [
  { value: "99.9%", label: "Uptime" },
  { value: "<50ms", label: "Latenz" },
  { value: "256bit", label: "Verschlüsselung" },
  { value: "100%", label: "DSGVO-konform" },
];

const PLANS = [
  {
    key: "STARTER",
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 24,
    highlight: false,
    features: ["Bis zu 10 Mitarbeiter", "Live-Terminal", "Saldo-Übersicht", "Urlaubsanträge", "E-Mail-Support"],
    missing: ["PDF-Export", "GPS-Stempelung", "Lohnbüro-Versand"],
  },
  {
    key: "BUSINESS",
    name: "Business",
    monthlyPrice: 79,
    yearlyPrice: 66,
    highlight: true,
    badge: "Beliebtester Plan",
    features: ["Bis zu 100 Mitarbeiter", "Alles aus Starter", "PDF-Export", "Lohnbüro-Versand", "GPS-Stempelung", "Prioritäts-Support"],
    missing: ["API-Zugang"],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    highlight: false,
    features: ["Unbegrenzte Mitarbeiter", "Alles aus Business", "API-Zugang", "Custom Branding", "Dedizierter Support", "SLA-Garantie"],
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
      <p className="text-2xl md:text-3xl font-bold text-emerald-300">{value}</p>
      <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">{label}</p>
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
    "$ vrema clock-in --gps",
    "✓ Eingestempelt: 08:02 Uhr · GPS verifiziert",
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
          "Digitale Zeiterfassung mit Stempeluhr, GPS, Berichten und DATEV-freundlichem Export.",
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
    <div className="min-h-screen bg-background text-white overflow-x-hidden">
      <Script
        id="ld-json-vrema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,rgba(34,197,94,0.06)_0%,transparent_70%)]" />
      </div>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.08] bg-background/90 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/vremalogo.png" alt="Vrema Logo" width={52} height={52} className="-my-2" />
            <div>
              <span className="font-bold text-base tracking-tight">Vrema</span>
              <span className="ml-2 text-[10px] text-white/30 uppercase tracking-widest">by KevkoStudio</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Preise</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-xl hover:bg-white/5">
              Anmelden
            </Link>
            <Link
              href="/auth/register"
              className="text-sm px-4 py-2 rounded-xl bg-card text-white font-semibold hover:bg-card/80 transition-all"
            >
              Registrieren
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 text-emerald-200 text-xs mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Ein Produkt von KevkoStudio
              </div>

              <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-6">
                Zeiterfassung.
                <br />
                <span className="text-[#22c55e]">Präzise. Einfach.</span>
              </h1>

              <p className="text-lg text-white/50 leading-relaxed mb-10 max-w-md">
                Stempeluhr, Auswertungen und GPS-Tracking in einer Anwendung.{" "}
                <span className="text-white/70">Gebaut für Handwerker, Dienstleister & Teams.</span>
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                <Link
                  href="/auth/register"
                  className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-[#22c55e] text-black font-bold hover:bg-[#16a34a] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#22c55e]/20"
                >
                  Kostenlos starten
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#pricing"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-white/10 text-white/60 font-medium hover:text-white hover:border-white/20 transition-all"
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
                    className="rounded-2xl border border-white/5 bg-card/50 px-3 py-2 backdrop-blur-sm"
                  >
                    <p className="text-[11px] font-semibold text-slate-300">{seal.label}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{seal.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-6 mt-8 text-xs text-white/25 uppercase tracking-widest">
                <span>DSGVO-konform</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>Made in Germany</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
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
                          isCmd ? "text-white/90" :
                          isSuccess ? "text-[#22c55e]" :
                          isInfo ? "text-[#60a5fa]" :
                          "text-white/40"
                        }
                      >
                        {line}
                      </motion.div>
                    );
                  })}
                  {!done && (
                    <div className={inProgress.startsWith("$") ? "text-white/90" : inProgress.startsWith("✓") ? "text-[#22c55e]" : "text-[#60a5fa]"}>
                      {inProgress}
                      <Cursor show={true} />
                    </div>
                  )}
                  {done && (
                    <div className="text-white/30 flex items-center gap-1 mt-2">
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
                  <div key={badge.label} className="rounded-2xl bg-card border border-white/5 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{badge.label}</p>
                    <p className="font-bold text-sm tabular-nums" style={{ color: badge.color }}>{badge.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
      <section className="py-10 px-6 border-y border-white/[0.06]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => <AnimatedStat key={s.label} {...s} />)}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="text-xs text-[#22c55e] uppercase tracking-widest mb-4">01 / Features</p>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              Alles, was du brauchst.
              <br />
              <span className="text-white/30">Nichts, was du nicht brauchst.</span>
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
                className="group relative rounded-3xl bg-card border border-white/5 p-7 hover:border-emerald-300/20 transition-all overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
              >
                {/* hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(ellipse_at_0%_0%,rgba(34,197,94,0.04),transparent_60%)]" />

                <div className="relative z-10">
                  {/* Terminal command badge */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-300/10 border border-emerald-300/20 text-emerald-200 text-[10px] mb-4">
                    <span className="opacity-50">$</span> {feature.cmd}
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:border-[#22c55e]/20 transition-colors">
                      <feature.icon className="w-5 h-5 text-white/50 group-hover:text-[#22c55e] transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-1.5">{feature.title}</h3>
                      <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
            <p className="text-xs text-[#22c55e] uppercase tracking-widest mb-4">02 / Philosophie</p>
              <h2 className="text-4xl md:text-5xl font-black leading-tight mb-6">
                Kein Großkonzern.
                <br />
                <span className="text-white/30">Dafür 100% Verlässlichkeit.</span>
              </h2>
              <p className="text-white/50 leading-relaxed mb-8">
                Vrema ist ein Produkt von KevkoStudio — inhaber-geführt, lokal verwurzelt, technisch exzellent.
                Du erreichst direkt denjenigen, der deinen Code schreibt.
              </p>

              <div className="space-y-4">
                {[
                  { num: "01", title: "Direkte Kommunikation", desc: "Kein Ticket-System, kein Account-Manager. Direkt zum Entwickler." },
                  { num: "02", title: "Transparent & Fair", desc: "Feste Preise, klare Meilensteine, keine versteckten Kosten." },
                  { num: "03", title: "Lokale Verwurzelung", desc: "Speyer, Rhein-Neckar, Pfalz. Ein Handschlag zählt mehr als jedes SLA." },
                ].map((item) => (
                  <div key={item.num} className="flex gap-4 p-5 rounded-2xl bg-card border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <span className="text-[#22c55e] text-sm font-bold shrink-0 mt-0.5">{item.num}</span>
                    <div>
                      <p className="font-semibold text-sm mb-1">{item.title}</p>
                      <p className="text-white/40 text-sm">{item.desc}</p>
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
                  <div className="text-white/40">
                    <span className="text-white/20">$</span> whoami --verbose
                  </div>
                  <div className="border-l-2 border-[#22c55e]/30 pl-4 space-y-2">
                    <p className="text-[#22c55e]">Kevin Konkin</p>
                    <p className="text-white/50 text-xs">Gründer & Entwickler, KevkoStudio</p>
                    <p className="text-white/30 text-xs">Kolbstr. 5 · 67346 Speyer · Deutschland</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[{ v: "10+", l: "Jahre" }, { v: "Full", l: "Stack" }, { v: "5★", l: "Feedback" }].map((s) => (
                      <div key={s.l} className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-[#22c55e] font-bold text-lg">{s.v}</p>
                        <p className="text-white/30 text-xs">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-[#22c55e]/5 border border-[#22c55e]/10">
                    <p className="text-[#22c55e]/80 text-sm">
                      &gt; "Problemlösung durch Handschlagqualität."
                    </p>
                  </div>
                  <div className="text-white/20 flex items-center gap-1">
                    $<Cursor show={true} />
                  </div>
                </div>
              </TerminalWindow>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="text-xs text-[#22c55e] uppercase tracking-widest mb-4">03 / Preise</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Starten.</h2>
            <p className="text-white/40">Kostenlos testen. Keine Kreditkarte. Keine Verpflichtungen.</p>
            <p className="mt-2 text-sm text-white/60">
              Egal ob 5 oder 50 Mitarbeiter - ein Preis. Keine versteckten Kosten pro Nutzer.
            </p>
          </motion.div>

          <div className="mb-10 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-card p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-2 text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-sm font-semibold">DATEV-Ready</p>
              </div>
              <p className="mt-1 text-sm text-white/65">Exportformate für Ihr Lohnbüro optimiert.</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-card p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-2 text-emerald-200">
                <Scale className="h-4 w-4" />
                <p className="text-sm font-semibold">Revisionssicher</p>
              </div>
              <p className="mt-1 text-sm text-white/65">Vollständiger Audit-Trail nach GoBD-Standards.</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-card p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-2 text-emerald-200">
                <Server className="h-4 w-4" />
                <p className="text-sm font-semibold">Hosted in Germany</p>
              </div>
              <p className="mt-1 text-sm text-white/65">100% DSGVO-konform & sicher.</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-4 mb-10">
            <span className={`text-sm transition-colors ${!yearly ? "text-white" : "text-white/30"}`}>monatlich</span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? "bg-[#22c55e]" : "bg-white/10"}`}
            >
              <motion.div
                layout
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                animate={{ left: yearly ? "calc(100% - 20px)" : "4px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm transition-colors ${yearly ? "text-white" : "text-white/30"}`}>
              jährlich
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] font-bold">-2 Monate</span>
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
                className={`relative rounded-3xl p-8 border transition-all shadow-2xl shadow-black/20 ${
                  plan.highlight
                    ? "bg-card border-primary/30 shadow-[0_0_40px_rgba(34,197,94,0.07)]"
                    : "bg-card border-white/5 hover:border-white/15"
                }`}
              >
                {"badge" in plan && plan.badge && (
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-emerald-300 text-black text-[10px] font-bold uppercase tracking-wider">
                    {plan.badge}
                  </div>
                )}

                {/* Plan header as terminal comment */}
                <div className="text-xs text-white/20 mb-4"># {plan.name.toLowerCase()}.plan</div>

                <h3 className="font-black text-xl mb-4">{plan.name}</h3>

                <AnimatePresence mode="wait">
                  {plan.monthlyPrice === null ? (
                    <div className="mb-6">
                      <p className="text-3xl font-black">Auf Anfrage</p>
                      <p className="text-white/30 text-xs mt-1">individuell</p>
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
                        <span className="text-white/30 text-sm mb-1.5">/mo</span>
                      </div>
                      {yearly && (
                        <p className="text-white/30 text-xs mt-1">
                          = {(plan.yearlyPrice! * 12)}€/Jahr · spare {((plan.monthlyPrice! - plan.yearlyPrice!) * 12)}€
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                      <span className="text-white/70">{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm opacity-25">
                      <span className="w-3.5 h-3.5 shrink-0 text-center text-white/30 text-xs">—</span>
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
                      ? "bg-[#22c55e] text-black hover:bg-[#16a34a]"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]"
                  }`}
                >
                  {plan.key === "ENTERPRISE" ? "$ kontakt --plan enterprise" : `$ start --plan ${plan.key.toLowerCase()}`}
                </Link>
              </motion.div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-white/40">
            <Link
              href="/partner"
              className="text-[#22c55e]/90 hover:text-[#22c55e] underline underline-offset-2 text-xs"
            >
              Partner werden
            </Link>
            <span className="text-white/25 mx-2">·</span>
            <span className="text-white/35">Schreib uns kurz — kein Login, nur Link teilen.</span>
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <TerminalWindow title="vrema — System-Transformation starten">
              <div className="py-8 text-center space-y-6">
                <p className="text-xs text-[#22c55e] uppercase tracking-widest">03 / Starten</p>
                <h2 className="text-3xl md:text-4xl font-black">
                  System-Transformation starten.
                </h2>
                <p className="text-white/40 text-sm">
                  Kostenlos testen. Keine Kreditkarte. Keine Verpflichtungen.
                </p>
                <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
                  <Link
                    href="/auth/register"
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#22c55e] text-black font-bold hover:bg-[#16a34a] transition-all hover:scale-105 active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    Jetzt registrieren
                  </Link>
                  <a
                    href="#pricing"
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-white/10 text-white/60 font-medium hover:text-white hover:border-white/20 transition-all"
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

      <section className="py-16 px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto rounded-3xl border border-emerald-300/20 bg-card p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h3 className="text-2xl font-bold">Werde VREMA-Partner</h3>
          <p className="mt-2 text-white/70">
            Du kennst Betriebe, die eine moderne Zeiterfassung brauchen? Empfiehl VREMA und erhalte bis zu 15€ pro
            Abschluss. Ohne Haken, direkt in dein Dashboard.
          </p>
          <div className="mt-5">
            <Link
              href="/partner-login"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#22c55e] px-6 py-3 font-bold text-black hover:bg-[#16a34a] transition-colors"
            >
              Jetzt Partner werden
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/vremalogo.png" alt="Vrema Logo" width={46} height={46} className="opacity-60 -my-2" />
            <div>
              <span className="font-bold text-sm">Vrema</span>
              <span className="ml-1.5 text-[10px] text-white/25">by KevkoStudio</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-white/30">
            <button
              onClick={() => setModal("impressum")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Impressum
            </button>
            <button
              onClick={() => setModal("datenschutz")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Datenschutz
            </button>
            <Link href="/widerruf" className="hover:text-white transition-colors">
              Widerruf
            </Link>
            <Link href="/cookies" className="hover:text-white transition-colors">
              Cookies
            </Link>
            <Link href="/agb" className="hover:text-white transition-colors">
              AGB
            </Link>
            <Link href="/avv" className="hover:text-white transition-colors">
              AVV
            </Link>
            <a href="#pricing" className="hover:text-white transition-colors">Preise</a>
            <Link href="/partner" className="hover:text-white transition-colors">
              Partner werden
            </Link>
          </div>

          <p className="text-xs text-white/20">© 2026 Vrema by KevkoStudio</p>
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
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <div className="rounded-3xl overflow-hidden border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-card">
                {/* Title bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModal(null)}
                      className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all"
                    />
                    <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-xs text-white/30 font-sans tracking-wider">
                    vrema — {modal === "impressum" ? "impressum.txt" : "datenschutz.txt"}
                  </span>
                  <button
                    onClick={() => setModal(null)}
                    className="text-white/20 hover:text-white transition-colors font-sans text-sm px-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 font-sans text-sm space-y-4">
                  {modal === "impressum" ? (
                    <>
                      <div className="text-[#22c55e] text-xs uppercase tracking-widest mb-2">
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
                          <span className="text-white/25 shrink-0 w-24 text-right">{key}:</span>
                          <span className="text-white/70">{val}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-white/5 text-white/25 text-xs leading-relaxed">
                        # Trotz sorgfältiger Kontrolle keine Haftung für externe Links.
                        <br />
                        # Für verlinkte Seiten sind deren Betreiber verantwortlich.
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/impressum" className="text-[#22c55e] hover:underline">
                          Vollständige Seite öffnen
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[#22c55e] text-xs uppercase tracking-widest mb-2">
                        # datenschutz — DSGVO-Erklärung
                      </div>
                      {[
                        ["1. Verantwortlich", "Kevin Konkin (KevkoStudio), Kolbstr. 5, 67346 Speyer"],
                        ["kontakt", "kontakt@kevko.studio"],
                        ["2. Erhebung", "Nur soweit nötig für Website & Vrema-Dienste"],
                        ["3. Rechtsgrundlage", "Art. 6 Abs. 1 lit. b, c, f DSGVO"],
                        ["4. Deine Rechte", "Auskunft · Berichtigung · Löschung · Widerspruch"],
                        ["Anfragen", "kontakt@kevko.studio"],
                      ].map(([key, val]) => (
                        <div key={key} className="flex gap-3">
                          <span className="text-white/25 shrink-0 w-32 text-right text-xs leading-5">{key}:</span>
                          <span className="text-white/70 text-xs leading-5">{val}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-white/5 text-white/25 text-xs">
                        # Datenübertragbarkeit & Einschränkung der Verarbeitung auf Anfrage.
                      </div>
                      <div className="pt-3 text-xs">
                        <Link href="/datenschutz" className="text-[#22c55e] hover:underline">
                          Vollständige Seite öffnen
                        </Link>
                      </div>
                    </>
                  )}

                  <div className="pt-2 flex items-center gap-1 text-white/20">
                    <span>$</span>
                    <Cursor show />
                  </div>
                </div>
              </div>

              {/* Click outside hint */}
              <p className="text-center text-xs text-white/20 font-sans mt-3">
                Klick außerhalb oder <span className="text-white/40">✕</span> zum Schließen
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
