"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addVacationWish,
  approveVacationWish,
  deleteVacationWish,
  exportVacationPlanCsv,
  rejectVacationWish,
  setVacationPlanSubmissionsOpen,
  submitMyVacationWishes,
  type VacationWishRow,
} from "@/lib/actions/vacation-plan";
import { userErrorMessage } from "@/lib/errors/user-message";
import { CalendarRange, Download, Loader2, Send, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

const WISH_STATUS_LABEL: Record<string, string> = {
  WISH: "Entwurf",
  SUBMITTED: "Abgegeben",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
};

type Props = {
  year: number;
  submissionsOpen: boolean;
  isManager: boolean;
  myWishes: VacationWishRow[];
  teamWishes: VacationWishRow[];
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("de-DE");
}

export function VacationPlanSection({ year, submissionsOpen, isManager, myWishes, teamWishes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  const openWishes = useMemo(() => myWishes.filter((w) => w.status === "WISH"), [myWishes]);
  const submittedCount = useMemo(
    () => teamWishes.filter((w) => w.status === "SUBMITTED").length,
    [teamWishes],
  );

  const run = (fn: () => Promise<unknown>, ok: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await fn();
        setMessage(ok);
        router.refresh();
      } catch (e) {
        setError(userErrorMessage(e, "Aktion fehlgeschlagen."));
      }
    });
  };

  const handleAddWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError("Bitte Von und Bis angeben.");
      return;
    }
    run(
      () => addVacationWish({ startDate: new Date(startDate), endDate: new Date(endDate), note: note || undefined }),
      "Wunsch gespeichert.",
    );
    setStartDate("");
    setEndDate("");
    setNote("");
  };

  const handleDownload = () => {
    startTransition(async () => {
      try {
        const csv = await exportVacationPlanCsv(year);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vrema-urlaubsplan-${year}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(userErrorMessage(e, "Export fehlgeschlagen."));
      }
    });
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] dark:border-white/10 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nur Urlaub</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight">Urlaubswünsche {year}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jahreswünsche eintragen und abgeben — Krankmeldungen laufen separat darunter.
          </p>
        </div>
        {isManager ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button type="button" variant="outline" size="md" className="w-full sm:w-auto" onClick={handleDownload} disabled={isPending}>
              <Download className="h-4 w-4" aria-hidden />
              CSV laden
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={() =>
                run(
                  () => setVacationPlanSubmissionsOpen(year, !submissionsOpen),
                  submissionsOpen ? "Abgabe geschlossen." : "Abgabe wieder offen.",
                )
              }
            >
              {submissionsOpen ? "Abgabe schließen" : "Abgabe öffnen"}
            </Button>
          </div>
        ) : null}
      </div>

      {!submissionsOpen && !isManager ? (
        <p className="mt-4 rounded-xl border border-amber-300/40 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          Die Abgabe ist geschlossen. Sprich mit deiner Leitung, wenn du noch etwas ändern musst.
        </p>
      ) : null}

      {isManager && submittedCount > 0 ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          {submittedCount} abgegebene Wünsche warten auf Freigabe
        </p>
      ) : null}

      <form onSubmit={handleAddWish} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Von</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={!submissionsOpen || isPending}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Bis</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={!submissionsOpen || isPending}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Notiz (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. Familienurlaub"
            disabled={!submissionsOpen || isPending}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="submit" className="w-full sm:w-auto" disabled={!submissionsOpen || isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
            Wunsch hinzufügen
          </Button>
          {openWishes.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={() => run(() => submitMyVacationWishes(year), "Wünsche abgegeben — dein Chef sieht sie jetzt.")}
            >
              <Send className="h-4 w-4" />
              {openWishes.length} Wunsch{openWishes.length === 1 ? "" : "wünsche"} abgeben
            </Button>
          ) : null}
        </div>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-semibold">Meine Wünsche</h3>
        {myWishes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Noch keine Einträge — oben Zeitraum hinzufügen.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myWishes.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-muted/50 px-3 py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {formatDate(w.startDate)} – {formatDate(w.endDate)}
                  </span>
                  <span className="ml-2 text-muted-foreground">({w.days} Tage)</span>
                  <StatusBadge tone={w.status === "APPROVED" ? "brand" : w.status === "REJECTED" ? "danger" : "neutral"} size="sm" className="ml-2">
                    {WISH_STATUS_LABEL[w.status] ?? w.status}
                  </StatusBadge>
                </div>
                {(w.status === "WISH" || w.status === "SUBMITTED") && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => deleteVacationWish(w.id), "Wunsch entfernt.")}
                    className="inline-flex items-center gap-1 text-xs text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Löschen
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isManager && teamWishes.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold">Team-Wünsche</h3>
          <ul className="mt-3 space-y-2">
            {teamWishes.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{w.userName}</p>
                  <p className="text-muted-foreground">
                    {formatDate(w.startDate)} – {formatDate(w.endDate)} · {w.days} Tage ·{" "}
                    {WISH_STATUS_LABEL[w.status]}
                  </p>
                </div>
                {w.status === "SUBMITTED" ? (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      type="button"
                      size="md"
                      className="w-full sm:w-auto"
                      disabled={isPending}
                      onClick={() =>
                        run(() => approveVacationWish(w.id), `${w.userName}: Urlaub genehmigt und im Planer aktiv.`)
                      }
                    >
                      <Check className="h-4 w-4" />
                      Freigeben
                    </Button>
                    <Button
                      type="button"
                      size="md"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={isPending}
                      onClick={() => run(() => rejectVacationWish(w.id), "Wunsch abgelehnt.")}
                    >
                      <X className="h-4 w-4" />
                      Ablehnen
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-brand">{message}</p> : null}
    </section>
  );
}
