"use client";

import { useState, useTransition } from "react";
import { publishOpenShiftVacancy } from "@/lib/actions/team";
import { userErrorMessage } from "@/lib/errors/user-message";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function OpenShiftVacancyForm({
  defaultWeekIndex,
  defaultDayOfWeek,
}: {
  defaultWeekIndex: number;
  defaultDayOfWeek: number;
}) {
  const [weekIndex, setWeekIndex] = useState(defaultWeekIndex);
  const [dayOfWeek, setDayOfWeek] = useState(defaultDayOfWeek);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      try {
        await publishOpenShiftVacancy({ weekIndex, dayOfWeek, startTime, endTime });
        toast.success("Lücke ausgeschrieben — Team wird benachrichtigt.");
      } catch (e: unknown) {
        toast.error(userErrorMessage(e, "Konnte Lücke nicht ausschreiben."));
      }
    });
  };

  return (
    <div className="mt-4 rounded-xl border border-dashed border-brand/30 bg-brand/5 p-4">
      <p className="text-sm font-semibold text-foreground">Lücke ausschreiben</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Unbesetzter Slot — Kolleg:innen können im Planer „Übernahme anfragen“.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-[10px] text-muted-foreground">
          Woche
          <select
            value={weekIndex}
            onChange={(e) => setWeekIndex(Number(e.target.value))}
            className="input-field-subtle mt-1 block h-9 w-full rounded-lg text-xs"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
        <label className="text-[10px] text-muted-foreground">
          Tag
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="input-field-subtle mt-1 block h-9 w-full rounded-lg text-xs"
          >
            {DAY_LABELS.map((l, i) => (
              <option key={l} value={i}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] text-muted-foreground">
          Von
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input-field-subtle mt-1 block h-9 w-full rounded-lg text-xs"
          />
        </label>
        <label className="text-[10px] text-muted-foreground">
          Bis
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input-field-subtle mt-1 block h-9 w-full rounded-lg text-xs"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="btn-primary-solid mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" />
        {pending ? "Schreibe aus…" : "Lücke veröffentlichen"}
      </button>
    </div>
  );
}
