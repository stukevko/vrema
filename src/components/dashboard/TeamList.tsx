"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  toggleEmployeeActive,
  updateEmployeeHourlyWage,
  updateEmployeeNumber,
  updateEmployeePlanningWorkArea,
} from "@/lib/actions/team";
import Link from "next/link";
import {
  Crown,
  ShieldCheck,
  User,
  PowerOff,
  Power,
  Save,
  Search,
  X,
  UserPlus,
} from "lucide-react";
import clsx from "clsx";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";

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
  SUPER_ADMIN: { label: "Super Admin", Icon: ShieldCheck, color: "text-warning" },
  COMPANY_OWNER: { label: "Inhaber", Icon: Crown, color: "text-brand" },
  MANAGER: { label: "Manager", Icon: ShieldCheck, color: "text-fg-muted" },
  EMPLOYEE: { label: "Mitarbeiter", Icon: User, color: "text-muted-foreground" },
};

type FilterKey = "all" | "manager" | "employee" | "inactive";

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "manager", label: "Führung" },
  { key: "employee", label: "Mitarbeitende" },
  { key: "inactive", label: "Inaktiv" },
];

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

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (filter === "manager" && !["MANAGER", "COMPANY_OWNER", "SUPER_ADMIN"].includes(m.role)) return false;
      if (filter === "employee" && m.role !== "EMPLOYEE") return false;
      if (filter === "inactive" && m.isActive) return false;
      if (!q) return true;
      const hay = `${m.name ?? ""} ${m.email} ${m.employeeNumber ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [members, query, filter]);

  const isFiltering = query.trim().length > 0 || filter !== "all";

  if (members.length === 0) {
    return (
      <EmptyState
        tone="celebrate"
        icon={UserPlus}
        title="Noch keine Mitarbeiter im Team"
        description={
          canManage
            ? "Laden Sie Kolleginnen und Kollegen per E-Mail ein — das Formular finden Sie rechts auf dieser Seite."
            : "Ihre Firma hat noch keine Mitarbeitenden angelegt. Bitte wenden Sie sich an eine Administratorin."
        }
        action={
          canManage ? (
            <Link
              href="#invite"
              className="btn-brand inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-bold active:scale-[0.99]"
            >
              Zum Einladungsformular
            </Link>
          ) : null
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] backdrop-blur-xl supports-[backdrop-filter]:bg-surface/85 dark:border-white/10 dark:bg-surface/85 dark:supports-[backdrop-filter]:bg-surface/70">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-line/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5 lg:px-6 xl:px-7">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, E-Mail oder Personalnr. suchen…"
            className="input-field-subtle h-10 w-full min-w-0 rounded-xl pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/70"
            aria-label="Team durchsuchen"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              aria-label="Suche leeren"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>

        <div className="-mx-1 flex snap-x gap-1 overflow-x-auto px-1 scrollbar-hide sm:mx-0 sm:px-0">
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={clsx(
                  "shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium tracking-tight transition-colors",
                  isActive
                    ? "border-brand/30 bg-brand-soft text-brand"
                    : "border-line bg-surface text-fg-muted hover:bg-surface-muted/70 dark:border-white/10 dark:bg-surface/70"
                )}
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter-Empty-State */}
      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Search className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">Keine Treffer</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isFiltering ? "Probieren Sie einen anderen Suchbegriff oder Filter." : "Es ist niemand sichtbar."}
          </p>
          {isFiltering && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-xl border border-line bg-surface px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-muted dark:border-white/10 dark:bg-surface/70"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block">
            <div className="grid items-center gap-x-4 border-b border-line/[0.08] px-5 py-3 text-[10px] font-sans uppercase tracking-widest text-muted-foreground lg:gap-x-6 lg:px-6 xl:gap-x-8 xl:px-7 [grid-template-columns:2.2fr_1.3fr_0.7fr_0.5fr_1.4fr_1.3fr_auto]">
              <span className="min-w-0">Mitarbeiter</span>
              <span className="min-w-0">Rolle</span>
              <span className="min-w-0" title="Außenbereich für Wetter-Hinweise im Planer">
                Außen
              </span>
              <span className="min-w-0 text-right tabular-nums">Std/W</span>
              <span className="min-w-0 pl-1">€/Std</span>
              <span className="min-w-0 pl-1">Personalnr.</span>
              <span className="min-w-0 text-right">Aktion</span>
            </div>

            <div>
              {filtered.map((member, i) => {
                const meta = ROLE_META[member.role] ?? ROLE_META.EMPLOYEE;
                const isSelf = member.id === currentUserId;

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={clsx(
                      "grid items-center gap-x-4 border-b border-line/[0.06] px-5 py-3.5 transition-colors last:border-b-0 hover:bg-surface-muted/40 lg:gap-x-6 lg:px-6 xl:gap-x-8 xl:px-7 [grid-template-columns:2.2fr_1.3fr_0.7fr_0.5fr_1.4fr_1.3fr_auto]",
                      !member.isActive && "opacity-55"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-brand-soft text-sm font-bold text-brand shadow-sm dark:border-white/10 dark:bg-brand/22 dark:text-brand-foreground">
                          {(member.name ?? member.email)[0].toUpperCase()}
                        </div>
                        <span
                          className={clsx(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface",
                            member.isActive ? "bg-success" : "bg-fg-subtle"
                          )}
                          aria-label={member.isActive ? "Aktiv" : "Inaktiv"}
                          title={member.isActive ? "Aktiv" : "Inaktiv"}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-medium leading-snug">
                          <span className="truncate">{member.name ?? "–"}</span>
                          {isSelf && (
                            <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand">
                              du
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={member.email}>
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5">
                      <meta.Icon className={clsx("h-3.5 w-3.5 shrink-0", meta.color)} />
                      <span
                        className={clsx(
                          "min-w-0 truncate font-sans text-xs leading-tight",
                          meta.color
                        )}
                        title={meta.label}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-center">
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
                          className="input-field-subtle h-9 w-full min-w-0 rounded-lg px-2 text-[11px] text-foreground"
                          aria-label="Planung Außenbereich"
                        >
                          <option value="">Innen</option>
                          <option value="OUTDOOR">Außen</option>
                          <option value="TERRACE">Terrasse</option>
                        </select>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {!member.planningWorkArea
                            ? "Innen"
                            : member.planningWorkArea === "TERRACE"
                              ? "Terr."
                              : "Außen"}
                        </span>
                      )}
                    </div>

                    <div className="flex min-h-9 items-center justify-end tabular-nums">
                      <span className="font-sans text-sm font-medium text-foreground">
                        {member.weeklyHours}h
                      </span>
                    </div>

                    <div className="flex min-w-0 items-center">
                      {canManage ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <input
                            value={hourlyWageDrafts[member.id] ?? ""}
                            onChange={(e) =>
                              setHourlyWageDrafts((prev) => ({ ...prev, [member.id]: e.target.value }))
                            }
                            placeholder="16,50"
                            inputMode="decimal"
                            aria-label={`Stundenlohn ${member.name ?? member.email}`}
                            className="input-field-subtle h-9 min-w-0 flex-1 rounded-lg px-3 text-xs tabular-nums text-foreground placeholder:text-muted-foreground/55"
                          />
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  await updateEmployeeHourlyWage(
                                    member.id,
                                    hourlyWageDrafts[member.id] ?? ""
                                  );
                                  setFeedback("Stundenlohn gespeichert.");
                                  show("Stundenlohn gespeichert.", "success");
                                } catch (err) {
                                  const message =
                                    err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
                                  setFeedback(message);
                                  show(message, "error");
                                }
                              })
                            }
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent bg-surface-muted/60 text-fg-muted transition-colors hover:bg-brand-soft hover:text-brand"
                            title="Stundenlohn speichern"
                            aria-label="Stundenlohn speichern"
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

                    <div className="flex min-w-0 items-center">
                      {canManage ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <input
                            value={employeeNumberDrafts[member.id] ?? ""}
                            onChange={(e) =>
                              setEmployeeNumberDrafts((prev) => ({
                                ...prev,
                                [member.id]: e.target.value,
                              }))
                            }
                            placeholder="10042"
                            aria-label={`Personalnummer ${member.name ?? member.email}`}
                            className="input-field-subtle h-9 min-w-0 flex-1 rounded-lg px-3 text-xs tabular-nums text-foreground placeholder:text-muted-foreground/55"
                          />
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  await updateEmployeeNumber(
                                    member.id,
                                    employeeNumberDrafts[member.id] ?? ""
                                  );
                                  setFeedback("Personalnummer gespeichert.");
                                  show("Personalnummer erfolgreich gespeichert.", "success");
                                } catch (err) {
                                  const message =
                                    err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
                                  setFeedback(message);
                                  show(message, "error");
                                }
                              })
                            }
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent bg-surface-muted/60 text-fg-muted transition-colors hover:bg-brand-soft hover:text-brand"
                            title="Personalnummer speichern"
                            aria-label="Personalnummer speichern"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {member.employeeNumber ?? "—"}
                          </span>
                          {!member.employeeNumber && (
                            <span className="rounded-full border border-warning/35 bg-warning-soft px-1.5 py-0.5 text-[9px] font-semibold text-warning-foreground">
                              FEHLT
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex min-h-9 items-center justify-end">
                      {canManage && !isSelf && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await toggleEmployeeActive(member.id);
                            })
                          }
                          title={member.isActive ? "Deaktivieren" : "Aktivieren"}
                          aria-label={member.isActive ? "Deaktivieren" : "Aktivieren"}
                          className={clsx(
                            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                            member.isActive
                              ? "bg-danger-soft text-danger hover:bg-danger/15"
                              : "bg-brand-soft text-brand hover:bg-brand/15"
                          )}
                        >
                          {member.isActive ? (
                            <PowerOff className="h-3.5 w-3.5" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Mobile */}
          <div className="space-y-3 p-3 sm:hidden">
            {filtered.map((member, i) => {
              const meta = ROLE_META[member.role] ?? ROLE_META.EMPLOYEE;
              const isSelf = member.id === currentUserId;

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={clsx(
                    "rounded-2xl border border-line bg-card/95 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:border-white/10",
                    !member.isActive && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-brand-soft text-base font-bold text-brand dark:border-white/10 dark:bg-brand/22 dark:text-brand-foreground">
                        {(member.name ?? member.email)[0].toUpperCase()}
                      </div>
                      <span
                        className={clsx(
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
                          member.isActive ? "bg-success" : "bg-fg-subtle"
                        )}
                        aria-label={member.isActive ? "Aktiv" : "Inaktiv"}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                        <span className="truncate">{member.name ?? "–"}</span>
                        {isSelf && (
                          <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
                            du
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    {canManage && !isSelf && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await toggleEmployeeActive(member.id);
                          })
                        }
                        className={clsx(
                          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors active:scale-95",
                          member.isActive
                            ? "border-danger/30 bg-danger-soft text-danger hover:bg-danger/15"
                            : "border-brand/30 bg-brand-soft text-brand hover:bg-brand/15"
                        )}
                        aria-label={member.isActive ? "Deaktivieren" : "Aktivieren"}
                      >
                        {member.isActive ? <PowerOff className="h-5 w-5" /> : <Power className="h-5 w-5" />}
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/[0.08] pt-3 text-sm">
                    <meta.Icon className={clsx("h-4 w-4 shrink-0", meta.color)} />
                    <span className={clsx("font-medium", meta.color)}>{meta.label}</span>
                    <span className="ml-auto tabular-nums font-medium text-foreground">
                      {member.weeklyHours} Std./Woche
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        €/Std brutto
                      </span>
                      {canManage ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={hourlyWageDrafts[member.id] ?? ""}
                            onChange={(e) =>
                              setHourlyWageDrafts((prev) => ({ ...prev, [member.id]: e.target.value }))
                            }
                            placeholder="16,50"
                            inputMode="decimal"
                            aria-label="Stundenlohn"
                            className="input-field-subtle h-10 min-w-0 flex-1 rounded-lg px-3 text-sm tabular-nums text-foreground placeholder:text-muted-foreground/55"
                          />
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  await updateEmployeeHourlyWage(
                                    member.id,
                                    hourlyWageDrafts[member.id] ?? ""
                                  );
                                  setFeedback("Stundenlohn gespeichert.");
                                  show("Stundenlohn gespeichert.", "success");
                                } catch (err) {
                                  const message =
                                    err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
                                  setFeedback(message);
                                  show(message, "error");
                                }
                              })
                            }
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-transparent bg-surface-muted/60 text-fg-muted transition-colors hover:bg-brand-soft hover:text-brand"
                            title="Speichern"
                            aria-label="Stundenlohn speichern"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-foreground">
                          {member.hourlyWage != null ? `${member.hourlyWage.toFixed(2)} €` : "—"}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Personalnr.
                      </span>
                      {canManage ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={employeeNumberDrafts[member.id] ?? ""}
                            onChange={(e) =>
                              setEmployeeNumberDrafts((prev) => ({
                                ...prev,
                                [member.id]: e.target.value,
                              }))
                            }
                            placeholder="10042"
                            aria-label="Personalnummer"
                            className="input-field-subtle h-10 min-w-0 flex-1 rounded-lg px-3 text-sm tabular-nums text-foreground placeholder:text-muted-foreground/55"
                          />
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  await updateEmployeeNumber(
                                    member.id,
                                    employeeNumberDrafts[member.id] ?? ""
                                  );
                                  setFeedback("Personalnummer gespeichert.");
                                  show("Personalnummer erfolgreich gespeichert.", "success");
                                } catch (err) {
                                  const message =
                                    err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
                                  setFeedback(message);
                                  show(message, "error");
                                }
                              })
                            }
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-transparent bg-surface-muted/60 text-fg-muted transition-colors hover:bg-brand-soft hover:text-brand"
                            title="Speichern"
                            aria-label="Personalnummer speichern"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">
                            {member.employeeNumber ?? "—"}
                          </span>
                          {!member.employeeNumber && (
                            <span className="rounded-full border border-warning/35 bg-warning-soft px-1.5 py-0.5 text-[9px] font-semibold text-warning-foreground">
                              FEHLT
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Planung
                    </span>
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
                        className="input-field-subtle h-9 min-w-0 flex-1 rounded-lg px-2 text-sm text-foreground"
                        aria-label="Außenbereich Planung"
                      >
                        <option value="">Innen</option>
                        <option value="OUTDOOR">Außen</option>
                        <option value="TERRACE">Terrasse</option>
                      </select>
                    ) : (
                      <span className="text-sm text-foreground">
                        {!member.planningWorkArea
                          ? "Innen"
                          : member.planningWorkArea === "TERRACE"
                            ? "Terrasse"
                            : "Außen"}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {feedback && (
        <p className="border-t border-line/[0.08] px-4 py-2 text-xs text-muted-foreground">
          {feedback}
        </p>
      )}
      <ToastContainer toasts={toasts} remove={remove} />
    </div>
  );
}
