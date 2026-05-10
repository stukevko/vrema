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
      className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-slate-50/90 to-card p-4 shadow-sm sm:p-6"
    >
      {/* Hero: Begrüßung + Status */}
      <div className="mb-5 flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {greeting}, {firstName}
        </p>
        <h1 className="text-xl font-extrabold leading-tight tracking-tight text-foreground sm:text-2xl">
          {heroPrimary}
        </h1>
        <p className="text-sm text-muted-foreground">{heroSecondary}</p>
        {data.isClockedIn && data.isOnBreak ? (
          <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-800">
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
        <div className="mt-4 rounded-2xl border border-dashed border-sky-300/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
          <p className="flex items-start gap-2 font-medium">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
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
          className={`group flex min-h-[112px] items-start gap-3 rounded-2xl border p-4 transition-all active:scale-[0.99] ${
            data.nextShift
              ? "border-border bg-white/95 hover:border-primary/40 hover:bg-card/80"
              : "border-dashed border-sky-300/70 bg-gradient-to-br from-sky-50 to-white hover:border-sky-400/80"
          }`}
        >
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              data.nextShift ? "bg-sky-100 text-sky-700" : "bg-sky-200/80 text-sky-800"
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
                <span className="mt-2 inline-flex text-[11px] font-semibold text-sky-700 group-hover:underline">
                  Planung öffnen →
                </span>
              </>
            )}
          </div>
        </Link>

        {/* Offener Urlaub */}
        <Link
          href="/dashboard/vacation"
          className="group flex min-h-[112px] items-start gap-3 rounded-2xl border border-border bg-white/95 p-4 transition-all active:scale-[0.99] hover:border-primary/40 hover:bg-card/80"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
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
            <span className="mt-2 inline-flex text-[11px] font-semibold text-amber-800/90 group-hover:underline">
              Urlaub öffnen →
            </span>
          </div>
        </Link>

        {/* Stunden diesen Monat */}
        <div
          className={`flex min-h-[112px] items-start gap-3 rounded-2xl border p-4 ${
            data.workedThisMonthMins > 0
              ? "border-border bg-white/95"
              : "border-dashed border-emerald-300/60 bg-gradient-to-br from-emerald-50/90 to-white"
          }`}
        >
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              data.workedThisMonthMins > 0 ? "bg-emerald-100 text-emerald-700" : "bg-emerald-200/70 text-emerald-900"
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
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-emerald-900/85">
                <Coffee className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Sobald du einstellempelst, füllt sich diese Karte automatisch.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
