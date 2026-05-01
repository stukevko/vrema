"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { applyStandardWeek, clearShiftForDay, copyWeekToAllMembers, setShiftForDay } from "@/lib/actions/team";

type Member = {
  id: string;
  name: string | null;
  email: string;
};

type ShiftRow = {
  id: string;
  userId: string;
  weekIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MATRIX_DAYS = [1, 2, 3, 4, 5, 6, 0];
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 24;
const TIMELINE_TOTAL_MINUTES = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;
const TIMELINE_SNAP_MINUTES = 15;

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatHours(totalMinutes: number) {
  const hours = totalMinutes / 60;
  return `${hours.toFixed(1)}h`;
}

function formatHourRange(start: string, end: string) {
  return `${start.slice(0, 5)}-${end.slice(0, 5)}`;
}

function minutesToHHMM(total: number) {
  const normalized = Math.max(0, Math.min(24 * 60, total));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snapMinutes(total: number) {
  return Math.round(total / TIMELINE_SNAP_MINUTES) * TIMELINE_SNAP_MINUTES;
}

export function ShiftManager({
  members,
  shifts,
  shiftCycleWeeks = 1,
  vacationConflictDays,
}: {
  members: Member[];
  shifts: ShiftRow[];
  shiftCycleWeeks?: 1 | 2 | 3;
  vacationConflictDays?: Array<{ userId: string; dayOfWeek: number; type?: "VACATION" | "SICK" }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState(members[0]?.id ?? "");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [message, setMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"simple" | "matrix" | "timeline">("timeline");
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<1 | 2 | 3>(1);
  const [timelineDay, setTimelineDay] = useState(1);
  const [neededStaff, setNeededStaff] = useState(2);
  const [coverageSlotMinutes] = useState<60>(60);
  const [dragDraft, setDragDraft] = useState<{
    userId: string;
    startMinute: number;
    endMinute: number;
  } | null>(null);
  const [shiftEdit, setShiftEdit] = useState<{
    userId: string;
    label: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const dragDraftRef = useRef<{ userId: string; startMinute: number; endMinute: number } | null>(null);
  const dragSnapshotRef = useRef<{ start: number; end: number } | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    userId: string;
    mode: "create" | "move";
    anchorMinute: number;
    originStartMinute: number;
    originEndMinute: number;
    laneLeft: number;
    laneWidth: number;
  } | null>(null);
  const [recentDayAction, setRecentDayAction] = useState<{ dayOfWeek: number; action: "saved" | "deleted" } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showOnlyGaps, setShowOnlyGaps] = useState(false);
  const [showPlannerInfo, setShowPlannerInfo] = useState(false);

  const userShifts = useMemo(
    () =>
      shifts
        .filter((s) => s.userId === selectedUserId && s.weekIndex === selectedWeekIndex)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    [shifts, selectedUserId, selectedWeekIndex]
  );
  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedUserId) ?? null,
    [members, selectedUserId]
  );
  const usedDays = useMemo(() => new Set(userShifts.map((s) => s.dayOfWeek)), [userShifts]);
  const userPrimaryShiftByDay = useMemo(() => {
    const map = new Map<number, ShiftRow>();
    for (const shift of userShifts) {
      if (!map.has(shift.dayOfWeek)) map.set(shift.dayOfWeek, shift);
    }
    return map;
  }, [userShifts]);
  const hasInvalidRange = useMemo(() => {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start === null || end === null) return true;
    return end <= start;
  }, [startTime, endTime]);
  const plannedDaysCount = useMemo(() => userPrimaryShiftByDay.size, [userPrimaryShiftByDay]);
  const missingWeekdays = useMemo(
    () => [1, 2, 3, 4, 5].filter((d) => !userPrimaryShiftByDay.has(d)).map((d) => DAY_LABELS[d]),
    [userPrimaryShiftByDay]
  );
  const weeklyMinutes = useMemo(
    () =>
      userShifts.reduce((sum, shift) => {
        const start = toMinutes(shift.startTime);
        const end = toMinutes(shift.endTime);
        if (start === null || end === null || end <= start) return sum;
        return sum + (end - start);
      }, 0),
    [userShifts]
  );
  const shiftByUserAndDay = useMemo(() => {
    const map = new Map<string, ShiftRow>();
    for (const s of shifts) {
      if (s.weekIndex !== selectedWeekIndex) continue;
      const key = `${s.userId}-${selectedWeekIndex}-${s.dayOfWeek}`;
      if (!map.has(key)) map.set(key, s);
    }
    return map;
  }, [shifts, selectedWeekIndex]);
  const conflictTypeByCell = useMemo(() => {
    const map = new Map<string, "VACATION" | "SICK">();
    for (const entry of vacationConflictDays ?? []) {
      map.set(`${entry.userId}-${entry.dayOfWeek}`, entry.type ?? "VACATION");
    }
    return map;
  }, [vacationConflictDays]);
  const selectedUserVacationDays = useMemo(
    () => new Set(DAY_LABELS.map((_, d) => d).filter((d) => conflictTypeByCell.has(`${selectedUserId}-${d}`))),
    [selectedUserId, conflictTypeByCell]
  );
  const selectedUserSickDays = useMemo(
    () =>
      new Set(
        DAY_LABELS.map((_, d) => d).filter((d) => conflictTypeByCell.get(`${selectedUserId}-${d}`) === "SICK")
      ),
    [selectedUserId, conflictTypeByCell]
  );
  const matrixDayTotals = useMemo(
    () =>
      MATRIX_DAYS.map((dayOfWeek) => {
        const total = members.reduce((sum, m) => {
          if (conflictTypeByCell.has(`${m.id}-${dayOfWeek}`)) return sum;
          const shift = shiftByUserAndDay.get(`${m.id}-${selectedWeekIndex}-${dayOfWeek}`);
          if (!shift) return sum;
          const start = toMinutes(shift.startTime);
          const end = toMinutes(shift.endTime);
          if (start === null || end === null || end <= start) return sum;
          return sum + (end - start);
        }, 0);
        return total;
      }),
    [members, shiftByUserAndDay, conflictTypeByCell]
  );
  const visibleMatrixMembers = useMemo(() => {
    if (!showOnlyGaps) return members;
    return members.filter((m) =>
      [1, 2, 3, 4, 5].some((day) => {
        const blocked = conflictTypeByCell.has(`${m.id}-${day}`);
        if (blocked) return false;
        return !shiftByUserAndDay.has(`${m.id}-${selectedWeekIndex}-${day}`);
      })
    );
  }, [members, showOnlyGaps, conflictTypeByCell, shiftByUserAndDay, selectedWeekIndex]);
  const timelineRows = useMemo(() => {
    return members.map((m) => {
      const shift = shiftByUserAndDay.get(`${m.id}-${selectedWeekIndex}-${timelineDay}`);
      const conflict = conflictTypeByCell.get(`${m.id}-${timelineDay}`);
      return { member: m, shift, conflict };
    });
  }, [members, shiftByUserAndDay, conflictTypeByCell, timelineDay, selectedWeekIndex]);
  const timelineCoverage = useMemo(() => {
    const slots: Array<{ label: string; assigned: number; needed: number; isGap: boolean }> = [];
    for (
      let slotStart = TIMELINE_START_HOUR * 60;
      slotStart < TIMELINE_END_HOUR * 60;
      slotStart += coverageSlotMinutes
    ) {
      const slotEnd = Math.min(slotStart + coverageSlotMinutes, TIMELINE_END_HOUR * 60);
      let assigned = 0;
      for (const row of timelineRows) {
        if (!row.shift || row.conflict) continue;
        const start = toMinutes(row.shift.startTime);
        const end = toMinutes(row.shift.endTime);
        if (start === null || end === null) continue;
        if (start < slotEnd && end > slotStart) assigned += 1;
      }
      slots.push({
        label: minutesToHHMM(slotStart),
        assigned,
        needed: neededStaff,
        isGap: assigned < neededStaff,
      });
    }
    return slots;
  }, [timelineRows, neededStaff, coverageSlotMinutes]);
  const firstCriticalSlot = useMemo(
    () => timelineCoverage.find((slot) => slot.isGap)?.label ?? null,
    [timelineCoverage]
  );
  const hourMarkers = useMemo(
    () => Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR }, (_, i) => TIMELINE_START_HOUR + i + 1),
    []
  );

  const saveTimelineShift = (userId: string, startMinute: number, endMinute: number) => {
    const conflict = conflictTypeByCell.get(`${userId}-${timelineDay}`);
    if (conflict) {
      setMessage(`Schicht blockiert: ${conflict === "SICK" ? "Krank" : "Urlaub"}.`);
      return;
    }
    const clampedStart = Math.max(TIMELINE_START_HOUR * 60, Math.min(endMinute - TIMELINE_SNAP_MINUTES, startMinute));
    const clampedEnd = Math.min(TIMELINE_END_HOUR * 60, Math.max(startMinute + TIMELINE_SNAP_MINUTES, endMinute));
    const snappedStart = snapMinutes(clampedStart);
    const snappedEnd = Math.max(snappedStart + TIMELINE_SNAP_MINUTES, snapMinutes(clampedEnd));
    const startTimeValue = minutesToHHMM(snappedStart);
    const endTimeValue = minutesToHHMM(snappedEnd);
    setMessage(null);
    startTransition(async () => {
      try {
        await setShiftForDay({
          userId,
          weekIndex: selectedWeekIndex,
          dayOfWeek: timelineDay,
          startTime: startTimeValue,
          endTime: endTimeValue,
        });
        setMessage(`Schicht gesetzt: ${DAY_LABELS[timelineDay]} (${startTimeValue}-${endTimeValue}).`);
      } catch (e: unknown) {
        setMessage(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  };

  const beginTimelineDrag = (
    clientX: number,
    laneEl: HTMLElement,
    userId: string,
    mode: "create" | "move",
    originStartMinute?: number,
    originEndMinute?: number
  ) => {
    if (isPending) return;
    const rect = laneEl.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = clientX - rect.left;
    const relative = Math.max(0, Math.min(1, offsetX / rect.width));
    const minuteAtPointer = snapMinutes(TIMELINE_START_HOUR * 60 + relative * TIMELINE_TOTAL_MINUTES);
    const defaultStart = originStartMinute ?? minuteAtPointer;
    const defaultEnd = originEndMinute ?? Math.min(TIMELINE_END_HOUR * 60, defaultStart + 8 * 60);
    const initialDraft =
      mode === "create"
        ? { userId, startMinute: minuteAtPointer, endMinute: minuteAtPointer + TIMELINE_SNAP_MINUTES }
        : { userId, startMinute: defaultStart, endMinute: defaultEnd };
    dragSnapshotRef.current = mode === "move" ? { start: defaultStart, end: defaultEnd } : null;

    setActiveDrag({
      userId,
      mode,
      anchorMinute: minuteAtPointer,
      originStartMinute: defaultStart,
      originEndMinute: defaultEnd,
      laneLeft: rect.left,
      laneWidth: rect.width,
    });
    dragDraftRef.current = initialDraft;
    setDragDraft(initialDraft);
  };

  useEffect(() => {
    dragDraftRef.current = dragDraft;
  }, [dragDraft]);

  useEffect(() => {
    if (!activeDrag) return;
    let rafId: number | null = null;
    let lastClientX = activeDrag.laneLeft;
    const flushMove = () => {
      const relative = Math.max(0, Math.min(1, (lastClientX - activeDrag.laneLeft) / activeDrag.laneWidth));
      const pointerMinute = snapMinutes(TIMELINE_START_HOUR * 60 + relative * TIMELINE_TOTAL_MINUTES);
      let next: { userId: string; startMinute: number; endMinute: number };
      if (activeDrag.mode === "create") {
        const start = Math.min(activeDrag.anchorMinute, pointerMinute);
        const end = Math.max(activeDrag.anchorMinute + TIMELINE_SNAP_MINUTES, pointerMinute);
        next = { userId: activeDrag.userId, startMinute: start, endMinute: Math.min(TIMELINE_END_HOUR * 60, end) };
      } else {
        const duration = activeDrag.originEndMinute - activeDrag.originStartMinute;
        const delta = pointerMinute - activeDrag.anchorMinute;
        const rawStart = activeDrag.originStartMinute + delta;
        const clampedStart = Math.max(TIMELINE_START_HOUR * 60, Math.min(TIMELINE_END_HOUR * 60 - duration, rawStart));
        next = {
          userId: activeDrag.userId,
          startMinute: clampedStart,
          endMinute: clampedStart + duration,
        };
      }
      dragDraftRef.current = next;
      setDragDraft(next);
      rafId = null;
    };
    const onMove = (event: MouseEvent) => {
      lastClientX = event.clientX;
      if (rafId === null) rafId = window.requestAnimationFrame(flushMove);
    };
    const onUp = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      const draft = dragDraftRef.current;
      const snap = dragSnapshotRef.current;
      if (draft && draft.userId === activeDrag.userId) {
        const unchangedMove =
          activeDrag.mode === "move" &&
          snap &&
          draft.startMinute === snap.start &&
          draft.endMinute === snap.end;
        if (unchangedMove) {
          const member = members.find((m) => m.id === activeDrag.userId);
          setShiftEdit({
            userId: activeDrag.userId,
            label: member?.name ?? member?.email ?? "Mitarbeiter",
            startTime: minutesToHHMM(draft.startMinute),
            endTime: minutesToHHMM(draft.endMinute),
          });
        } else {
          saveTimelineShift(activeDrag.userId, draft.startMinute, draft.endMinute);
        }
      }
      dragSnapshotRef.current = null;
      setActiveDrag(null);
      setDragDraft(null);
      dragDraftRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [activeDrag, members]);

  const applyDayFromInputs = (dayOfWeek: number) => {
    if (!selectedUserId) return;
    if (hasInvalidRange) {
      setMessage("Endzeit muss nach der Startzeit liegen.");
      return;
    }
    if (selectedUserVacationDays.has(dayOfWeek)) {
      const proceed = window.confirm(
        `${DAY_LABELS[dayOfWeek]} liegt in einem genehmigten Urlaubszeitraum. Trotzdem Schicht speichern?`
      );
      if (!proceed) return;
    }
    const existing = userPrimaryShiftByDay.get(dayOfWeek);
    setMessage(null);
    startTransition(async () => {
      try {
        if (existing && existing.startTime === startTime && existing.endTime === endTime) {
          await clearShiftForDay({ userId: selectedUserId, weekIndex: selectedWeekIndex, dayOfWeek });
          setMessage(`Schicht für ${DAY_LABELS[dayOfWeek]} gelöscht.`);
          setRecentDayAction({ dayOfWeek, action: "deleted" });
          return;
        }
        await setShiftForDay({ userId: selectedUserId, weekIndex: selectedWeekIndex, dayOfWeek, startTime, endTime });
        setMessage(`Schicht für ${DAY_LABELS[dayOfWeek]} gesetzt (${startTime}-${endTime}).`);
        setRecentDayAction({ dayOfWeek, action: "saved" });
      } catch (e: unknown) {
        setMessage(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  };

  const submitStandardWeek = () => {
    if (!selectedUserId) return;
    if (hasInvalidRange) {
      setMessage("Endzeit muss nach der Startzeit liegen.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        await applyStandardWeek({ userId: selectedUserId, weekIndex: selectedWeekIndex, startTime, endTime });
        setMessage("Standardwoche (Mo-Fr) gespeichert.");
      } catch (e: unknown) {
        setMessage(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  };

  const submitCopyToAll = () => {
    if (!selectedUserId) return;
    if (!window.confirm("Woche des ausgewählten Mitarbeiters auf alle anderen aktiven Mitarbeiter übertragen?")) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await copyWeekToAllMembers(selectedUserId);
        setMessage(`Woche auf ${result.copiedTo} Mitarbeiter übertragen.`);
      } catch (e: unknown) {
        setMessage(e instanceof Error ? e.message : "Übertragen fehlgeschlagen.");
      }
    });
  };

  const applyMatrixCell = (userId: string, dayOfWeek: number) => {
    if (hasInvalidRange) {
      setMessage("Endzeit muss nach der Startzeit liegen.");
      return;
    }
    if (conflictTypeByCell.has(`${userId}-${dayOfWeek}`)) {
      const label = conflictTypeByCell.get(`${userId}-${dayOfWeek}`) === "SICK" ? "Krank" : "Urlaub";
      setMessage(`${DAY_LABELS[dayOfWeek]} ist als ${label} blockiert.`);
      return;
    }
    const existing = shiftByUserAndDay.get(`${userId}-${selectedWeekIndex}-${dayOfWeek}`);
    setMessage(null);
    startTransition(async () => {
      try {
        if (existing && existing.startTime === startTime && existing.endTime === endTime) {
          await clearShiftForDay({ userId, weekIndex: selectedWeekIndex, dayOfWeek });
          setMessage(`Schicht gelöscht: ${DAY_LABELS[dayOfWeek]}.`);
          return;
        }
        await setShiftForDay({ userId, weekIndex: selectedWeekIndex, dayOfWeek, startTime, endTime });
        setMessage(`Schicht gesetzt: ${DAY_LABELS[dayOfWeek]} (${startTime}-${endTime}).`);
      } catch (e: unknown) {
        setMessage(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-card p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <h2 className="text-lg font-semibold">Arbeitsplan (Soll-Zeiten)</h2>
      <p className="mt-1 text-xs text-muted">Starter+: Leitung plant Mitarbeiter, System macht Soll/Ist beim Stempeln.</p>
      {shiftCycleWeeks > 1 && (
        <div className="mt-3 inline-flex rounded-lg border border-border bg-background p-1 text-xs">
          {Array.from({ length: shiftCycleWeeks }).map((_, idx) => {
            const week = (idx + 1) as 1 | 2 | 3;
            return (
              <button
                key={week}
                type="button"
                onClick={() => setSelectedWeekIndex(week)}
                className={`rounded-md px-3 py-1.5 ${
                  selectedWeekIndex === week ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white/80"
                }`}
              >
                Woche {week}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-3 inline-flex rounded-lg border border-border bg-background p-1 text-xs">
        <button
          type="button"
          onClick={() => setViewMode("timeline")}
          className={`rounded-md px-3 py-1.5 ${viewMode === "timeline" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white/80"}`}
        >
          Team-Timeline
        </button>
        <button
          type="button"
          onClick={() => setViewMode("simple")}
          className={`rounded-md px-3 py-1.5 ${viewMode === "simple" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white/80"}`}
        >
          Einfach-Planer
        </button>
        <button
          type="button"
          onClick={() => setViewMode("matrix")}
          className={`rounded-md px-3 py-1.5 ${viewMode === "matrix" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white/80"}`}
        >
          Wochenmatrix
        </button>
      </div>
      {selectedMember && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] text-white/80">
          <span>Ausgewählt:</span>
          <span className="font-semibold text-white">{selectedMember.name ?? selectedMember.email}</span>
        </div>
      )}
      {viewMode === "simple" && (
        <>
      <div className="mt-4 grid gap-2 md:grid-cols-5">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          disabled={isPending}
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ?? m.email}
            </option>
          ))}
        </select>

        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          disabled={isPending}
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          disabled={isPending}
        />
        <button
          type="button"
          onClick={submitStandardWeek}
          disabled={isPending || !selectedUserId}
          className="rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] transition-all disabled:opacity-60"
        >
          Standardwoche (Mo-Fr)
        </button>
        <button
          type="button"
          onClick={submitCopyToAll}
          disabled={isPending || !selectedUserId}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-white hover:bg-card/80 disabled:opacity-60"
        >
          Auf alle übertragen
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-[11px] text-muted">Tipp: Zeit oben einstellen und Tage direkt antippen. Erneuter Klick mit gleicher Zeit löscht den Tag.</p>
        {selectedUserVacationDays.size > 0 && (
          <p className="text-[11px] text-amber-300">
            Abwesenheit: {Array.from(selectedUserVacationDays).map((d) => DAY_LABELS[d]).join(", ")}
            {selectedUserSickDays.size > 0 ? " (rot = krank)." : "."}
          </p>
        )}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-background px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted">Schritt 1</p>
          <p className="text-sm text-white">Zeit oben wählen (oder Früh/Standard/Spät klicken).</p>
        </div>
        <div className="rounded-xl border border-border bg-background px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted">Schritt 2</p>
          <p className="text-sm text-white">Tage antippen. Jeder Klick speichert sofort.</p>
        </div>
      </div>
      {hasInvalidRange && (
        <p className="mt-2 text-xs text-amber-300">Bitte gültige Zeit wählen: Ende muss später als Start sein.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setStartTime("08:00");
            setEndTime("16:00");
          }}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-white/80 hover:bg-card/80"
          disabled={isPending}
        >
          Früh: 08:00-16:00
        </button>
        <button
          type="button"
          onClick={() => {
            setStartTime("09:00");
            setEndTime("17:00");
          }}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-white/80 hover:bg-card/80"
          disabled={isPending}
        >
          Standard: 09:00-17:00
        </button>
        <button
          type="button"
          onClick={() => {
            setStartTime("14:00");
            setEndTime("22:00");
          }}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-white/80 hover:bg-card/80"
          disabled={isPending}
        >
          Spät: 14:00-22:00
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {DAY_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => applyDayFromInputs(idx)}
            disabled={isPending || !selectedUserId}
            className={`rounded-lg border px-2 py-2 text-xs transition-colors disabled:opacity-60 ${
              selectedUserVacationDays.has(idx)
                ? selectedUserSickDays.has(idx)
                  ? "border-red-400/35 bg-red-500/12 text-red-100 hover:bg-red-500/20"
                  : "border-amber-400/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                : usedDays.has(idx)
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border bg-background text-white/80 hover:bg-card/80"
            } ${recentDayAction?.dayOfWeek === idx ? "ring-2 ring-primary/60" : ""}`}
          >
            <span className="block text-xs">{label}</span>
            <span className="mt-0.5 block text-[10px] font-sans opacity-80">
              {userPrimaryShiftByDay.get(idx)
                ? `${userPrimaryShiftByDay.get(idx)?.startTime}-${userPrimaryShiftByDay.get(idx)?.endTime}`
                : "frei"}
            </span>
            {recentDayAction?.dayOfWeek === idx && (
              <span className={`mt-1 block text-[10px] ${recentDayAction.action === "saved" ? "text-primary" : "text-red-200"}`}>
                {recentDayAction.action === "saved" ? "Gespeichert" : "Gelöscht"}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Grün = Schicht, Orange = Urlaub, Rot = Krank. Klick setzt die oben gewählte Zeit direkt für den Tag.
      </p>

      {message && <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs text-white/80">{message}</p>}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-white/80 hover:bg-card/80"
        >
          {showDetails ? "Details ausblenden" : "Details anzeigen"}
        </button>
      </div>
      {showDetails && (
      <div className="mt-3 rounded-xl border border-border bg-background">
        <div className="grid grid-cols-3 border-b border-border px-3 py-2 text-[11px] uppercase tracking-widest text-muted">
          <span>Tag</span>
          <span>Start</span>
          <span>Ende</span>
        </div>
        {userShifts.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted">Noch keine Schichten für den ausgewählten Mitarbeiter.</p>
        ) : (
          userShifts.map((s, idx) => (
            <div key={s.id} className={`grid grid-cols-3 items-center px-3 py-2 text-sm ${idx % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
              <span>{DAY_LABELS[s.dayOfWeek] ?? s.dayOfWeek}</span>
              <span className="font-sans text-white/80">{s.startTime}</span>
              <span className="font-sans text-white/80">{s.endTime}</span>
            </div>
          ))
        )}
      </div>
      )}
      </>
      )}

      {viewMode === "matrix" && (
        <div className="mt-4 rounded-xl border border-border bg-background overflow-x-auto">
          <div className="px-3 py-3 border-b border-border">
            <div className="grid gap-2 md:grid-cols-5">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                disabled={isPending}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => {
                  setStartTime("08:00");
                  setEndTime("16:00");
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white hover:bg-card/80"
              >
                Früh 08-16
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartTime("09:00");
                  setEndTime("17:00");
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white hover:bg-card/80"
              >
                Standard 09-17
              </button>
              <button
                type="button"
                onClick={() => setShowOnlyGaps((v) => !v)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  showOnlyGaps
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-background text-white hover:bg-card/80"
                }`}
              >
                {showOnlyGaps ? "Nur Lücken: AN" : "Nur Lücken zeigen"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Quick-Entry: Zeit wählen, dann Zellen anklicken. Klick mit gleicher Zeit löscht. Urlaubszellen sind blockiert.
            </p>
          </div>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-3 py-2 text-left">Mitarbeiter</th>
                {MATRIX_DAYS.map((dayOfWeek) => (
                  <th key={dayOfWeek} className="px-2 py-2 text-center text-xs font-sans uppercase tracking-wider">
                    {DAY_LABELS[dayOfWeek]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleMatrixMembers.map((m) => (
                <tr key={m.id} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-3 py-2 text-white">{m.name ?? m.email}</td>
                  {MATRIX_DAYS.map((dayOfWeek) => {
                    const shift = shiftByUserAndDay.get(`${m.id}-${selectedWeekIndex}-${dayOfWeek}`);
                    const conflictType = conflictTypeByCell.get(`${m.id}-${dayOfWeek}`);
                    const isBlocked = Boolean(conflictType);
                    return (
                      <td key={`${m.id}-${dayOfWeek}`} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => applyMatrixCell(m.id, dayOfWeek)}
                          disabled={isPending || isBlocked}
                          className={`w-full rounded-md border px-2 py-1.5 text-[11px] font-sans transition-colors ${
                            conflictType === "SICK"
                              ? "border-red-400/35 bg-red-500/15 text-red-100 cursor-not-allowed"
                              : conflictType === "VACATION"
                              ? "border-amber-400/35 bg-amber-500/15 text-amber-100 cursor-not-allowed"
                              : shift
                              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                              : "border-border bg-background text-white/45 hover:bg-card/80"
                          }`}
                          title={
                            conflictType === "SICK"
                              ? "Krank blockiert"
                              : conflictType === "VACATION"
                              ? "Urlaub blockiert"
                              : "Klicken für Schnellzuweisung / Löschen"
                          }
                        >
                          {conflictType === "SICK"
                            ? "Krank"
                            : conflictType === "VACATION"
                            ? "Urlaub"
                            : shift
                            ? formatHourRange(shift.startTime, shift.endTime)
                            : "Frei"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-border bg-card/60">
                <td className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Stunden-Summe</td>
                {matrixDayTotals.map((minutes, idx) => (
                  <td key={`sum-${MATRIX_DAYS[idx]}`} className="px-2 py-2 text-center text-xs font-semibold text-primary">
                    {formatHours(minutes)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="px-3 py-2 text-[11px] text-muted">
            Grau = frei, Grün = Schicht, Orange = Urlaub, Rot = Krank (gesperrt).
          </p>
        </div>
      )}

      {viewMode === "timeline" && (
        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted">Fokusmodus: Planung zuerst, Kennzahlen optional.</p>
            <button
              type="button"
              onClick={() => setShowPlannerInfo((v) => !v)}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] text-white/80 hover:bg-card/80"
            >
              {showPlannerInfo ? "Info ausblenden" : "Info einblenden"}
            </button>
          </div>
          {showPlannerInfo && (
            <div className="mb-3 rounded-xl border border-border bg-card px-3 py-2">
              <p className="text-[11px] text-white/80">
                Wochenstatus: <span className="text-white/85">{plannedDaysCount}/7</span> · Sollstunden:{" "}
                <span className="text-primary">{formatHours(weeklyMinutes)}</span> · Lücken Mo-Fr:{" "}
                <span className="text-amber-300">{missingWeekdays.length === 0 ? "Keine" : missingWeekdays.join(", ")}</span>
              </p>
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-3">
            <select
              value={timelineDay}
              onChange={(e) => setTimelineDay(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              {MATRIX_DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={20}
              value={neededStaff}
              onChange={(e) => setNeededStaff(Math.max(1, Number(e.target.value) || 1))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              title="Benötigte Mitarbeiter pro Zeitfenster"
            />
            <p className="flex items-center text-[11px] text-muted leading-snug">
              15-Minuten-Raster · Stunden-Hilfslinien · Balken ziehen oder anklicken zum Bearbeiten
            </p>
          </div>
          <div className="mt-2 flex justify-end">
            {firstCriticalSlot ? (
              <span className="inline-flex items-center rounded-full border border-red-400/35 bg-red-500/15 px-2.5 py-1 text-[11px] text-red-200">
                Erste Lücke ab {firstCriticalSlot}
              </span>
            ) : null}
          </div>

          <div className="mt-3 max-h-[70vh] overflow-auto">
            <div className="min-w-[880px] space-y-4">
              <div className="sticky top-0 z-30 grid grid-cols-[220px_1fr] items-center gap-2 border-b border-border bg-background py-1 text-[11px] text-muted">
                <div>Mitarbeiter</div>
                <div className="grid grid-cols-9">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const hour = TIMELINE_START_HOUR + idx * 2;
                    return (
                      <span key={hour} className="text-center font-sans">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    );
                  })}
                </div>
              </div>

              {timelineRows.map((row) => {
                const shiftStart = row.shift ? toMinutes(row.shift.startTime) : null;
                const shiftEnd = row.shift ? toMinutes(row.shift.endTime) : null;
                const draftForRow = dragDraft?.userId === row.member.id ? dragDraft : null;
                const visualStart = draftForRow?.startMinute ?? shiftStart;
                const visualEnd = draftForRow?.endMinute ?? shiftEnd;
                const leftPct =
                  visualStart === null
                    ? 0
                    : ((Math.max(visualStart, TIMELINE_START_HOUR * 60) - TIMELINE_START_HOUR * 60) / TIMELINE_TOTAL_MINUTES) * 100;
                const widthPct =
                  visualStart === null || visualEnd === null
                    ? 0
                    : (Math.max(0, Math.min(visualEnd, TIMELINE_END_HOUR * 60) - Math.max(visualStart, TIMELINE_START_HOUR * 60)) / TIMELINE_TOTAL_MINUTES) * 100;
                const initials = (row.member.name ?? row.member.email).slice(0, 2).toUpperCase();
                return (
                  <div key={row.member.id} className="grid grid-cols-[220px_1fr] items-center gap-3">
                    <div className="flex items-center rounded-2xl border border-white/5 bg-card px-4 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                      <span className="inline-flex items-center gap-2 truncate text-sm text-white">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
                          {initials}
                        </span>
                        <span className="truncate text-[15px] font-medium">{row.member.name ?? row.member.email}</span>
                      </span>
                    </div>
                    <div
                      data-timeline-lane
                      className="relative h-16 rounded-2xl border border-white/5 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                      onMouseDown={(e) => {
                        if (row.conflict) return;
                        beginTimelineDrag(e.clientX, e.currentTarget as HTMLElement, row.member.id, "create");
                      }}
                      onDragOver={(e) => {
                        if (!row.conflict) e.preventDefault();
                      }}
                    >
                      <div className="absolute inset-0">
                        {timelineCoverage.map((slot, idx) =>
                          slot.isGap ? (
                            <div
                              key={`gap-${idx}`}
                              className="absolute top-0 bottom-0 bg-red-500/[0.05]"
                              style={{
                                left: `${(idx * coverageSlotMinutes / TIMELINE_TOTAL_MINUTES) * 100}%`,
                                width: `${(coverageSlotMinutes / TIMELINE_TOTAL_MINUTES) * 100}%`,
                              }}
                            />
                          ) : null
                        )}
                        {hourMarkers.map((hour) => {
                          const left = (((hour * 60 - TIMELINE_START_HOUR * 60) / TIMELINE_TOTAL_MINUTES) * 100).toFixed(4);
                          return (
                            <div
                              key={`hour-line-${hour}`}
                              className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/[0.08]"
                              style={{ left: `${left}%` }}
                            />
                          );
                        })}
                      </div>
                      {row.conflict ? (
                        <div
                          className={`absolute inset-1 rounded-lg flex items-center justify-center text-xs font-semibold ${
                            row.conflict === "SICK" ? "bg-red-500/20 text-red-200" : "bg-amber-500/20 text-amber-200"
                          }`}
                        >
                          {row.conflict === "SICK" ? "Krank (gesperrt)" : "Urlaub (gesperrt)"}
                        </div>
                      ) : widthPct > 0 ? (
                        <div
                          className={`group absolute top-1.5 bottom-1.5 z-10 rounded-lg bg-primary/40 border border-primary/60 px-2 text-[11px] text-emerald-100 flex items-center cursor-grab active:cursor-grabbing ${
                            activeDrag?.userId === row.member.id
                              ? "transition-none shadow-lg shadow-black/40"
                              : "transition-[left,width] duration-100 ease-out"
                          }`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`${minutesToHHMM(visualStart ?? TIMELINE_START_HOUR * 60)}-${minutesToHHMM(visualEnd ?? TIMELINE_START_HOUR * 60)}`}
                          onMouseDown={(e) => {
                            if (!row.shift || row.conflict) return;
                            const lane = (e.currentTarget as HTMLElement).closest("[data-timeline-lane]");
                            if (!(lane instanceof HTMLElement)) return;
                            const sm = toMinutes(row.shift.startTime);
                            const em = toMinutes(row.shift.endTime);
                            if (sm === null || em === null) return;
                            e.stopPropagation();
                            beginTimelineDrag(e.clientX, lane, row.member.id, "move", sm, em);
                          }}
                        >
                          {!activeDrag && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startTransition(async () => {
                                  await clearShiftForDay({
                                    userId: row.member.id,
                                    weekIndex: selectedWeekIndex,
                                    dayOfWeek: timelineDay,
                                  });
                                });
                              }}
                              className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full border border-red-300/40 bg-red-500/90 text-[10px] text-white group-hover:inline-flex"
                              title="Schicht löschen"
                            >
                              ×
                            </button>
                          )}
                          {formatHourRange(
                            minutesToHHMM(visualStart ?? TIMELINE_START_HOUR * 60),
                            minutesToHHMM(visualEnd ?? TIMELINE_START_HOUR * 60)
                          )}
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">Frei</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {shiftEdit && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShiftEdit(null);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/5 bg-card p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h3 className="text-sm font-semibold text-white">Schicht bearbeiten</h3>
            <p className="mt-1 text-xs text-muted-foreground">{DAY_LABELS[timelineDay]} · {shiftEdit.label}</p>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted">Start</label>
                <input
                  type="time"
                  step={900}
                  value={shiftEdit.startTime.slice(0, 5)}
                  onChange={(e) => setShiftEdit({ ...shiftEdit, startTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted">Ende</label>
                <input
                  type="time"
                  step={900}
                  value={shiftEdit.endTime.slice(0, 5)}
                  onChange={(e) => setShiftEdit({ ...shiftEdit, endTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  let s = toMinutes(shiftEdit.startTime);
                  let e = toMinutes(shiftEdit.endTime);
                  if (s === null || e === null || e <= s) {
                    setMessage("Ungültige Zeitspanne.");
                    return;
                  }
                  s = snapMinutes(s);
                  e = Math.max(s + TIMELINE_SNAP_MINUTES, snapMinutes(e));
                  setMessage(null);
                  startTransition(async () => {
                    try {
                      await setShiftForDay({
                        userId: shiftEdit.userId,
                        weekIndex: selectedWeekIndex,
                        dayOfWeek: timelineDay,
                        startTime: minutesToHHMM(s),
                        endTime: minutesToHHMM(e),
                      });
                      setShiftEdit(null);
                      setMessage("Schicht gespeichert.");
                    } catch (err: unknown) {
                      setMessage(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
                    }
                  });
                }}
                className="rounded-lg border border-primary/35 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/25 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] transition-all disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setMessage(null);
                  startTransition(async () => {
                    try {
                      await clearShiftForDay({
                        userId: shiftEdit.userId,
                        weekIndex: selectedWeekIndex,
                        dayOfWeek: timelineDay,
                      });
                      setShiftEdit(null);
                      setMessage("Schicht gelöscht.");
                    } catch (err: unknown) {
                      setMessage(err instanceof Error ? err.message : "Löschen fehlgeschlagen.");
                    }
                  });
                }}
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:opacity-50"
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => setShiftEdit(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-white hover:bg-card/80"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
