import Link from "next/link";
import { CalendarClock, Clock3, Coffee, Palmtree, Sparkles } from "lucide-react";
import type { EmployeeCockpitData } from "@/lib/dashboard/employee-cockpit-data";
import { BigClockButton } from "@/components/dashboard/BigClockButton";

function formatHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatBerlinTimeShort(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getGreeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

export function EmployeeCockpit({ data, firstName }: { data: EmployeeCockpitData; firstName: string }) {
  const greeting = getGreeting();

  const heroPrimary = data.isClockedIn
    ? data.isOnBreak
      ? "Du bist gerade in der Pause"
      : `Eingestempelt seit ${data.clockInAtIso ? formatBerlinTimeShort(data.clockInAtIso) : "—"} Uhr`
    : "Bereit, in deine Schicht zu starten?";
  const heroSecondary = data.isClockedIn
    ? `Heute schon ${formatHours(data.workedTodayMins)} im Einsatz.`
    : data.nextShift
      ? `Nächste Schicht: ${data.nextShift.whenLabel}.`
      : "Heute ist keine Schicht für dich eingeplant — nutz die Zeit oder sprich kurz mit der Führung.";

  return (
    <section
      aria-label="Mein Cockpit"
      className="glass-card relative min-w-0 max-w-full overflow-hidden p-4 sm:p-6"
    >
      {/* Specular Highlight (Apple) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15"
      />
      {/* Subtiler Petrol-Lichthauch im Hintergrund */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-brand/15 blur-3xl max-md:opacity-50 md:-right-10 dark:bg-brand/22"
      />

      <ol className="relative mb-4 flex gap-2 md:hidden" aria-label="Dein Ablauf heute">
        {[
          { n: "1", t: "Stempeln", active: true },
          { n: "2", t: "Schicht", active: Boolean(data.nextShift) },
          { n: "3", t: "Urlaub", active: data.vacation.pendingRequests > 0 },
        ].map((step) => (
          <li
            key={step.n}
            className={`flex flex-1 flex-col items-center rounded-xl border px-2 py-2 text-center ${
              step.active ? "border-brand/35 bg-brand-soft/80" : "border-border/70 bg-muted/30"
            }`}
          >
            <span className="text-[10px] font-bold text-brand">{step.n}</span>
            <span className="text-[10px] font-semibold text-foreground">{step.t}</span>
          </li>
        ))}
      </ol>

      {/* Hero: Begrüßung + Status */}
      <div className="relative mb-5 flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">
          {greeting}, {firstName}
        </p>
        <h1 className="text-xl font-extrabold leading-tight tracking-tight text-foreground sm:text-2xl">
          {heroPrimary}
        </h1>
        <p className="text-sm text-muted-foreground">{heroSecondary}</p>
        {data.isClockedIn && data.isOnBreak ? (
          <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-warning-foreground dark:border-white/10 dark:bg-warning/22">
            Pause läuft
          </span>
        ) : null}
      </div>

      {/* Action: großer Stempel-Button */}
      <BigClockButton
        isClockedIn={data.isClockedIn}
        clockInAtIso={data.clockInAtIso}
        isOnBreak={data.isOnBreak}
      />

      {!data.isClockedIn && !data.nextShift ? (
        <div className="mt-4 rounded-2xl border border-dashed border-brand/30 bg-brand-soft/70 px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-brand/15">
          <p className="flex items-start gap-2 font-medium">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span>
              Kein Schicht-Slot im Plan? Das ist normal bei Ruhetagen oder wenn der Chef noch plant — der große Button oben
              stempelt trotzdem (mit Hinweis im System).
            </span>
          </p>
        </div>
      ) : null}

      {/* Quick-Stats */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Nächste Schicht */}
        <Link
          href="/dashboard/planning"
          className={`group flex min-h-[112px] items-start gap-3 rounded-2xl border p-4 transition-[background-color,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-card-hover)] active:brightness-95 ${
            data.nextShift
              ? "border-line bg-surface hover:border-brand/40 dark:border-white/10 dark:bg-surface/85"
              : "border-dashed border-brand/30 bg-brand-soft/65 hover:border-brand/50 dark:border-white/10 dark:bg-brand/15"
          }`}
        >
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 dark:border-white/10 ${
              data.nextShift
                ? "bg-brand-soft text-brand dark:bg-brand/25"
                : "bg-brand-soft text-brand dark:bg-brand/30"
            }`}
          >
            <CalendarClock className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nächste Schicht</p>
            {data.nextShift ? (
              <>
                <p className="mt-0.5 text-sm font-bold text-foreground">
                  {data.nextShift.startTime}–{data.nextShift.endTime}
                </p>
                <p className="text-[11px] text-muted-foreground">{data.nextShift.whenLabel}</p>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-sm font-bold text-foreground">Gerade nichts Geplantes</p>
                <p className="text-[11px] text-muted-foreground">
                  Im Wochenplan nachsehen — oder kurz beim Team nachfragen.
                </p>
                <span className="mt-2 inline-flex text-[11px] font-semibold text-brand group-hover:underline">
                  Planung öffnen →
                </span>
              </>
            )}
          </div>
        </Link>

        {/* Offener Urlaub */}
        <Link
          href="/dashboard/vacation"
          className="group flex min-h-[112px] items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition-[background-color,border-color,box-shadow] duration-200 hover:border-brand/40 hover:shadow-[var(--shadow-card-hover)] active:brightness-95 dark:border-white/10 dark:bg-surface/85"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-warning-soft text-warning-foreground dark:border-white/10 dark:bg-warning/22">
            <Palmtree className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Offener Urlaub</p>
            {data.vacation.pendingRequests > 0 ? (
              <>
                <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
                  {data.vacation.pendingRequests} {data.vacation.pendingRequests === 1 ? "Antrag" : "Anträge"}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {data.vacation.pendingDays} Tage warten auf Freigabe
                </p>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
                  {data.vacation.remaining} Tage frei
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {data.vacation.taken}/{data.vacation.total} genommen
                </p>
              </>
            )}
            <span className="mt-2 inline-flex text-[11px] font-semibold text-warning-foreground group-hover:underline">
              Urlaub öffnen →
            </span>
          </div>
        </Link>

        {/* Stunden diesen Monat */}
        <div
          className={`flex min-h-[112px] items-start gap-3 rounded-2xl border p-4 ${
            data.workedThisMonthMins > 0
              ? "border-line bg-surface dark:border-white/10 dark:bg-surface/85"
              : "border-dashed border-brand/30 bg-brand-soft/65 dark:border-white/10 dark:bg-brand/15"
          }`}
        >
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 dark:border-white/10 ${
              data.workedThisMonthMins > 0
                ? "bg-brand-soft text-brand dark:bg-brand/25"
                : "bg-brand-soft text-brand dark:bg-brand/30"
            }`}
          >
            <Clock3 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Stunden diesen Monat
            </p>
            <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
              {data.workedThisMonthMins > 0 ? formatHours(data.workedThisMonthMins) : "Noch keine Buchungen"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", month: "long" }).format(new Date())}
            </p>
            {data.workedThisMonthMins === 0 ? (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-brand">
                <Coffee className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Sobald du einstempelst, füllt sich diese Karte automatisch.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
