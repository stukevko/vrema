import type { Metadata } from "next";
import Link from "next/link";
import { trialDemoSignupLine } from "@/lib/marketing/trial-copy";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  ChevronRight,
  CircleDot,
  Coffee,
  Euro,
  ShieldCheck,
  Sparkles,
  Timer,
  TriangleAlert,
  Users,
} from "lucide-react";
import { getSiteUrl } from "@/lib/seo/site";
import { trialPricingIntroLine } from "@/lib/marketing/trial-copy";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Live-Demo · VREMA",
  description:
    "Klick dich durch das VREMA-Dashboard – ohne Anmeldung. So sieht ein Restaurant-Setup aus, das mit VREMA plant und stempelt.",
  alternates: { canonical: `${base}/demo` },
  openGraph: {
    title: "VREMA Live-Demo",
    description: "Sieh dir das Manager-Dashboard ohne Signup an.",
    url: `${base}/demo`,
    locale: "de_DE",
    type: "website",
  },
};

const SAMPLE_TEAM = [
  { name: "Anna K.", role: "Service", status: "Eingestempelt seit 10:02", state: "active" },
  { name: "Mehmet Ö.", role: "Küche", status: "Eingestempelt seit 09:47", state: "active" },
  { name: "Sofia R.", role: "Service", status: "Pause seit 12:30", state: "break" },
  { name: "Jonas H.", role: "Bar", status: "Schicht 17:00 – 23:00", state: "planned" },
  { name: "Lisa W.", role: "Service", status: "Urlaub bis Freitag", state: "vacation" },
  { name: "Tarek A.", role: "Küche", status: "Krankgemeldet", state: "absent" },
] as const;

const SAMPLE_SHIFT_TODAY = [
  { start: "09:00", end: "15:00", role: "Küche", name: "Mehmet" },
  { start: "10:00", end: "16:00", role: "Service", name: "Anna" },
  { start: "11:00", end: "17:00", role: "Service", name: "Sofia" },
  { start: "17:00", end: "23:00", role: "Bar", name: "Jonas" },
];

const PENDING_VACATIONS = [
  { name: "Mehmet Ö.", range: "12.06. – 19.06.", days: 6 },
  { name: "Anna K.", range: "01.07. – 05.07.", days: 4 },
];

export default function DemoPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <DemoTopBanner />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:py-10">
        <HeaderGreeting />

        <HeroStats />

        <ComplianceStrip />

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <TodaysShifts />
            <TeamPresence />
          </div>
          <div className="space-y-5">
            <PendingApprovals />
            <NotificationsPreview />
          </div>
        </div>

        <FinalCta />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Sektion-Komponenten – alles statisch, alles SSR.
// ────────────────────────────────────────────────────────────────

function DemoTopBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-amber-300/40 bg-amber-50/95 backdrop-blur-md dark:border-amber-300/15 dark:bg-amber-500/[0.08]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-100">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Live-Demo · Nur Beispieldaten, kein echter Betrieb. {trialPricingIntroLine()}
        </p>
        <Link
          href="/auth/register"
          className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-amber-900 px-3 text-xs font-bold text-amber-50 hover:bg-amber-900/90 dark:bg-amber-200 dark:text-amber-900 dark:hover:bg-amber-200/90"
        >
          Eigene Firma starten
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function HeaderGreeting() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Café Roma · Mitte</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Guten Tag, Demo-Inhaber:in!</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mittwoch · 13.05.2026 · 6 aktive Mitarbeitende</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/45 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/[0.12] dark:text-emerald-200">
          <CircleDot className="h-3 w-3 animate-pulse" aria-hidden />
          Live
        </span>
      </div>
    </header>
  );
}

function HeroStats() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Heute auf einen Blick">
      <StatCard
        icon={Users}
        title="Anwesend jetzt"
        value="3"
        sub="von 6 Mitarbeitenden · 50 % Quote"
        tone="brand"
      />
      <StatCard
        icon={Euro}
        title="Personalkosten heute"
        value="287 €"
        sub="≈ 13 % Lohnquote bei 2.150 € Umsatz"
        tone="success"
      />
      <StatCard
        icon={TriangleAlert}
        title="Aufmerksamkeit"
        value="2"
        sub="1 Korrekturantrag · 1 verspätete Stempelung"
        tone="warning"
      />
    </section>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  sub,
  tone,
}: {
  icon: typeof Users;
  title: string;
  value: string;
  sub: string;
  tone: "brand" | "success" | "warning";
}) {
  const styles = {
    brand: {
      ring: "border-brand/30 dark:border-white/[0.06]",
      bg: "bg-brand-soft/60 dark:bg-brand/[0.07]",
      iconBg: "bg-brand-soft text-brand dark:bg-brand/15",
      titleTone: "text-brand",
    },
    success: {
      ring: "border-emerald-300/40 dark:border-emerald-500/15",
      bg: "bg-emerald-50/70 dark:bg-emerald-500/[0.06]",
      iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
      titleTone: "text-emerald-700 dark:text-emerald-200",
    },
    warning: {
      ring: "border-amber-300/45 dark:border-amber-500/15",
      bg: "bg-amber-50/70 dark:bg-amber-500/[0.07]",
      iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
      titleTone: "text-amber-700 dark:text-amber-200",
    },
  }[tone];

  return (
    <article className={`rounded-2xl border ${styles.ring} ${styles.bg} p-5 shadow-sm`}>
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconBg} shadow-sm`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${styles.titleTone}`}>{title}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
    </article>
  );
}

