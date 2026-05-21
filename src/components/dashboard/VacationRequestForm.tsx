"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestSickLeave, requestVacation } from "@/lib/actions/vacation";
import { CalendarDays, Loader2, ShieldCheck } from "lucide-react";

export function VacationRequestForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<"vacation" | "sick">("vacation");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const form = e.currentTarget;
    const data = new FormData(form);
    const startDate = new Date(data.get("startDate") as string);
    const endDate = new Date(data.get("endDate") as string);
    // DSGVO: Bei Urlaubsanträgen wird KEIN Grund erhoben (Datenminimierung,
    // Art. 5 DSGVO). Nur die Krankmeldung erlaubt eine optionale Notiz – ohne
    // medizinische Details (siehe Hinweis im UI).
    const sickNote = mode === "sick" ? (data.get("sickNote") as string | null) : null;

    if (endDate < startDate) {
      setError("Enddatum muss nach dem Startdatum liegen.");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "sick") {
          await requestSickLeave({ startDate, endDate, note: sickNote?.trim() || undefined });
        } else {
          await requestVacation({ startDate, endDate });
        }
        setSuccess(true);
        form.reset();
        router.refresh();
      } catch (err: unknown) {
        setError(userErrorMessage(err, "Fehler beim Einreichen"));
      }
    });
  };

  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <h2 className="font-semibold">{mode === "vacation" ? "Urlaub beantragen" : "Krankmeldung"}</h2>
      </div>
      <div className="mb-4 inline-flex w-full max-w-full rounded-lg border border-border bg-background p-1 text-xs sm:w-auto">
        <button
          type="button"
          onClick={() => setMode("vacation")}
          className={`min-h-11 flex-1 rounded-md px-3 py-2 sm:flex-none sm:py-1.5 ${mode === "vacation" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Urlaub
        </button>
        <button
          type="button"
          onClick={() => setMode("sick")}
          className={`min-h-11 flex-1 rounded-md px-3 py-2 sm:flex-none sm:py-1.5 ${mode === "sick" ? "bg-red-500/20 text-red-700" : "text-muted-foreground hover:text-foreground"}`}
        >
          Krank melden
        </button>
      </div>

      <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
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
          // DSGVO: Kein Grund-Feld bei Urlaub. Arbeitgeber dürfen keinen Grund
          // verlangen (BUrlG, Datenminimierung). Klarer Trust-Hinweis statt
          // Eingabefeld – Mitarbeiter sieht sofort, warum nichts mehr abgefragt wird.
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 px-3 py-2.5 text-[12px] leading-snug text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
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
                Notiz (optional, ohne medizinische Details)
              </label>
              <textarea
                id="vacation-sick-note"
                name="sickNote"
                rows={3}
                placeholder='z. B. "AU-Attest folgt per Post"'
                className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
              />
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                Bitte <strong className="font-semibold">keine Diagnose oder medizinischen Angaben</strong>{" "}
                eintragen – das ist arbeitsrechtlich nicht erforderlich.
              </p>
            </div>
            <p className="text-[11px] text-red-700 dark:text-red-300">
              Krankmeldung wird direkt als Abwesenheit eingetragen und in der Planung rot blockiert.
            </p>
          </>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && (
          <p className="text-xs text-primary">
            {mode === "vacation" ? "Antrag erfolgreich eingereicht!" : "Krankmeldung erfolgreich gespeichert!"}
          </p>
        )}

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
