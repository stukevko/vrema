import { requireTenant } from "@/lib/tenant-guard";
import { getTodayShiftTaskWall } from "@/lib/shift-tasks/wall";
import { redirect } from "next/navigation";
import { ListTodo } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default async function ShiftTasksLiveWallPage() {
  const { companyId, role } = await requireTenant();
  if (role === "EMPLOYEE") redirect("/dashboard");

  const rows = await getTodayShiftTaskWall(companyId);

  return (
    <DashboardPageShell maxWidth="3xl">
      <DashboardPageHeader
        variant="card"
        icon={ListTodo}
        eyebrow="Betrieb"
        title="Schicht-Tasks · Live"
        description="Eingestempelte Schichten heute mit Checklisten-Fortschritt — beim Einchecken oder im Planer erzeugt."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Noch keine aktiven Checklisten"
          description="Sobald heute jemand einstempelt, erscheint der Fortschritt hier — oder du legst im Planer manuell eine Checkliste an."
          action={
            <Link href="/dashboard/planning" className="btn-brand inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold">
              Zum Planer
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const pct = row.totalCount > 0 ? Math.round((row.doneCount / row.totalCount) * 100) : 0;
            const headline = row.templateName ?? "Schicht-Checkliste";
            const who = row.userName?.trim() || row.userEmail;
            return (
              <li key={row.listId} className="glass-card px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {headline}
                      <span className="font-normal text-muted-foreground"> · {who}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      Schicht {row.shiftLabel}
                      {row.isLive ? (
                        <StatusBadge tone="brand" glass size="sm" withDot={false}>
                          Live
                        </StatusBadge>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {row.doneCount}/{row.totalCount} Aufgaben
                  </p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-white/30 bg-surface-muted dark:border-white/10 dark:bg-surface-muted/55">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-hover shadow-[0_0_18px_-4px_hsl(var(--brand)_/_0.6)] transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPageShell>
  );
}
