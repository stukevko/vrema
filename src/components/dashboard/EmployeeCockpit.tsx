import Link from "next/link";
import type { EmployeeCockpitData } from "@/lib/dashboard/employee-cockpit-data";
import { BigClockButton } from "@/components/dashboard/BigClockButton";
import { DashboardSectionCard } from "@/components/dashboard/DashboardSectionCard";
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
 * Mitarbeiter-Start: ein Tipp zum Stempeln — Rest ist Kontext, keine zweite Ebene.
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
    ? [
        data.clockInAtIso ? `${formatBerlinTimeShort(data.clockInAtIso)} Uhr` : null,
        data.isOnBreak ? "Pause" : "läuft",
        `${formatHours(data.workedTodayMins)} heute`,
      ]
        .filter(Boolean)
        .join(" · ")
    : data.nextShift
      ? `Plan ${data.nextShift.startTime}–${data.nextShift.endTime}`
      : `Heute kein ${slot} im Plan`;

  const planLinkLabel = data.nextShift ? "Wochenplan" : "Planung";
  const vacationLinkLabel =
    data.vacation.pendingRequests > 0
      ? `${data.vacation.pendingRequests} Urlaub offen`
      : `${data.vacation.remaining} Tage frei`;

  return (
    <DashboardSectionCard
      id="terminal-widget"
      bare
      padding="comfortable"
      className="scroll-mt-20 max-md:!border-0 max-md:!bg-transparent max-md:!p-2 max-md:!shadow-none"
      ariaLabel="Stempeln"
    >
      <div className="flex min-h-[min(72dvh,calc(100dvh-12rem))] flex-col justify-center text-center max-md:min-h-[min(68dvh,calc(100dvh-11rem))]">
        <p className="text-sm text-muted-foreground">
          {greeting}, {firstName}
        </p>
        <p className="mt-1 text-base font-medium text-foreground">{statusLine}</p>

        <div className="my-5 sm:my-7">
          <BigClockButton
            isClockedIn={data.isClockedIn}
            clockInAtIso={data.clockInAtIso}
            isOnBreak={data.isOnBreak}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <Link href="/dashboard/planning" className="font-medium text-brand underline-offset-2 hover:underline">
            {planLinkLabel}
          </Link>
          <span className="text-muted-foreground/40" aria-hidden>
            ·
          </span>
          <Link href="/dashboard/vacation" className="font-medium text-brand underline-offset-2 hover:underline">
            {vacationLinkLabel}
          </Link>
        </div>
      </div>
    </DashboardSectionCard>
  );
}
