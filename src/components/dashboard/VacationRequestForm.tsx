"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestVacation } from "@/lib/actions/vacation";
import { submitSickLeaveForm } from "@/lib/actions/vacation-sick-form";
import { SICK_ATTACHMENT_MAX_BYTES } from "@/lib/sick-attachment";
import { CalendarDays, Loader2, Paperclip, ShieldCheck } from "lucide-react";

export function VacationRequestForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"vacation" | "sick">("vacation");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const startDate = new Date(data.get("startDate") as string);
    const endDate = new Date(data.get("endDate") as string);

    if (endDate < startDate) {
      setError("Enddatum muss nach dem Startdatum liegen.");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "sick") {
          const result = await submitSickLeaveForm(data);
          setSuccessMessage(
            result.shiftsRemoved > 0
              ? `Krankmeldung gespeichert — ${result.shiftsRemoved} geplante Schicht${result.shiftsRemoved === 1 ? "" : "en"} im Planer entfernt.`
              : "Krankmeldung erfolgreich gespeichert!",
          );
        } else {
          await requestVacation({ startDate, endDate });
          setSuccessMessage("Antrag erfolgreich eingereicht!");
        }
        form.reset();
        router.refresh();
      } catch (err: unknown) {
        setError(userErrorMessage(err, "Fehler beim Einreichen"));
      }
    });
  };

  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90 sm:p-8">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <h2 className="font-semibold">Abwesenheit melden</h2>
      </div>
      <div className="mb-4 inline-flex w-full max-w-full rounded-lg border border-border bg-background p-1 text-sm sm:text-xs sm:w-auto">
        <button
          type="button"
          onClick={() => setMode("vacation")}
          className={`min-h-11 flex-1 rounded-md px-3 py-2 text-sm sm:flex-none sm:py-1.5 ${mode === "vacation" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Urlaub
        </button>
        <button
          type="button"
          onClick={() => setMode("sick")}
          className={`min-h-11 flex-1 rounded-md px-3 py-2 text-sm sm:flex-none sm:py-1.5 ${mode === "sick" ? "bg-red-500/20 text-red-700" : "text-muted-foreground hover:text-foreground"}`}
        >
          Krank melden
        </button>
      </div>

      <form onSubmit={handleSubmit} className="min-w-0 space-y-4" encType={mode === "sick" ? "multipart/form-data" : undefined}>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Von</label>
          <input
            type="date"
            name="startDate"
            required
            className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Bis</label>
          <input
            type="date"
            name="endDate"
            required
            className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        {mode === "vacation" ? (
          <div className="hidden items-start gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 px-3 py-2.5 text-[12px] leading-snug text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200 sm:flex">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">Kein Grund erforderlich.</strong>{" "}
              Dein Arbeitgeber darf den Urlaubsgrund aus Datenschutzgründen nicht abfragen.
            </span>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="vacation-sick-note" className="text-xs text-muted-foreground mb-1.5 block">
                Notiz (optional)
              </label>
              <textarea
                id="vacation-sick-note"
                name="sickNote"
                rows={2}
                placeholder='z. B. "AU folgt per Post"'
                className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </div>
            <div>
              <label htmlFor="sick-attachment" className="text-xs text-muted-foreground mb-1.5 block">
                AU-Foto oder PDF (optional)
              </label>
              <input
                id="sick-attachment"
                name="attachment"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-brand"
              />
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Max. {Math.round(SICK_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB · nur Leitung
              </p>
              <details className="mt-2 text-[11px] leading-snug text-muted-foreground">
                <summary className="cursor-pointer font-semibold text-foreground">Datenschutz beim AU-Upload</summary>
                <p className="mt-1.5">
                  Speicherung zum Nachweis gegenüber deinem Arbeitgeber (Art. 9 Abs. 2 lit. b DSGVO i. V. m. § 26 BDSG).
                  3 Jahre Aufbewahrung, danach automatische Löschung. Keine Diagnose nötig.
                </p>
              </details>
            </div>
            <p className="text-[11px] text-red-700 dark:text-red-300 sm:hidden">
              Sofort abwesend — Schichten an diesen Tagen werden aus dem Planer entfernt.
            </p>
            <p className="hidden text-[11px] text-red-700 dark:text-red-300 sm:block">
              Krankmeldung trägt dich sofort als abwesend ein — geplante Schichten an diesen Tagen werden aus dem Planer
              entfernt.
            </p>
          </>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
        {successMessage && <p className="text-xs text-primary">{successMessage}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 disabled:opacity-60 sm:py-3"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "vacation" ? "Antrag einreichen" : "Krankmeldung speichern"}
        </button>
      </form>
    </div>
  );
}
