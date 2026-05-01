import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyShifts, getShiftCycleWeeks, getShifts, getTeamMembers } from "@/lib/actions/team";
import { getVacationConflictDaysForPlanning } from "@/lib/actions/vacation";
import { ShiftManager } from "@/components/dashboard/ShiftManager";

const DAY_LABELS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const canManage = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  if (canManage) {
    const [members, shifts, vacationConflictDays, shiftCycleWeeks] = await Promise.all([
      getTeamMembers(),
      getShifts(),
      getVacationConflictDaysForPlanning(),
      getShiftCycleWeeks(),
    ]);
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-border bg-white px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <h1 className="text-2xl font-bold">Planung</h1>
          <p className="text-muted text-sm mt-1">Schichtplanung für Team und Soll/Ist-Basis.</p>
        </div>
        <ShiftManager
          members={members.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
          shifts={shifts}
          shiftCycleWeeks={shiftCycleWeeks}
          vacationConflictDays={vacationConflictDays}
        />
      </div>
    );
  }

  const myShifts = await getMyShifts();
  const grouped = DAY_LABELS.map((label, dayOfWeek) => ({
    label,
    rows: myShifts.filter((s) => s.dayOfWeek === dayOfWeek),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border bg-white px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
        <h1 className="text-2xl font-bold">Mein Plan</h1>
        <p className="text-muted text-sm mt-1">Hier siehst du deine hinterlegten Soll-Schichten pro Woche.</p>
      </div>
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {grouped.map((g) => (
            <div key={g.label} className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-muted">{g.label}</p>
              {g.rows.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Frei</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {g.rows.map((r) => (
                    <p key={r.id} className="font-sans text-sm text-primary">
                      {r.startTime} - {r.endTime}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
