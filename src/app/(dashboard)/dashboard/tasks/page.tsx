import { requireTenant } from "@/lib/tenant-guard";
import { getTodayShiftTaskWall } from "@/lib/shift-tasks/wall";
import { redirect } from "next/navigation";
import { ListTodo } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function ShiftTasksLiveWallPage() {
  const { companyId, role } = await requireTenant();
  if (role === "EMPLOYEE") redirect("/dashboard");

  const rows = await getTodayShiftTaskWall(companyId);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-1 sm:space-y-6 sm:px-0">
      <div className="glass-card px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-brand-soft/90 text-brand backdrop-blur-md dark:border-white/10 dark:bg-brand/25">
            <ListTodo className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Schicht-Tasks · Live</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Eingestempelte Schichten heute mit Checklisten-Fortschritt (wird beim Einchecken oder manuell im Planer erzeugt).
            </p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="glass-card border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Noch keine aktiven Checklisten</p>
          <p className="mt-2">
            Sobald Mitarbeitende heute einstempeln (und eine Standard-Vorlage existiert), erscheinen sie hier. Im Planer
            (Timeline) kannst du per Rechtsklick auf eine Schicht auch manuell eine Checkliste für den gewählten Tag anlegen.
          </p>
        </div>
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
                <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-white/30 bg-surface-muted/80 backdrop-blur dark:border-white/10 dark:bg-surface-muted/40">
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
    </div>
  );
}