function ComplianceStrip() {
  return (
    <section className="rounded-2xl border border-emerald-300/40 bg-emerald-50/60 p-5 shadow-sm dark:border-emerald-500/15 dark:bg-emerald-500/[0.06]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-card/80 text-emerald-700 shadow-sm dark:bg-surface/70 dark:text-emerald-200">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold">ArbZG-Compliance: alles im grünen Bereich</h2>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              Score 96 / 100
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Auswertung KW 19: Tages- und Wochenstunden, Ruhezeit und Pausen nach ArbZG §3 – §5. Schützt vor Bußgeldern bis 30.000 €.
          </p>
        </div>
      </div>
    </section>
  );
}

function TodaysShifts() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/[0.06] dark:bg-surface/70">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Schichten heute</h2>
        </div>
        <Link href="/auth/register" className="text-xs font-semibold text-brand hover:underline">
          Im Planer öffnen <ChevronRight className="inline h-3 w-3" />
        </Link>
      </div>
      <ul className="mt-4 space-y-2">
        {SAMPLE_SHIFT_TODAY.map((s) => (
          <li
            key={`${s.start}-${s.name}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/40 px-4 py-3 dark:border-white/[0.05] dark:bg-surface/40"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15">
                <Timer className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {s.start} – {s.end} <span className="text-muted-foreground">·</span> {s.role}
                </p>
                <p className="text-xs text-muted-foreground">{s.name}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground dark:bg-surface/80">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden /> bestätigt
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamPresence() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/[0.06] dark:bg-surface/70">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Team-Status</h2>
      </div>
      <ul className="mt-4 divide-y divide-border/60 dark:divide-white/[0.05]">
        {SAMPLE_TEAM.map((p) => {
          const tone = {
            active: "text-emerald-700 dark:text-emerald-200",
            break: "text-amber-700 dark:text-amber-200",
            planned: "text-brand",
            vacation: "text-sky-700 dark:text-sky-300",
            absent: "text-rose-700 dark:text-rose-300",
          }[p.state];
          return (
            <li key={p.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand dark:bg-brand/15">
                  {p.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.role}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold ${tone}`}>{p.status}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PendingApprovals() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/[0.06] dark:bg-surface/70">
      <div className="flex items-center gap-2">
        <Coffee className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Offene Urlaubsfreigaben</h2>
      </div>
      <ul className="mt-4 space-y-2">
        {PENDING_VACATIONS.map((v) => (
          <li
            key={v.name}
            className="rounded-xl border border-border/70 bg-surface-muted/40 px-4 py-3 dark:border-white/[0.05] dark:bg-surface/40"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{v.name}</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                Pending
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {v.range} <span className="mx-1">·</span> {v.days} Werktage
            </p>
            <div className="mt-3 flex gap-2">
              <button
                disabled
                className="inline-flex h-8 flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
              >
                Genehmigen
              </button>
              <button
                disabled
                className="inline-flex h-8 flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-rose-100 text-xs font-bold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200"
              >
                Ablehnen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotificationsPreview() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/[0.06] dark:bg-surface/70">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Push-Vorschau</h2>
      </div>
      <ul className="mt-4 space-y-2 text-xs">
        <li className="rounded-xl border border-border/70 bg-surface-muted/40 px-3 py-2 dark:border-white/[0.05] dark:bg-surface/40">
          <p className="font-semibold text-foreground">Mehmet Ö. hat eingestempelt</p>
          <p className="text-[11px] text-muted-foreground">vor 47 Min · Schicht „Küche 09:00 – 15:00"</p>
        </li>
        <li className="rounded-xl border border-border/70 bg-surface-muted/40 px-3 py-2 dark:border-white/[0.05] dark:bg-surface/40">
          <p className="font-semibold text-foreground">Lohnreport KW 18 bereit</p>
          <p className="text-[11px] text-muted-foreground">vor 2 Std · Klick öffnet PDF</p>
        </li>
        <li className="rounded-xl border border-border/70 bg-surface-muted/40 px-3 py-2 dark:border-white/[0.05] dark:bg-surface/40">
          <p className="font-semibold text-foreground">Anna K. fragt nach Schichttausch</p>
          <p className="text-[11px] text-muted-foreground">heute Morgen · Tausch-Partner: Sofia R.</p>
        </li>
      </ul>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/10 via-card to-card p-8 text-center shadow-md dark:border-white/[0.06] dark:from-brand/15 dark:via-surface/70 dark:to-surface/70 sm:p-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand">Bereit für deine echte Firma?</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        VREMA mit deinem Team in 90 Sekunden einrichten
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
        {trialDemoSignupLine()}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/auth/register"
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand px-6 text-sm font-semibold text-brand-foreground shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]"
        >
          Kostenlos starten
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/#roi"
          className="inline-flex min-h-12 items-center rounded-2xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-card/70"
        >
          ROI-Rechner ansehen
        </Link>
      </div>
    </section>
  );
}

// Avoid unused-import lint noise.
void Clock;
