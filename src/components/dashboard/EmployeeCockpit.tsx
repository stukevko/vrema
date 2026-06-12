import Link from "next/link";
import type { EmployeeCockpitData } from "@/lib/dashboard/employee-cockpit-data";
import { BigClockButton } from "@/components/dashboard/BigClockButton";
import { vocabularyLabels, type VocabularyLabels } from "@/lib/vocabulary";

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

/** Mitarbeiter-Start: viel Luft um den Stempel — kein Vollbild-Zwang. */
export function EmployeeCockpit({
  data,
  firstName,
  labels = vocabularyLabels("SHIFT"),
}: {
  data: EmployeeCockpitData;
  firstName: string;
  labels?: Pick<VocabularyLabels, "singular" | "plural" | "planTitle">;
}) {
  const greeting = getGreeting();
  const slot = labels.singular;

  const statusLine = data.isClockedIn
    ? `${formatHours(data.workedTodayMins)} heute${
        data.clockInAtIso ? ` · seit ${formatBerlinTimeShort(data.clockInAtIso)}` : ""
      }`
    : data.nextShift
      ? `Plan ${data.nextShift.startTime}–${data.nextShift.endTime}`
      : `Heute kein ${slot} im Plan`;

  return (
    <section id="terminal-widget" aria-label="Stempeln" className="scroll-mt-20">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-8 py-6 max-md:py-8 sm:gap-10 sm:py-10">
        <div className="space-y-1 text-center">
          <p className="text-sm text-muted-foreground">
            {greeting}, {firstName}
          </p>
          <p className="text-sm text-foreground/90">{statusLine}</p>
        </div>

        <BigClockButton
          isClockedIn={data.isClockedIn}
          clockInAtIso={data.clockInAtIso}
          isOnBreak={data.isOnBreak}
          stampHero
        />

        <nav
          aria-label="Schnellzugriff"
          className="flex items-center gap-6 text-sm text-muted-foreground"
        >
          <Link href="/dashboard/planning" className="font-medium text-brand/90 active:opacity-70">
            Plan
          </Link>
          <Link href="/dashboard/vacation" className="font-medium text-brand/90 active:opacity-70">
            Urlaub
          </Link>
        </nav>
      </div>
    </section>
  );
}
