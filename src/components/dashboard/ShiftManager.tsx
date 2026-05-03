"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Drawer } from "vaul";
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
/** Mobile: volle Wochentagsnamen für bessere Lesbarkeit. */
const MOBILE_DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;
/** Reihenfolge Wochentag-Dropdown in der Timeline (Mo–So). */
const TIMELINE_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
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

function scrollFieldIntoView(e: React.FocusEvent<HTMLElement>) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const field = (target.closest("input,textarea,select") as HTMLElement | null) ?? target;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      field.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  });
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
  /** Mobil: nur Einfach-Planer. Desktop: Einfach-Planer oder Timeline. */
  const [viewMode, setViewMode] = useState<"simple" | "timeline">("simple");
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
    pointerId: number;
  } | null>(null);
  const [recentDayAction, setRecentDayAction] = useState<{ dayOfWeek: number; action: "saved" | "deleted" } | null>(null);
  /** Mobil: „+“ öffnet Bottom-Sheet statt nur Mini-Zellen. */
  const [simpleAddSheetOpen, setSimpleAddSheetOpen] = useState(false);
  const [simpleSheetDay, setSimpleSheetDay] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [showPlannerInfo, setShowPlannerInfo] = useState(false);
  const [mobileMemberPickerOpen, setMobileMemberPickerOpen] = useState(false);
  const [mobileStartPickerOpen, setMobileStartPickerOpen] = useState(false);
  const [mobileEndPickerOpen, setMobileEndPickerOpen] = useState(false);
  const [mobileStartPickerCustom, setMobileStartPickerCustom] = useState(false);
  const [mobileEndPickerCustom, setMobileEndPickerCustom] = useState(false);
  const mobileDayLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileDayLongPressFiredRef = useRef(false);

  useEffect(() => {
    if (viewMode !== "simple") setSimpleAddSheetOpen(false);
  }, [viewMode]);

  /** Unter lg nur Einfach-Planer: Timeline-Modus und ggf. Timeline-Dialog bereinigen. */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      if (mq.matches) {
        setViewMode("simple");
        setShiftEdit(null);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mobileStartPickerOpen) setMobileStartPickerCustom(false);
  }, [mobileStartPickerOpen]);

  useEffect(() => {
    if (!mobileEndPickerOpen) setMobileEndPickerCustom(false);
  }, [mobileEndPickerOpen]);

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
    originEndMinute?: number,
    pointerId = 0
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
      pointerId,
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
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== activeDrag.pointerId) return;
      lastClientX = event.clientX;
      if (rafId === null) rafId = window.requestAnimationFrame(flushMove);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== activeDrag.pointerId) return;
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
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
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

  const clearMobileDayLongPressTimer = () => {
    if (mobileDayLongPressTimerRef.current !== null) {
      clearTimeout(mobileDayLongPressTimerRef.current);
      mobileDayLongPressTimerRef.current = null;
    }
  };

  const onMobileDayPointerDown = (idx: number, e: React.PointerEvent) => {
    if (isPending || !selectedUserId) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    mobileDayLongPressFiredRef.current = false;
    clearMobileDayLongPressTimer();
    mobileDayLongPressTimerRef.current = setTimeout(() => {
      mobileDayLongPressTimerRef.current = null;
      mobileDayLongPressFiredRef.current = true;
      setSimpleSheetDay(idx);
      setSimpleAddSheetOpen(true);
    }, 480);
  };

  const onMobileDayPointerEnd = () => {
    clearMobileDayLongPressTimer();
  };

  const onMobileDayCardClick = (idx: number) => {
    if (mobileDayLongPressFiredRef.current) {
      mobileDayLongPressFiredRef.current = false;
      return;
    }
    applyDayFromInputs(idx);
  };

  const mobileOverlayOpen =
    simpleAddSheetOpen || mobileMemberPickerOpen || mobileStartPickerOpen || mobileEndPickerOpen;

  const openMobileQuickAdd = (dayIdx = 1) => {
    setSimpleSheetDay(dayIdx);
    setSimpleAddSheetOpen(true);
  };

  const MobileView = (
    <>
        <div className="flex flex-col gap-6 pb-40">
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Einfach-Planer</strong>: Mitarbeiter und Zeiten per Sheet wählen, Tage antippen.{" "}
          <strong className="text-foreground">Halte</strong> einen Tag gedrückt für den Schnell-Editor. Unten: Schicht hinzufügen.
        </p>

        <div className="flex flex-col gap-5">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setMobileMemberPickerOpen(true)}
            className="flex min-h-14 w-full flex-col items-start justify-center rounded-2xl border border-border bg-background px-4 py-3 text-left shadow-sm transition-colors active:bg-muted/40"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mitarbeiter</span>
            <span className="text-lg font-bold leading-tight text-foreground">
              {selectedMember ? selectedMember.name ?? selectedMember.email : "Auswählen"}
            </span>
          </button>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMobileStartPickerOpen(true)}
              className="flex min-h-14 flex-col items-start justify-center rounded-2xl border border-border bg-background px-4 py-3 text-left active:bg-muted/40"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Start</span>
              <span className="text-xl font-bold tabular-nums text-foreground">{startTime.slice(0, 5)}</span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMobileEndPickerOpen(true)}
              className="flex min-h-14 flex-col items-start justify-center rounded-2xl border border-border bg-background px-4 py-3 text-left active:bg-muted/40"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ende</span>
              <span className="text-xl font-bold tabular-nums text-foreground">{endTime.slice(0, 5)}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
        <button
          type="button"
          onClick={submitStandardWeek}
          disabled={isPending || !selectedUserId}
          className="min-h-14 touch-manipulation rounded-2xl border border-primary/30 bg-primary/15 px-4 py-3 text-base font-semibold text-primary transition-colors active:bg-primary/25 disabled:opacity-60"
        >
          Standardwoche (Mo–Fr)
        </button>
        <button
          type="button"
          onClick={submitCopyToAll}
          disabled={isPending || !selectedUserId}
          className="min-h-14 touch-manipulation rounded-2xl border border-border bg-background px-4 py-3 text-base font-semibold text-foreground transition-colors active:bg-muted/50 disabled:opacity-60"
        >
          Auf alle übertragen
        </button>
      </div>
      <div className="mt-2 flex flex-col gap-4">
        <p className="text-sm leading-snug text-muted-foreground">
          Tipp: Zeiten über die großen Start-/Ende-Felder oder die Presets setzen. Tag kurz tippen oder halten für den Editor.
        </p>
        {selectedUserVacationDays.size > 0 && (
          <p className="text-sm font-medium text-amber-300">
            Abwesenheit: {Array.from(selectedUserVacationDays).map((d) => DAY_LABELS[d]).join(", ")}
            {selectedUserSickDays.size > 0 ? " (rot = krank)." : "."}
          </p>
        )}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="flex min-h-14 flex-col justify-center rounded-2xl border border-border bg-background px-4 py-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Schritt 1</p>
          <p className="text-base font-medium text-foreground">Zeit per Sheet wählen (oder Presets unten).</p>
        </div>
        <div className="flex min-h-14 flex-col justify-center rounded-2xl border border-border bg-background px-4 py-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Schritt 2</p>
          <p className="text-base font-medium text-foreground">Tage antippen – speichert sofort. Halten öffnet den Editor.</p>
        </div>
      </div>
      {hasInvalidRange && (
        <p className="mt-3 text-sm font-medium text-amber-300">Bitte gültige Zeit wählen: Ende muss später als Start sein.</p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4">
        <button
          type="button"
          onClick={() => {
            setStartTime("08:00");
            setEndTime("16:00");
          }}
          className="min-h-14 w-full touch-manipulation rounded-2xl border border-border bg-background px-4 py-3 text-left text-base font-semibold text-foreground active:bg-muted/50"
          disabled={isPending}
        >
          Früh · 08:00–16:00
        </button>
        <button
          type="button"
          onClick={() => {
            setStartTime("09:00");
            setEndTime("17:00");
          }}
          className="min-h-14 w-full touch-manipulation rounded-2xl border border-border bg-background px-4 py-3 text-left text-base font-semibold text-foreground active:bg-muted/50"
          disabled={isPending}
        >
          Standard · 09:00–17:00
        </button>
        <button
          type="button"
          onClick={() => {
            setStartTime("14:00");
            setEndTime("22:00");
          }}
          className="min-h-14 w-full touch-manipulation rounded-2xl border border-border bg-background px-4 py-3 text-left text-base font-semibold text-foreground active:bg-muted/50"
          disabled={isPending}
        >
          Spät · 14:00–22:00
        </button>
      </div>

        <div className="mt-8 grid grid-cols-1 gap-5">
        {DAY_LABELS.map((label, idx) => {
          const planned = userPrimaryShiftByDay.get(idx);
          const hasShift = Boolean(planned);
          const baseCard =
            selectedUserVacationDays.has(idx) && selectedUserSickDays.has(idx)
              ? "border-red-400/45 bg-red-500/15 text-red-50 active:bg-red-500/25"
              : selectedUserVacationDays.has(idx)
                ? "border-amber-400/45 bg-amber-500/14 text-amber-50 active:bg-amber-500/22"
                : hasShift
                  ? "border-primary/40 bg-primary/12 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] active:bg-primary/18"
                  : "border-border/80 bg-muted/25 text-foreground active:bg-muted/40";
          return (
          <button
            key={label}
            type="button"
            onPointerDown={(e) => onMobileDayPointerDown(idx, e)}
            onPointerUp={onMobileDayPointerEnd}
            onPointerCancel={onMobileDayPointerEnd}
            onPointerLeave={onMobileDayPointerEnd}
            onClick={() => onMobileDayCardClick(idx)}
            disabled={isPending || !selectedUserId}
            className={`touch-manipulation flex min-h-14 w-full flex-col items-start justify-center rounded-2xl border px-4 py-4 text-left transition-colors disabled:opacity-60 ${baseCard} ${
              recentDayAction?.dayOfWeek === idx ? "ring-2 ring-primary/70 ring-offset-2 ring-offset-card" : ""
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="mt-1 block text-2xl font-extrabold leading-tight tracking-tight text-foreground">
              {MOBILE_DAY_NAMES[idx]}
            </span>
            <span className="mt-2 block text-lg font-semibold tabular-nums text-foreground/90">
              {planned ? `${planned.startTime.slice(0, 5)} – ${planned.endTime.slice(0, 5)}` : "Frei – antippen zum Planen"}
            </span>
            {recentDayAction?.dayOfWeek === idx && (
              <span className={`mt-2 block text-sm font-semibold ${recentDayAction.action === "saved" ? "text-primary" : "text-red-400"}`}>
                {recentDayAction.action === "saved" ? "Gespeichert" : "Gelöscht"}
              </span>
            )}
          </button>
          );
        })}
      </div>

        <button
          type="button"
          onClick={() => openMobileQuickAdd(1)}
          className="mt-8 flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-muted-foreground/35 bg-muted/15 px-4 py-6 text-center active:bg-muted/30"
        >
          <span className="text-base font-bold text-foreground">Freifläche</span>
          <span className="max-w-xs text-sm text-muted-foreground">Tippen, um den Schicht-Editor zu öffnen (Montag vorausgewählt).</span>
        </button>

        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          Kurz tippen: Schicht mit der gewählten Zeit setzen oder löschen. <strong className="text-foreground">Halten</strong>: voller Editor. Orange/Rot = Abwesenheit.
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="min-h-14 w-full touch-manipulation rounded-2xl border border-border bg-background px-4 py-3 text-base font-semibold text-foreground active:bg-muted/40"
          >
            {showDetails ? "Details ausblenden" : "Details anzeigen"}
          </button>
        </div>
        {showDetails && (
          <div className="mt-4 rounded-2xl border border-border bg-background">
            {userShifts.length === 0 ? (
              <p className="min-h-14 px-4 py-5 text-base text-muted-foreground">Noch keine Schichten für den ausgewählten Mitarbeiter.</p>
            ) : (
              <ul className="divide-y divide-border">
                {userShifts.map((s) => (
                  <li key={s.id} className="flex min-h-14 items-center justify-between gap-4 px-4 py-4 text-base">
                    <span className="text-lg font-bold text-foreground">{MOBILE_DAY_NAMES[s.dayOfWeek] ?? DAY_LABELS[s.dayOfWeek]}</span>
                    <span className="font-sans text-lg font-semibold tabular-nums text-muted-foreground">
                      {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        </div>

        {!mobileOverlayOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-[45] border-t border-border bg-card/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/90">
            <button
              type="button"
              onClick={() => openMobileQuickAdd(1)}
              className="flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-dashed border-primary/55 bg-primary/12 text-base font-bold text-primary active:scale-[0.99] active:bg-primary/18"
            >
              + Schicht hinzufügen
            </button>
          </div>
        )}

        <Drawer.Root open={mobileMemberPickerOpen} onOpenChange={setMobileMemberPickerOpen} repositionInputs fixed shouldScaleBackground={false}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[101] bg-black/50" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[102] flex max-h-[88vh] flex-col rounded-t-[28px] border border-border bg-card outline-none">
              <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/35" />
              <Drawer.Title className="px-4 pt-2 text-xl font-bold text-foreground">Mitarbeiter wählen</Drawer.Title>
              <Drawer.Description className="px-4 pb-2 text-sm text-muted-foreground">Tippe einen Namen – die Auswahl wird sofort übernommen.</Drawer.Description>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
                <div className="flex flex-col gap-4">
                  {members.map((m) => (
                    <button
                      key={`mob-pick-${m.id}`}
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setSelectedUserId(m.id);
                        setMobileMemberPickerOpen(false);
                      }}
                      className={`min-h-14 w-full rounded-2xl border px-4 py-3 text-left text-base font-semibold transition-colors active:scale-[0.99] ${
                        m.id === selectedUserId
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border bg-background text-foreground active:bg-muted/40"
                      }`}
                    >
                      {m.name ?? m.email}
                    </button>
                  ))}
                </div>
              </div>
              <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Drawer.Close className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-border bg-background text-base font-semibold text-foreground active:bg-muted/40">
                  Schließen
                </Drawer.Close>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        <Drawer.Root open={mobileStartPickerOpen} onOpenChange={setMobileStartPickerOpen} repositionInputs fixed shouldScaleBackground={false}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[101] bg-black/50" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[102] flex max-h-[85vh] flex-col rounded-t-[28px] border border-border bg-card outline-none">
              <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/35" />
              <Drawer.Title className="px-4 pt-2 text-xl font-bold text-foreground">Startzeit</Drawer.Title>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
                <div className="flex flex-col gap-4">
                  {(["06:00", "08:00", "09:00", "14:00"] as const).map((t) => (
                    <button
                      key={`st-${t}`}
                      type="button"
                      className="min-h-14 w-full rounded-2xl border border-border bg-background px-4 py-3 text-left text-lg font-bold tabular-nums active:bg-muted/40"
                      onClick={() => {
                        setStartTime(t);
                        setMobileStartPickerOpen(false);
                      }}
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="min-h-14 w-full rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/20 px-4 py-3 text-base font-semibold text-foreground"
                    onClick={() => setMobileStartPickerCustom((v) => !v)}
                  >
                    {mobileStartPickerCustom ? "Presets anzeigen" : "Eigene Uhrzeit …"}
                  </button>
                  {mobileStartPickerCustom && (
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      onFocus={scrollFieldIntoView}
                      className="min-h-14 w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold tabular-nums text-foreground"
                      disabled={isPending}
                    />
                  )}
                </div>
              </div>
              <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Drawer.Close className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 text-base font-bold text-primary">
                  Fertig
                </Drawer.Close>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        <Drawer.Root open={mobileEndPickerOpen} onOpenChange={setMobileEndPickerOpen} repositionInputs fixed shouldScaleBackground={false}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[101] bg-black/50" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[102] flex max-h-[85vh] flex-col rounded-t-[28px] border border-border bg-card outline-none">
              <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/35" />
              <Drawer.Title className="px-4 pt-2 text-xl font-bold text-foreground">Endzeit</Drawer.Title>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
                <div className="flex flex-col gap-4">
                  {(["16:00", "17:00", "18:00", "22:00"] as const).map((t) => (
                    <button
                      key={`en-${t}`}
                      type="button"
                      className="min-h-14 w-full rounded-2xl border border-border bg-background px-4 py-3 text-left text-lg font-bold tabular-nums active:bg-muted/40"
                      onClick={() => {
                        setEndTime(t);
                        setMobileEndPickerOpen(false);
                      }}
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="min-h-14 w-full rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/20 px-4 py-3 text-base font-semibold text-foreground"
                    onClick={() => setMobileEndPickerCustom((v) => !v)}
                  >
                    {mobileEndPickerCustom ? "Presets anzeigen" : "Eigene Uhrzeit …"}
                  </button>
                  {mobileEndPickerCustom && (
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      onFocus={scrollFieldIntoView}
                      className="min-h-14 w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold tabular-nums text-foreground"
                      disabled={isPending}
                    />
                  )}
                </div>
              </div>
              <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Drawer.Close className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 text-base font-bold text-primary">
                  Fertig
                </Drawer.Close>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        <Drawer.Root open={simpleAddSheetOpen} onOpenChange={setSimpleAddSheetOpen} repositionInputs fixed shouldScaleBackground={false}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/50" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[100] flex h-[92dvh] max-h-[92dvh] flex-col rounded-t-[28px] border border-border bg-card shadow-[0_-12px_40px_rgba(0,0,0,0.18)] outline-none">
              <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/35" />
              <Drawer.Title className="px-4 pt-1 text-xl font-bold text-foreground">Schicht setzen</Drawer.Title>
              <Drawer.Description className="px-4 text-sm text-muted-foreground">
                Mitarbeiter, Tag und Zeit – Aktionen unten in der Daumen-Zone.
              </Drawer.Description>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-2">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain pb-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Mitarbeiter</p>
                    <div className="mt-3 flex flex-col gap-4">
                      {members.map((m) => (
                        <button
                          key={`sheet-mem-${m.id}`}
                          type="button"
                          disabled={isPending}
                          onClick={() => setSelectedUserId(m.id)}
                          className={`min-h-14 w-full rounded-2xl border px-4 py-3 text-left text-base font-semibold transition-colors ${
                            m.id === selectedUserId
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-border bg-background text-foreground active:bg-muted/40"
                          }`}
                        >
                          {m.name ?? m.email}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Wochentag</p>
                    <div className="mt-3 flex flex-col gap-4">
                      {DAY_LABELS.map((label, idx) => (
                        <button
                          key={`sheet-day-${label}`}
                          type="button"
                          onClick={() => setSimpleSheetDay(idx)}
                          className={`flex min-h-14 w-full flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left transition-colors active:scale-[0.99] ${
                            simpleSheetDay === idx
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-border bg-background text-foreground active:bg-muted/40"
                          }`}
                        >
                          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
                          <span className="text-lg font-bold text-foreground">{MOBILE_DAY_NAMES[idx]}</span>
                          {userPrimaryShiftByDay.get(idx) ? (
                            <span className="mt-1 text-sm font-semibold tabular-nums text-muted-foreground">
                              {userPrimaryShiftByDay.get(idx)?.startTime?.slice(0, 5)}–
                              {userPrimaryShiftByDay.get(idx)?.endTime?.slice(0, 5)}
                            </span>
                          ) : (
                            <span className="mt-1 text-sm text-muted-foreground">frei</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Start</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        onFocus={scrollFieldIntoView}
                        className="mt-2 min-h-14 w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold tabular-nums text-foreground"
                        disabled={isPending}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Ende</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        onFocus={scrollFieldIntoView}
                        className="mt-2 min-h-14 w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold tabular-nums text-foreground"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  {hasInvalidRange && (
                    <p className="text-sm font-medium text-amber-600">Ende muss nach Start liegen.</p>
                  )}
                </div>

                <div className="shrink-0 space-y-3 border-t border-border bg-card pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    disabled={isPending || !selectedUserId || hasInvalidRange}
                    onClick={() => {
                      applyDayFromInputs(simpleSheetDay);
                      setSimpleAddSheetOpen(false);
                    }}
                    className="min-h-14 w-full rounded-2xl border border-primary/40 bg-primary/15 text-base font-bold text-primary active:bg-primary/25 disabled:opacity-50"
                  >
                    Speichern
                  </button>
                  <Drawer.Close className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-border bg-background text-base font-semibold text-foreground active:bg-muted/40">
                    Abbrechen
                  </Drawer.Close>
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
    </>
  );

  const DesktopView = (
    <>
        <div className="mt-3 grid w-full max-w-full grid-cols-2 gap-2 rounded-xl border border-border bg-background p-2 text-xs sm:text-[13px]">
          <button
            type="button"
            onClick={() => setViewMode("simple")}
            className={`min-h-12 touch-manipulation rounded-lg px-2 py-2 font-medium sm:min-h-11 ${viewMode === "simple" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground active:bg-muted/50"}`}
          >
            Einfach-Planer
          </button>
          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={`min-h-12 touch-manipulation rounded-lg px-2 py-2 font-medium sm:min-h-11 ${viewMode === "timeline" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground active:bg-muted/50"}`}
          >
            Timeline
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <strong className="text-foreground">Einfach-Planer</strong>: eine Person, Woche per Tippen.{" "}
          <strong className="text-foreground">Timeline</strong>: einen Wochentag, alle Mitarbeitenden als Balken (ziehen und klicken).
        </p>

        {viewMode === "simple" && (
        <>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-5">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="min-h-11 w-full touch-manipulation rounded-lg border border-border bg-white px-3 py-2.5 text-sm sm:min-h-0 sm:py-2"
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
          className="min-h-11 w-full touch-manipulation rounded-lg border border-border bg-white px-3 py-2.5 text-sm sm:min-h-0 sm:py-2"
          disabled={isPending}
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="min-h-11 w-full touch-manipulation rounded-lg border border-border bg-white px-3 py-2.5 text-sm sm:min-h-0 sm:py-2"
          disabled={isPending}
        />
        <button
          type="button"
          onClick={submitStandardWeek}
          disabled={isPending || !selectedUserId}
          className="min-h-11 touch-manipulation rounded-lg border border-primary/30 bg-primary/15 px-3 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] disabled:opacity-60 sm:min-h-0 sm:py-2"
        >
          Standardwoche (Mo-Fr)
        </button>
        <button
          type="button"
          onClick={submitCopyToAll}
          disabled={isPending || !selectedUserId}
          className="min-h-11 touch-manipulation rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-card/80 disabled:opacity-60 sm:min-h-0 sm:py-2"
        >
          Auf alle übertragen
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-[11px] text-muted-foreground">Tipp: Zeit oben einstellen und Tage direkt antippen. Erneuter Klick mit gleicher Zeit löscht den Tag.</p>
        {selectedUserVacationDays.size > 0 && (
          <p className="text-[11px] text-amber-300">
            Abwesenheit: {Array.from(selectedUserVacationDays).map((d) => DAY_LABELS[d]).join(", ")}
            {selectedUserSickDays.size > 0 ? " (rot = krank)." : "."}
          </p>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-background px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Schritt 1</p>
          <p className="text-sm text-foreground">Zeit oben wählen (oder Früh/Standard/Spät klicken).</p>
        </div>
        <div className="rounded-xl border border-border bg-background px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Schritt 2</p>
          <p className="text-sm text-foreground">Tage antippen. Jeder Klick speichert sofort.</p>
        </div>
      </div>
      {hasInvalidRange && (
        <p className="mt-2 text-xs text-amber-300">Bitte gültige Zeit wählen: Ende muss später als Start sein.</p>
      )}

      <div className="mt-3 flex flex-wrap items-stretch gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setStartTime("08:00");
            setEndTime("16:00");
          }}
          className="min-h-11 min-w-0 flex-1 touch-manipulation rounded-md border border-border bg-background px-2 py-2.5 text-foreground sm:flex-none sm:px-2.5 sm:py-1 md:hover:bg-card/80"
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
          className="min-h-11 min-w-0 flex-1 touch-manipulation rounded-md border border-border bg-background px-2 py-2.5 text-foreground sm:flex-none sm:px-2.5 sm:py-1 md:hover:bg-card/80"
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
          className="min-h-11 min-w-0 flex-[1_1_100%] touch-manipulation rounded-md border border-border bg-background px-2 py-2.5 text-foreground sm:flex-none sm:px-2.5 sm:py-1 md:hover:bg-card/80"
          disabled={isPending}
        >
          Spät: 14:00-22:00
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {DAY_LABELS.map((label, idx) => (
          <button
            key={`desktop-day-${label}`}
            type="button"
            onClick={() => applyDayFromInputs(idx)}
            disabled={isPending || !selectedUserId}
            className={`touch-manipulation rounded-xl border px-3 py-3 text-left text-sm transition-colors disabled:opacity-60 sm:rounded-lg sm:text-xs min-h-[4.5rem] sm:min-h-0 sm:py-2 ${
              selectedUserVacationDays.has(idx)
                ? selectedUserSickDays.has(idx)
                  ? "border-red-400/35 bg-red-500/12 text-red-100 hover:bg-red-500/20"
                  : "border-amber-400/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                : usedDays.has(idx)
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border bg-background text-foreground hover:bg-card/80"
            } ${recentDayAction?.dayOfWeek === idx ? "ring-2 ring-primary/60" : ""}`}
          >
            <span className="block text-xs">{label}</span>
            <span className="mt-0.5 block text-[10px] font-sans opacity-80">
              {userPrimaryShiftByDay.get(idx)
                ? `${userPrimaryShiftByDay.get(idx)?.startTime}-${userPrimaryShiftByDay.get(idx)?.endTime}`
                : "frei"}
            </span>
            {recentDayAction?.dayOfWeek === idx && (
              <span className={`mt-1 block text-[10px] ${recentDayAction.action === "saved" ? "text-primary" : "text-red-700"}`}>
                {recentDayAction.action === "saved" ? "Gespeichert" : "Gelöscht"}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Grün = Schicht, Orange = Urlaub, Rot = Krank. Klick setzt die oben gewählte Zeit direkt für den Tag.
      </p>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="min-h-11 touch-manipulation rounded-md border border-border bg-background px-4 py-2 text-xs text-foreground sm:min-h-0 sm:px-3 sm:py-1.5 md:hover:bg-card/80"
        >
          {showDetails ? "Details ausblenden" : "Details anzeigen"}
        </button>
      </div>
      {showDetails && (
        <div className="mt-3 rounded-xl border border-border bg-background">
          <div className="grid grid-cols-3 border-b border-border px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span>Tag</span>
            <span>Start</span>
            <span>Ende</span>
          </div>
          {userShifts.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Noch keine Schichten für den ausgewählten Mitarbeiter.</p>
          ) : (
            userShifts.map((s, idx) => (
              <div key={s.id} className={`grid grid-cols-3 items-center px-3 py-2 text-sm ${idx % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                <span>{DAY_LABELS[s.dayOfWeek] ?? s.dayOfWeek}</span>
                <span className="font-sans text-foreground">{s.startTime}</span>
                <span className="font-sans text-foreground">{s.endTime}</span>
              </div>
            ))
          )}
        </div>
      )}
        </>
        )}

      {viewMode === "timeline" && (
        <div className="mt-4 min-w-0 max-w-full overflow-x-auto rounded-xl border border-border bg-background p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Fokusmodus: Planung zuerst, Kennzahlen optional.</p>
            <button
              type="button"
              onClick={() => setShowPlannerInfo((v) => !v)}
              className="min-h-11 shrink-0 touch-manipulation rounded-md border border-border bg-background px-3 py-2 text-[11px] text-foreground sm:min-h-0 sm:px-2.5 sm:py-1 md:hover:bg-card/80"
            >
              {showPlannerInfo ? "Info ausblenden" : "Info einblenden"}
            </button>
          </div>
          {showPlannerInfo && (
            <div className="mb-3 rounded-xl border border-border bg-white px-3 py-2">
              <p className="text-[11px] text-foreground">
                Wochenstatus: <span className="text-foreground/85">{plannedDaysCount}/7</span> · Sollstunden:{" "}
                <span className="text-primary">{formatHours(weeklyMinutes)}</span> · Lücken Mo-Fr:{" "}
                <span className="text-amber-300">{missingWeekdays.length === 0 ? "Keine" : missingWeekdays.join(", ")}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Wochentag
              </span>
              <select
                value={timelineDay}
                onChange={(e) => setTimelineDay(Number(e.target.value))}
                className="min-h-12 w-full touch-manipulation rounded-lg border border-border bg-white px-3 py-2.5 text-base sm:min-h-11 sm:text-sm"
              >
                {TIMELINE_WEEKDAY_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="vrema-needed-staff"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Mindestbesetzung (pro Zeitfenster)
              </label>
              <input
                id="vrema-needed-staff"
                type="number"
                min={1}
                max={20}
                value={neededStaff}
                onChange={(e) => setNeededStaff(Math.max(1, Number(e.target.value) || 1))}
                className="min-h-12 w-full touch-manipulation rounded-lg border border-border bg-white px-3 py-2.5 text-base tabular-nums sm:min-h-11 sm:text-sm"
                title="Benötigte Mitarbeiter pro Zeitfenster"
              />
            </div>
            <p className="hidden items-center text-[11px] text-muted-foreground leading-snug md:flex">
              15-Minuten-Raster · Hilfslinien · Balken ziehen oder anklicken zum Bearbeiten
            </p>
          </div>
          <div className="mt-2 flex justify-end">
            {firstCriticalSlot ? (
              <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 sm:text-[11px]">
                Erste Lücke ab {firstCriticalSlot}
              </span>
            ) : null}
          </div>

          <div className="mt-3 max-h-[75vh] min-w-0 max-w-full overflow-x-auto overflow-y-auto overscroll-contain">
            <div className="w-full min-w-[720px] space-y-4 md:min-w-[880px]">
              <div className="sticky top-0 z-30 grid grid-cols-1 gap-2 border-b border-border bg-background py-2 text-[11px] text-muted-foreground md:grid-cols-[220px_1fr] md:items-center">
                <div className="hidden font-medium text-foreground md:block">Mitarbeiter</div>
                <div className="grid grid-cols-9 font-sans">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const hour = TIMELINE_START_HOUR + idx * 2;
                    return (
                      <span key={hour} className="text-center text-[10px] sm:text-[11px]">
                        {String(hour).padStart(2, "0")}
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
                  <div
                    key={row.member.id}
                    className="grid grid-cols-1 items-stretch gap-2 md:grid-cols-[220px_1fr] md:items-center md:gap-3"
                  >
                    <div className="flex min-h-12 items-center rounded-2xl border border-border bg-white px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)] md:min-h-0 md:px-4 md:py-4">
                      <span className="inline-flex min-w-0 items-center gap-2 text-sm text-foreground">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground md:h-7 md:w-7 md:text-[11px]">
                          {initials}
                        </span>
                        <span className="truncate text-[15px] font-medium">{row.member.name ?? row.member.email}</span>
                      </span>
                    </div>
                    <div
                      data-timeline-lane
                      className="relative h-[4.25rem] touch-manipulation rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)] md:h-16"
                      style={{ touchAction: "pan-y" }}
                      onPointerDown={(e) => {
                        if (e.pointerType === "mouse" && e.button !== 0) return;
                        if (row.conflict) return;
                        beginTimelineDrag(
                          e.clientX,
                          e.currentTarget as HTMLElement,
                          row.member.id,
                          "create",
                          undefined,
                          undefined,
                          e.pointerId
                        );
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
                            row.conflict === "SICK" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {row.conflict === "SICK" ? "Krank (gesperrt)" : "Urlaub (gesperrt)"}
                        </div>
                      ) : widthPct > 0 ? (
                        <div
                          className={`group absolute top-1.5 bottom-1.5 z-10 flex cursor-grab touch-manipulation items-center rounded-lg border border-primary/60 bg-primary/40 px-2 text-[11px] text-emerald-100 active:cursor-grabbing ${
                            activeDrag?.userId === row.member.id
                              ? "shadow-lg shadow-black/40 transition-none"
                              : "transition-[left,width] duration-100 ease-out"
                          }`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`${minutesToHHMM(visualStart ?? TIMELINE_START_HOUR * 60)}-${minutesToHHMM(visualEnd ?? TIMELINE_START_HOUR * 60)}`}
                          onPointerDown={(e) => {
                            if (e.pointerType === "mouse" && e.button !== 0) return;
                            if (!row.shift || row.conflict) return;
                            const lane = (e.currentTarget as HTMLElement).closest("[data-timeline-lane]");
                            if (!(lane instanceof HTMLElement)) return;
                            const sm = toMinutes(row.shift.startTime);
                            const em = toMinutes(row.shift.endTime);
                            if (sm === null || em === null) return;
                            e.stopPropagation();
                            beginTimelineDrag(e.clientX, lane, row.member.id, "move", sm, em, e.pointerId);
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
                              className="absolute -right-1 -top-1 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-300/40 bg-red-500/90 text-sm text-foreground opacity-100 md:h-7 md:w-7 md:text-xs md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
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
    </>
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
      <h2 className="text-lg font-semibold tracking-tight">
        <span className="lg:hidden">Einfach-Planer</span>
        <span className="hidden lg:inline">Arbeitsplan (Soll-Zeiten)</span>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="lg:hidden">Nur diese Ansicht: Mitarbeiter, Zeiten und Wochentage – ohne Timeline.</span>
        <span className="hidden lg:inline">Starter+: Leitung plant Mitarbeiter, System macht Soll/Ist beim Stempeln.</span>
      </p>
      {shiftCycleWeeks > 1 && (
        <div className="mt-3 inline-flex max-w-full rounded-lg border border-border bg-background p-1 text-xs">
          {Array.from({ length: shiftCycleWeeks }).map((_, idx) => {
            const week = (idx + 1) as 1 | 2 | 3;
            return (
              <button
                key={week}
                type="button"
                onClick={() => setSelectedWeekIndex(week)}
                className={`min-h-11 touch-manipulation rounded-md px-4 py-2 sm:min-h-0 sm:px-3 sm:py-1.5 ${
                  selectedWeekIndex === week ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Woche {week}
              </button>
            );
          })}
        </div>
      )}
      {selectedMember && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] text-foreground">
          <span>Ausgewählt:</span>
          <span className="font-semibold text-foreground">{selectedMember.name ?? selectedMember.email}</span>
        </div>
      )}
      <>
        <div className="block lg:hidden">{MobileView}</div>
        <div className="hidden lg:block">{DesktopView}</div>
      </>

      {message && <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">{message}</p>}

      {shiftEdit && (
        <div
          className="fixed inset-0 z-[100] hidden items-end justify-center bg-black/45 p-0 lg:flex md:items-center md:bg-white/70 md:p-4"
          role="dialog"
          aria-modal="true"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setShiftEdit(null);
          }}
        >
          <div className="max-h-[min(88dvh,640px)] w-full max-w-full overflow-y-auto rounded-t-3xl border border-b-0 border-border bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] sm:max-h-[90vh] md:max-h-none md:max-w-sm md:rounded-2xl md:border md:pb-5 md:shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-semibold text-foreground md:text-sm">Schicht bearbeiten</h3>
            <p className="mt-1 text-xs text-muted-foreground">{DAY_LABELS[timelineDay]} · {shiftEdit.label}</p>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Start</label>
                <input
                  type="time"
                  step={900}
                  value={shiftEdit.startTime.slice(0, 5)}
                  onChange={(e) => setShiftEdit({ ...shiftEdit, startTime: e.target.value })}
                  className="mt-1 min-h-12 w-full touch-manipulation rounded-lg border border-border bg-white px-3 py-3 text-base text-foreground md:min-h-0 md:py-2 md:text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Ende</label>
                <input
                  type="time"
                  step={900}
                  value={shiftEdit.endTime.slice(0, 5)}
                  onChange={(e) => setShiftEdit({ ...shiftEdit, endTime: e.target.value })}
                  className="mt-1 min-h-12 w-full touch-manipulation rounded-lg border border-border bg-white px-3 py-3 text-base text-foreground md:min-h-0 md:py-2 md:text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                className="min-h-12 w-full touch-manipulation rounded-lg border border-primary/35 bg-primary/15 px-4 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/25 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] disabled:opacity-50 sm:w-auto sm:py-2"
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
                className="min-h-12 w-full touch-manipulation rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 sm:w-auto sm:py-2"
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => setShiftEdit(null)}
                className="min-h-12 w-full touch-manipulation rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground transition-colors sm:w-auto sm:py-2 md:hover:bg-card/80"
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
