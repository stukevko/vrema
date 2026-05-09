import { requireTenant } from "@/lib/tenant-guard";
import { getTodayShiftTaskWall } from "@/lib/shift-tasks/wall";
import { redirect } from "next/navigation";
import { ListTodo } from "lucide-react";

export default async function ShiftTasksLiveWallPage() {
  const { companyId, role } = await requireTenant();
  if (role === "EMPLOYEE") redirect("/dashboard");

  const rows = await getTodayShiftTaskWall(companyId);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-1 sm:space-y-6 sm:px-0">
      <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
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
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Noch keine aktiven Checklisten</p>
          <p className="mt-2">
            Sobald Mitarbeitende heute einstempeln (und eine Standard-Vorlage existiert), erscheinen sie hier. Im Planer (Timeline) kannst du
            per Rechtsklick auf eine Schicht auch manuell eine Checkliste für den gewählten Tag anlegen.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const pct = row.totalCount > 0 ? Math.round((row.doneCount / row.totalCount) * 100) : 0;
            const headline = row.templateName ?? "Schicht-Checkliste";
            const who = row.userName?.trim() || row.userEmail;
            return (
              <li
                key={row.listId}
                className="rounded-2xl border border-border bg-white px-4 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)] sm:px-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {headline}
                      <span className="font-normal text-muted-foreground"> · {who}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Schicht {row.shiftLabel}
                      {row.isLive ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                          Live
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {row.doneCount}/{row.totalCount} Aufgaben
                  </p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
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
