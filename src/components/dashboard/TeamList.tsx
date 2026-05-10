"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  toggleEmployeeActive,
  updateEmployeeHourlyWage,
  updateEmployeeNumber,
  updateEmployeePlanningWorkArea,
} from "@/lib/actions/team";
import Link from "next/link";
import { Crown, ShieldCheck, User, PowerOff, Power, Save } from "lucide-react";
import clsx from "clsx";
import { ToastContainer, useToast } from "@/components/ui/Toast";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  weeklyHours: number;
  vacationDays: number;
  employeeNumber: string | null;
  hourlyWage: number | null;
  planningWorkArea: string | null;
  createdAt: Date;
};

const ROLE_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  SUPER_ADMIN: { label: "Super Admin", Icon: ShieldCheck, color: "text-amber-400" },
  COMPANY_OWNER: { label: "Inhaber", Icon: Crown, color: "text-[#22c55e]" },
  MANAGER: { label: "Manager", Icon: ShieldCheck, color: "text-blue-400" },
  EMPLOYEE: { label: "Mitarbeiter", Icon: User, color: "text-muted-foreground" },
};

export function TeamList({
  members,
  canManage,
  currentUserId,
}: {
  members: Member[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [employeeNumberDrafts, setEmployeeNumberDrafts] = useState<Record<string, string>>({});
  const [hourlyWageDrafts, setHourlyWageDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const { toasts, show, remove } = useToast();

  useEffect(() => {
    const next: Record<string, string> = {};
    const wageNext: Record<string, string> = {};
    for (const member of members) {
      next[member.id] = member.employeeNumber ?? "";
      wageNext[member.id] = member.hourlyWage != null ? String(member.hourlyWage) : "";
    }
    setEmployeeNumberDrafts(next);
    setHourlyWageDrafts(wageNext);
  }, [members]);

  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90 sm:p-10">
        <User className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-foreground">Noch keine Mitarbeiter</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {canManage
            ? "Laden Sie Kolleginnen und Kollegen per E-Mail ein — das Formular finden Sie rechts auf dieser Seite."
            : "Ihre Firma hat noch keine Mitarbeitenden angelegt. Bitte wenden Sie sich an eine Administratorin."}
        </p>
        {canManage && (
          <Link
            href="#invite"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90"
          >
            Zum Einladungsformular
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90">
      {/* Desktop */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-12 gap-3 border-b border-border px-5 py-3 text-xs font-sans uppercase tracking-widest text-muted-foreground">
          <span className="col-span-3">Mitarbeiter</span>
          <span className="col-span-2">Rolle</span>
          <span className="col-span-1" title="Außenbereich für Wetter-Hinweise im Planer">
            Außen
          </span>
          <span className="col-span-1 text-right">Std/W</span>
          <span className="col-span-2">€/Std</span>
          <span className="col-span-2">Personalnr.</span>
          <span className="col-span-1" />
        </div>

        <div className="divide-y divide-white/[0.04]">
          {members.map((member, i) => {
            const meta = ROLE_META[member.role] ?? ROLE_META.EMPLOYEE;
            const isSelf = member.id === currentUserId;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={clsx(
                  "grid grid-cols-12 items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]",
                  !member.isActive && "opacity-40"
                )}
              >
                <div className="col-span-3 flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-brand-soft text-sm font-bold text-brand shadow-sm dark:border-white/10 dark:bg-brand/22 dark:text-brand-foreground">
                    {(member.name ?? member.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.name ?? "–"}
                      {isSelf && <span className="ml-2 font-sans text-[10px] text-muted-foreground">(du)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center gap-1.5">
                  <meta.Icon className={clsx("h-3.5 w-3.5 shrink-0", meta.color)} />
                  <span className={clsx("font-sans text-xs", meta.color)}>{meta.label}</span>
                </div>

                <div className="col-span-1">
                  {canManage ? (
                    <select
                      value={member.planningWorkArea ?? ""}
                      onChange={(e) =>
                        startTransition(async () => {
                          try {
                            await updateEmployeePlanningWorkArea(member.id, e.target.value);
                            show("Planungsbereich gespeichert.", "success");
                          } catch (err) {
                            show(err instanceof Error ? err.message : "Fehler.", "error");
                          }
                        })
                      }
                      className="h-9 w-full max-w-[5.5rem] rounded-lg border border-border bg-white px-1 text-[10px] text-foreground"
                      aria-label="Planung Außenbereich"
                    >
                      <option value="">Innen</option>
                      <option value="OUTDOOR">Außen</option>
                      <option value="TERRACE">Terrasse</option>
                    </select>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      {!member.planningWorkArea ? "Innen" : member.planningWorkArea === "TERRACE" ? "Terr." : "Außen"}
                    </span>
                  )}
                </div>

                <div className="col-span-1 text-right">
                  <span className="font-sans text-sm text-foreground">{member.weeklyHours}h</span>
                </div>

                <div className="col-span-2">
                  {canManage ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={hourlyWageDrafts[member.id] ?? ""}
                        onChange={(e) =>
                          setHourlyWageDrafts((prev) => ({ ...prev, [member.id]: e.target.value }))
                        }
                        placeholder="z. B. 16,50"
                        inputMode="decimal"
                        className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-foreground"
                      />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await updateEmployeeHourlyWage(member.id, hourlyWageDrafts[member.id] ?? "");
                              setFeedback("Stundenlohn gespeichert.");
                              show("Stundenlohn gespeichert.", "success");
                            } catch (err) {
                              const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
                              setFeedback(message);
                              show(message, "error");
                            }
                          })
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-card/80"
                        title="Stundenlohn speichern"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {!canManage && !isSelf
                        ? "—"
                        : member.hourlyWage != null
                          ? `${member.hourlyWage.toFixed(2)} €`
                          : "—"}
                    </span>
                  )}
                </div>

                <div className="col-span-2">
                  {canManage ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={employeeNumberDrafts[member.id] ?? ""}
                        onChange={(e) =>
                          setEmployeeNumberDrafts((prev) => ({ ...prev, [member.id]: e.target.value }))
                        }
                        placeholder="z. B. 10042"
                        className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-foreground"
                      />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await updateEmployeeNumber(member.id, employeeNumberDrafts[member.id] ?? "");
                              setFeedback("Personalnummer gespeichert.");
                              show("Personalnummer erfolgreich gespeichert.", "success");
                            } catch (err) {
                              const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
                              setFeedback(message);
                              show(message, "error");
                            }
                          })
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-card/80"
                        title="Personalnummer speichern"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{member.employeeNumber ?? "—"}</span>
                      {!member.employeeNumber && (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                          FEHLT
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="col-span-1 flex justify-end">
                  {canManage && !isSelf && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await toggleEmployeeActive(member.id); })}
                      title={member.isActive ? "Deaktivieren" : "Aktivieren"}
                      className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                        member.isActive
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      {member.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Karten */}
      <div className="space-y-3 p-3 sm:hidden">
        {members.map((member, i) => {
          const meta = ROLE_META[member.role] ?? ROLE_META.EMPLOYEE;
          const isSelf = member.id === currentUserId;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={clsx(
                "rounded-2xl border border-border bg-card/95 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.06)]",
                !member.isActive && "opacity-40"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-base font-bold text-foreground">
                  {(member.name ?? member.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">
                    {member.name ?? "–"}
                    {isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">(du)</span>}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{member.email}</p>
                </div>
                {canManage && !isSelf && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await toggleEmployeeActive(member.id); })}
                    className={clsx(
                      "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors active:scale-95",
                      member.isActive
                        ? "border-red-200 bg-red-500/10 text-red-600"
                        : "border-primary/30 bg-primary/10 text-primary"
                    )}
                    aria-label={member.isActive ? "Deaktivieren" : "Aktivieren"}
                  >
                    {member.isActive ? <PowerOff className="h-5 w-5" /> : <Power className="h-5 w-5" />}
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-sm">
                <meta.Icon className={clsx("h-4 w-4 shrink-0", meta.color)} />
                <span className={clsx("font-medium", meta.color)}>{meta.label}</span>
                <span className="ml-auto tabular-nums text-foreground">{member.weeklyHours} Std./Woche</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">€/Std brutto</span>
                {canManage ? (
                  <>
                    <input
                      value={hourlyWageDrafts[member.id] ?? ""}
                      onChange={(e) =>
                        setHourlyWageDrafts((prev) => ({ ...prev, [member.id]: e.target.value }))
                      }
                      placeholder="z. B. 16,50"
                      inputMode="decimal"
                      className="h-10 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-foreground"
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await updateEmployeeHourlyWage(member.id, hourlyWageDrafts[member.id] ?? "");
                            setFeedback("Stundenlohn gespeichert.");
                            show("Stundenlohn gespeichert.", "success");
                          } catch (err) {
                            const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
                            setFeedback(message);
                            show(message, "error");
                          }
                        })
                      }
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground"
                      title="Stundenlohn speichern"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-foreground">
                    {!canManage && !isSelf
                      ? "—"
                      : member.hourlyWage != null
                        ? `${member.hourlyWage.toFixed(2)} €`
                        : "—"}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Planung</span>
                {canManage ? (
                  <select
                    value={member.planningWorkArea ?? ""}
                    onChange={(e) =>
                      startTransition(async () => {
                        try {
                          await updateEmployeePlanningWorkArea(member.id, e.target.value);
                          show("Planungsbereich gespeichert.", "success");
                        } catch (err) {
                          show(err instanceof Error ? err.message : "Fehler.", "error");
                        }
                      })
                    }
                    className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-2 text-sm text-foreground"
                    aria-label="Außenbereich Planung"
                  >
                    <option value="">Innen</option>
                    <option value="OUTDOOR">Außen</option>
                    <option value="TERRACE">Terrasse</option>
                  </select>
                ) : (
                  <span className="text-sm text-foreground">
                    {!member.planningWorkArea ? "Innen" : member.planningWorkArea === "TERRACE" ? "Terrasse" : "Außen"}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Personalnummer</span>
                {canManage ? (
                  <>
                    <input
                      value={employeeNumberDrafts[member.id] ?? ""}
                      onChange={(e) =>
                        setEmployeeNumberDrafts((prev) => ({ ...prev, [member.id]: e.target.value }))
                      }
                      placeholder="z. B. 10042"
                      className="h-10 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-foreground"
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await updateEmployeeNumber(member.id, employeeNumberDrafts[member.id] ?? "");
                            setFeedback("Personalnummer gespeichert.");
                            show("Personalnummer erfolgreich gespeichert.", "success");
                          } catch (err) {
                            const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
                            setFeedback(message);
                            show(message, "error");
                          }
                        })
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground"
                      title="Personalnummer speichern"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-foreground">{member.employeeNumber ?? "—"}</span>
                    {!member.employeeNumber && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                        FEHLT
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      {feedback && <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{feedback}</p>}
      <ToastContainer toasts={toasts} remove={remove} />
    </div>
  );
}
