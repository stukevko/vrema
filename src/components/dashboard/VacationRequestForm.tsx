"use client";

import { useState, useTransition } from "react";
import { requestSickLeave, requestVacation } from "@/lib/actions/vacation";
import { CalendarDays, Loader2 } from "lucide-react";

export function VacationRequestForm() {
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
    const reason = data.get("reason") as string;

    if (endDate < startDate) {
      setError("Enddatum muss nach dem Startdatum liegen.");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "sick") {
          await requestSickLeave({ startDate, endDate, note: reason || undefined });
        } else {
          await requestVacation({ startDate, endDate, reason: reason || undefined });
        }
        setSuccess(true);
        form.reset();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Fehler beim Einreichen");
      }
    });
  };

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/5 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-[#22c55e]" />
        </div>
        <h2 className="font-semibold">{mode === "vacation" ? "Urlaub beantragen" : "Krankmeldung"}</h2>
      </div>
      <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-[#0f0f0f] p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("vacation")}
          className={`rounded-md px-3 py-1.5 ${mode === "vacation" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
        >
          Urlaub
        </button>
        <button
          type="button"
          onClick={() => setMode("sick")}
          className={`rounded-md px-3 py-1.5 ${mode === "sick" ? "bg-red-500/20 text-red-100" : "text-white/50 hover:text-white/80"}`}
        >
          Krank melden
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Von</label>
          <input
            type="date"
            name="startDate"
            required
            className="w-full px-3 py-2.5 rounded-xl bg-[#0b0b0b] border border-white/10 text-white text-sm focus:outline-none focus:border-[#22c55e]/50 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Bis</label>
          <input
            type="date"
            name="endDate"
            required
            className="w-full px-3 py-2.5 rounded-xl bg-[#0b0b0b] border border-white/10 text-white text-sm focus:outline-none focus:border-[#22c55e]/50 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">
            {mode === "vacation" ? "Grund (optional)" : "Notiz (optional)"}
          </label>
          <textarea
            name="reason"
            rows={3}
            placeholder={mode === "vacation" ? "z.B. Familienurlaub" : "z.B. krank mit Attest"}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0b0b0b] border border-white/10 text-white text-sm focus:outline-none focus:border-[#22c55e]/50 transition-colors resize-none"
          />
        </div>
        {mode === "sick" && (
          <p className="text-[11px] text-red-300">
            Krankmeldung wird direkt als Abwesenheit eingetragen und in der Planung rot blockiert.
          </p>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && (
          <p className="text-xs text-[#22c55e]">
            {mode === "vacation" ? "Antrag erfolgreich eingereicht!" : "Krankmeldung erfolgreich gespeichert!"}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 rounded-xl bg-[#22c55e] text-black font-bold text-sm hover:bg-[#16a34a] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "vacation" ? "Antrag einreichen" : "Krankmeldung speichern"}
        </button>
      </form>
    </div>
  );
}
