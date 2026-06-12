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

/**
 * Mitarbeiter-Start: ein Screen, ein Button — passt zwischen Topbar und Bottom-Nav.
 */
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
    <section
      id="terminal-widget"
      aria-label="Stempeln"
      className="scroll-mt-20 max-md:flex max-md:h-full max-md:min-h-0 max-md:flex-1 max-md:flex-col max-md:justify-center"
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {greeting}, {firstName}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{statusLine}</p>
      </div>

      <div className="my-4 max-md:my-3 sm:my-6">
        <BigClockButton
          isClockedIn={data.isClockedIn}
          clockInAtIso={data.clockInAtIso}
          isOnBreak={data.isOnBreak}
          stampHero
        />
      </div>

      <nav
        aria-label="Schnellzugriff"
        className="flex items-center justify-center gap-4 text-sm text-muted-foreground"
      >
        <Link href="/dashboard/planning" className="min-h-10 min-w-[5.5rem] font-medium text-brand active:opacity-70">
          Plan
        </Link>
        <Link href="/dashboard/vacation" className="min-h-10 min-w-[5.5rem] font-medium text-brand active:opacity-70">
          Urlaub
        </Link>
      </nav>
    </section>
  );
}
