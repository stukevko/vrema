"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { Drawer } from "vaul";
import {
  applyStandardWeek,
  clearShiftForDay,
  copyWeekToAllMembers,
  setShiftBreakDuration,
  setShiftForDay,
  toggleShiftTradeOffer,
} from "@/lib/actions/team";
import { getPlannerQuickSuggest, type PlannerQuickSuggestRow } from "@/lib/actions/planner-quick-suggest";
import { getPlannerStaffingHints, type PlannerStaffingHint } from "@/lib/actions/predictive";
import { StaffingHintBadge } from "@/components/planning/StaffingHintBadge";
import { generateTaskListForShift } from "@/lib/actions/shift-tasks";
import { confirmAutopilotDrafts, discardAutopilotDrafts, runAutopilotDraft } from "@/lib/actions/autopilot";
import { PlannerAutopilotPanel } from "@/components/planning/PlannerAutopilotPanel";
import { ShiftCentricBoard } from "@/components/planning/ShiftCentricBoard";
import { buildMemberWeekMinutes, type BoardShiftSlot } from "@/lib/planning/shift-board-model";
import { ShiftAddSheet } from "@/components/planning/ShiftAddSheet";
import { OvertimeRecoveryPopover } from "@/components/planning/OvertimeRecoveryPopover";
import { AssignmentGuardDialog } from "@/components/planning/AssignmentGuardDialog";
import { getPlannerBoardMemberSaldos } from "@/lib/actions/planner-board";
import { clearPlannerShiftSlot } from "@/lib/actions/planner-shift-remove";
import {
  countCriticalOvertimeMembers,
  evaluateMemberAssignmentRisk,
  pickAlternativeAssignee,
  type AssignmentRisk,
  type MemberSaldoSnapshot,
} from "@/lib/planning/board-assistant";
import type { ShiftTemplateRow } from "@/lib/actions/shift-templates";
import type { CompanyModules } from "@/lib/company-modules";
import type { AutopilotUserReport } from "@/lib/planning/autopilot-report";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buildComplianceFlagsByShiftId, type ShiftPlanRow } from "@/lib/planning/compliance";
import { countWeekCoverageGapSlots } from "@/lib/planning/planner-coverage-metrics";
import {
  AlarmClock,
  Brain,
  Coffee,
  Flame,
  CornerDownRight,
  Info,
  Loader2,
  Plus,
  CloudSun,
  CloudRain,
  Cloud,
  Sun,
  HelpCircle,
  Sparkles,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  dateForPlannerCycleDay,
  formatPlannerWeekRange,
  isoFromPlannerDate,
  mondayOfWeekContaining,
  plannerCycleDateBounds,
  weekIndexForPlannerDate,
} from "@/lib/planning/cycle-display-date";
import type { DailyWeatherForecast } from "@/lib/weather/shared";
import { isRainLikeCondition } from "@/lib/weather/shared";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusTone } from "@/components/ui/StatusBadge";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role?: string | null;
  image?: string | null;
  weeklyHours?: number;
  hourlyWage?: number | null;
  /** Außenbereich / Terrasse – für Wetter-Hinweise im Planer */
  planningWorkArea?: string | null;
};

type ShiftRow = {
  id: string;
  userId: string;
  weekIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  isDraft?: boolean;
  staffingRole?: string | null;
  isOpenForTrade?: boolean;
  tradeStatus?: "NONE" | "OPEN" | "PENDING_APPROVAL";
  tradeRequestedBy?: string | null;
};

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEK_SHORT_MON = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
/** Mobile: volle Wochentagsnamen für bessere Lesbarkeit. */
const MOBILE_DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;
/** Gastro-Planung: 06–24 Uhr statt Mitternacht–Mitternacht (weniger Leerraum, sinnvollere Lücken). */
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 24;
const TIMELINE_SLOT_COUNT = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
const TIMELINE_TOTAL_MINUTES = TIMELINE_SLOT_COUNT * 60;
const TIMELINE_GRID_STYLE = { gridTemplateColumns: `repeat(${TIMELINE_SLOT_COUNT}, minmax(0, 1fr))` } as const;
const TIMELINE_SNAP_MINUTES = 15;
/** Vertikale Hilfslinien im sichtbaren Raster (06–24 Uhr). */
const TIMELINE_QUARTER_STRIPES = TIMELINE_SLOT_COUNT * (60 / TIMELINE_SNAP_MINUTES);

/** Prozent-Position einer Minute im sichtbaren 06–24-Raster. */
function timelineMinuteToPercent(minute: number): number {
  const start = TIMELINE_START_HOUR * 60;
  const clamped = Math.max(start, Math.min(TIMELINE_END_HOUR * 60, minute));
  return ((clamped - start) / TIMELINE_TOTAL_MINUTES) * 100;
}

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatHours(totalMinutes: number) {
  const hours = totalMinutes / 60;
  return `${hours.toFixed(1)}h`;
}

function shiftDurationMinutes(start: string, end: string) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return 0;
  return endMinutes > startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
}

function shiftNetDurationMinutes(start: string, end: string, breakDuration = 0) {
  return Math.max(0, shiftDurationMinutes(start, end) - Math.max(0, breakDuration));
}

function addMinutesToHHMM(value: string, delta: number) {
  const m = toMinutes(value);
  if (m === null) return value;
  const next = (m + delta + 24 * 60) % (24 * 60);
  return minutesToHHMM(next);
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

function shiftKey(startTime: string, endTime: string) {
  return `${startTime}-${endTime}`;
}

/** Mo–So × Tagesraster: Obergrenze für „Lücken“-Zählung (Fortschrittsbalken / Farbe). */
function maxWeekCoverageSlots(coverageSlotMinutes: number) {
  const perDay = Math.ceil(TIMELINE_TOTAL_MINUTES / Math.max(1, coverageSlotMinutes));
  return 7 * perDay;
}

function dayOrderMonFirst(dayOfWeek: number) {
  return (dayOfWeek + 6) % 7;
}

/** timelineDay (So=0…Sa=6) → Index 0=Mo in Wetter-Woche */
function monWeekIndexFromTimelineDay(timelineDayJs: number) {
  return timelineDayJs === 0 ? 6 : timelineDayJs - 1;
}

function isoFromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysToDate(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function weatherOpenWeatherAlt(w: DailyWeatherForecast): string {
  const condDe =
    w.condition === "RAIN"
      ? "Regen"
      : w.condition === "SNOW"
        ? "Schnee"
        : w.condition === "CLEAR"
          ? "klarer Himmel"
          : w.condition === "CLOUDS"
            ? "bewölkt"
            : "wechselhaft";
  return `Wetter-Symbol OpenWeather (${w.openWeatherMain}, ${condDe}, ${Math.round(w.maxTempC)}°C) – VREMA Planung und Schichten`;
}

function weatherIconForDay(day: DailyWeatherForecast | null, className: string) {
  if (!day) return <HelpCircle className={className} aria-hidden />;
  if (day.condition === "RAIN" || day.condition === "SNOW") return <CloudRain className={className} aria-hidden />;
  if (day.condition === "CLEAR") return <Sun className={className} aria-hidden />;
  if (day.condition === "CLOUDS") return <Cloud className={className} aria-hidden />;
  return <CloudSun className={className} aria-hidden />;
}

function dateForCycleDay(weekIndex: number, dayOfWeek: number) {
  return dateForPlannerCycleDay(weekIndex as 1 | 2 | 3, dayOfWeek);
}

function getRoleTimelineSegmentTone(role?: string | null) {
  const inset =
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]";
  if (role === "MANAGER")
    return `${inset} border-brand/40 bg-gradient-to-b from-brand/35 to-brand/22 text-brand dark:from-brand/45 dark:to-brand/25 dark:text-brand-foreground`;
  if (role === "COMPANY_OWNER")
    return `${inset} border-warning/35 bg-gradient-to-b from-warning/30 to-warning/18 text-warning-foreground`;
  if (role === "SUPER_ADMIN")
    return `${inset} border-line bg-surface-muted/95 text-fg-muted dark:border-white/10 dark:bg-surface-muted/55`;
  return `${inset} border-brand/38 bg-gradient-to-b from-brand/40 to-brand/22 text-brand dark:from-brand/48 dark:to-brand/25 dark:text-brand-foreground`;
}

function simplePlannerDayState(params: {
  dayIdx: number;
  usedDays: Set<number>;
  vacationDays: Set<number>;
  sickDays: Set<number>;
}): { tone: StatusTone; label: string; cellClass: string } {
  const { dayIdx, usedDays, vacationDays, sickDays } = params;
  if (sickDays.has(dayIdx)) {
    return {
      tone: "danger",
      label: "Krank",
      cellClass:
        "border-danger/35 bg-danger-soft text-fg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:bg-danger/15 dark:border-white/10 dark:bg-danger/22",
    };
  }
  if (vacationDays.has(dayIdx)) {
    return {
      tone: "warning",
      label: "Urlaub",
      cellClass:
        "border-warning/35 bg-warning-soft text-fg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:bg-warning/15 dark:border-white/10 dark:bg-warning/22",
    };
  }
  if (usedDays.has(dayIdx)) {
    return {
      tone: "brand",
      label: "Schicht",
      cellClass:
        "border-brand/40 bg-gradient-to-b from-brand/30 to-brand/18 text-brand shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:from-brand/38 hover:to-brand/22 dark:border-white/12 dark:from-brand/38 dark:to-brand/22 dark:text-brand-foreground",
    };
  }
  return {
    tone: "neutral",
    label: "Frei",
    cellClass:
      "border-line bg-surface text-fg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)] hover:bg-surface-muted dark:border-white/10 dark:bg-surface/90 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:hover:bg-surface-muted/70",
  };
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
  shiftTemplates = [],
  companyModules = {
    peaks: false,
    plannerWeather: false,
    shiftTrade: true,
    shiftTasks: false,
    autopilot: false,
  },
  shiftCycleWeeks = 1,
  vacationConflictDays,
  unavailableDaysByUserId = {},
  enableTaskListActions = false,
  initialFocusWeek = null,
  initialAutopilotAction = null,
}: {
  members: Member[];
  shifts: ShiftRow[];
  shiftTemplates?: ShiftTemplateRow[];
  companyModules?: CompanyModules;
  shiftCycleWeeks?: 1 | 2 | 3;
  vacationConflictDays?: Array<{ userId: string; dayOfWeek: number; type?: "VACATION" | "SICK" }>;
  /** userId → Wochentage (0–6), an denen die Person als nicht verfügbar markiert ist */
  unavailableDaysByUserId?: Record<string, number[]>;
  /** Manager: Schicht-Checkliste für den sichtbaren Tag im Timeline erzeugen */
  enableTaskListActions?: boolean;
  /** Aus URL `?focusWeek=` (Schichtzyklus 1–3), z. B. vom Sonntags-Wizard. */
  initialFocusWeek?: 1 | 2 | 3 | null;
  /** `?autopilot=1` scrollt zum Panel; `?autopilot=suggest` schlägt einmalig vor (Sonntags-Flow). */
  initialAutopilotAction?: "focus" | "suggest" | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [autopilotBusy, setAutopilotBusy] = useState(false);
  const [autopilotReport, setAutopilotReport] = useState<AutopilotUserReport | null>(null);
  const [selectedUserId, setSelectedUserId] = useState(members[0]?.id ?? "");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [message, setMessage] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    () => shiftTemplates[0]?.id ?? null,
  );
  const [boardAddSheetOpen, setBoardAddSheetOpen] = useState(false);
  const [boardAddDay, setBoardAddDay] = useState<number | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<1 | 2 | 3>(
    initialFocusWeek && initialFocusWeek <= shiftCycleWeeks ? initialFocusWeek : 1,
  );
  const [timelineDate, setTimelineDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [neededStaff, setNeededStaff] = useState(2);
  const timelineDay = useMemo(() => {
    const parsed = new Date(`${timelineDate}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? 1 : parsed.getDay();
  }, [timelineDate]);
  const plannerCycleBounds = useMemo(() => plannerCycleDateBounds(shiftCycleWeeks), [shiftCycleWeeks]);
  const plannerCycleMinIso = isoFromPlannerDate(plannerCycleBounds.startMonday);
  const plannerCycleMaxIso = isoFromPlannerDate(plannerCycleBounds.endSunday);
  const timelinePlanWeekIndex = useMemo(() => {
    const parsed = new Date(`${timelineDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return weekIndexForPlannerDate(parsed, shiftCycleWeeks);
  }, [timelineDate, shiftCycleWeeks]);
  const timelineWeekMonday = useMemo(() => {
    const parsed = new Date(`${timelineDate}T12:00:00`);
    return mondayOfWeekContaining(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
  }, [timelineDate]);
  const timelineWeekRangeLabel = useMemo(
    () => formatPlannerWeekRange(timelineWeekMonday),
    [timelineWeekMonday],
  );
  const timelineWeekMondayIso = useMemo(
    () => isoFromPlannerDate(timelineWeekMonday),
    [timelineWeekMonday],
  );
  const planWeekMonday = useMemo(
    () => mondayOfWeekContaining(dateForPlannerCycleDay(selectedWeekIndex, 1)),
    [selectedWeekIndex],
  );
  const planWeekRangeLabel = useMemo(() => formatPlannerWeekRange(planWeekMonday), [planWeekMonday]);
  const planWeekMondayIso = useMemo(() => isoFromPlannerDate(planWeekMonday), [planWeekMonday]);
  const weekDayDates = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6, 0].map((dow) => isoFromPlannerDate(dateForPlannerCycleDay(selectedWeekIndex, dow))),
    [selectedWeekIndex],
  );
  const canTimelinePrevWeek = useMemo(() => {
    const parsed = new Date(`${timelineDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return false;
    parsed.setDate(parsed.getDate() - 7);
    return weekIndexForPlannerDate(parsed, shiftCycleWeeks) !== null;
  }, [timelineDate, shiftCycleWeeks]);
  const canTimelineNextWeek = useMemo(() => {
    const parsed = new Date(`${timelineDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return false;
    parsed.setDate(parsed.getDate() + 7);
    return weekIndexForPlannerDate(parsed, shiftCycleWeeks) !== null;
  }, [timelineDate, shiftCycleWeeks]);
  const shiftTimelineWeek = (delta: -1 | 1) => {
    const parsed = new Date(`${timelineDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    parsed.setDate(parsed.getDate() + delta * 7);
    const week = weekIndexForPlannerDate(parsed, shiftCycleWeeks);
    if (!week) {
      setMessage(
        delta < 0
          ? "Das ist bereits die erste Planwoche in deinem Zyklus."
          : "Das ist bereits die letzte Planwoche in deinem Zyklus.",
      );
      return;
    }
    setTimelineDate(isoFromPlannerDate(parsed));
    setSelectedWeekIndex(week);
    setMessage(null);
  };
  const onTimelineDateInput = (iso: string) => {
    setTimelineDate(iso);
    const parsed = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    const week = weekIndexForPlannerDate(parsed, shiftCycleWeeks);
    if (week) {
      setSelectedWeekIndex(week);
      setMessage(null);
    } else {
      setMessage(
        `Datum außerhalb des ${shiftCycleWeeks}-Wochen-Zyklus — bitte zwischen ${plannerCycleMinIso} und ${plannerCycleMaxIso} wählen.`,
      );
    }
  };
  const goTimelineToday = () => {
    const today = new Date();
    const week = weekIndexForPlannerDate(today, shiftCycleWeeks);
    if (!week) {
      setMessage("Heute liegt außerhalb des aktuellen Plan-Zyklus.");
      return;
    }
    setTimelineDate(isoFromPlannerDate(today));
    setSelectedWeekIndex(week);
    setMessage(null);
  };
  const [coverageSlotMinutes] = useState<60>(60);
  const [dragDraft, setDragDraft] = useState<{
    userId: string;
    startMinute: number;
    endMinute: number;
  } | null>(null);
  const [shiftEdit, setShiftEdit] = useState<{
    userId: string;
    shiftId?: string;
    dayOfWeek: number;
    label: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const dragDraftRef = useRef<{ userId: string; startMinute: number; endMinute: number } | null>(null);
  const dragSnapshotRef = useRef<{ start: number; end: number } | null>(null);
  const shiftsRef = useRef(shifts);
  shiftsRef.current = shifts;
  const [hiddenShiftIds, setHiddenShiftIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setHiddenShiftIds(new Set());
  }, [shifts]);
  const displayShifts = useMemo(
    () => shifts.filter((s) => !hiddenShiftIds.has(s.id)),
    [shifts, hiddenShiftIds],
  );

  /** Nur API-Route — vermeidet POST-500 auf /dashboard/planning (Server Action). */
  const removeShiftViaApi = async (
    shiftId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await fetch("/api/dashboard/planning/remove-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId }),
        credentials: "same-origin",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) return { ok: true };
      return { ok: false, error: data.error ?? "Schicht konnte nicht entfernt werden." };
    } catch {
      return { ok: false, error: "Schicht konnte nicht entfernt werden. Bitte erneut versuchen." };
    }
  };
  const [activeDrag, setActiveDrag] = useState<{
    userId: string;
    mode: "create" | "move" | "resize-start" | "resize-end";
    anchorMinute: number;
    originStartMinute: number;
    originEndMinute: number;
    laneLeft: number;
    laneWidth: number;
    pointerId: number;
  } | null>(null);
  const [recentDayAction, setRecentDayAction] = useState<{ dayOfWeek: number; action: "saved" | "deleted" } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    shiftId: string;
    userId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakDuration: number;
    occurrenceDateIso: string;
  } | null>(null);
  const [contextMenuIndex, setContextMenuIndex] = useState(0);
  const [flashAssignedKey, setFlashAssignedKey] = useState<string | null>(null);
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [timelineFocusedUserId, setTimelineFocusedUserId] = useState<string | null>(null);
  const [copiedShift, setCopiedShift] = useState<{ startTime: string; endTime: string; breakDuration: number } | null>(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkAnchor, setBulkAnchor] = useState<{ userId: string; absoluteStart: number } | null>(null);
  const [bulkUndo, setBulkUndo] = useState<{
    label: string;
    items: Array<{ userId: string; weekIndex: number; dayOfWeek: number; startTime: string; endTime: string; breakDuration: number }>;
  } | null>(null);
  const [bulkUndoDeadlineMs, setBulkUndoDeadlineMs] = useState<number | null>(null);
  const [undoNowMs, setUndoNowMs] = useState(() => Date.now());
  const [weatherWeek, setWeatherWeek] = useState<Array<DailyWeatherForecast | null>>([]);
  const weatherWeekHasData = useMemo(() => weatherWeek.some((d) => d != null), [weatherWeek]);
  const [weatherMondayIso, setWeatherMondayIso] = useState<string | null>(null);
  const [weatherFetchErr, setWeatherFetchErr] = useState<string | null>(null);
  const [staffingHints, setStaffingHints] = useState<PlannerStaffingHint[]>([]);
  const [costPeakFocusDay, setCostPeakFocusDay] = useState<number | null>(null);
  const [gapSuggestions, setGapSuggestions] = useState<
    Array<{ userId: string; name: string; role: string; reason: string; startTime: string; endTime: string }>
  >([]);
  /** Mobil: „+“ öffnet Bottom-Sheet statt nur Mini-Zellen. */
  const [simpleAddSheetOpen, setSimpleAddSheetOpen] = useState(false);
  const [simpleSheetDay, setSimpleSheetDay] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [showPlannerInfo, setShowPlannerInfo] = useState(false);
  /** Desktop Einfach-/Timeline: ausführliche Hilfe hinter (i), Standard schlank. */
  const [desktopPlannerHelpOpen, setDesktopPlannerHelpOpen] = useState(false);
  /** Leitungs-Statuszeile: Fußnote zu Lücken/Ruhezeit optional. */
  const [planStatusMetricsHelpOpen, setPlanStatusMetricsHelpOpen] = useState(false);
  const [memberSaldoById, setMemberSaldoById] = useState<Record<string, MemberSaldoSnapshot>>({});
  const [overtimeFilterOnly, setOvertimeFilterOnly] = useState(false);
  const [overtimePopover, setOvertimePopover] = useState<{ userId: string; rect: DOMRect } | null>(null);
  const [assignmentGuard, setAssignmentGuard] = useState<{
    userId: string;
    slot: BoardShiftSlot;
    risk: AssignmentRisk;
    alternative: { userId: string; name: string; saldoHours: number } | null;
  } | null>(null);
  const [showMobilePlannerInfo, setShowMobilePlannerInfo] = useState(false);
  const [mobileSelectedDay, setMobileSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return Number.isNaN(d) ? 1 : d;
  });
  const [mobileMemberPickerOpen, setMobileMemberPickerOpen] = useState(false);
  const [mobileStartPickerOpen, setMobileStartPickerOpen] = useState(false);
  const [mobileEndPickerOpen, setMobileEndPickerOpen] = useState(false);
  const [mobileStartPickerCustom, setMobileStartPickerCustom] = useState(false);
  const [mobileEndPickerCustom, setMobileEndPickerCustom] = useState(false);
  /** Mobil: Native-AI-Schnellvorschlag bei leerem Tag */
  const [aiQuickOpen, setAiQuickOpen] = useState(false);
  const [aiQuickLoading, setAiQuickLoading] = useState(false);
  const [aiQuickRows, setAiQuickRows] = useState<PlannerQuickSuggestRow[]>([]);
  const [aiQuickError, setAiQuickError] = useState<string | null>(null);
  const mobileSwipeStartXRef = useRef<number | null>(null);
  const mobileDayLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileDayLongPressFiredRef = useRef(false);
  /**
   * Desktop-Baum (Tabs + Timeline) nur bei echtem Desktop: breit **und** feiner Zeiger.
   * Verhindert u. a. iPhone „Desktop-Website“ / falsche Viewport-Breite → ohne Timeline-DOM auf Touch.
   */
  const [renderDesktopTree, setRenderDesktopTree] = useState(false);


  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      const desktop = mq.matches;
      setRenderDesktopTree(desktop);
      if (!desktop) setShiftEdit(null);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const focusWeekParam = Number(params.get("focusWeek"));
    if (
      Number.isInteger(focusWeekParam) &&
      focusWeekParam >= 1 &&
      focusWeekParam <= shiftCycleWeeks
    ) {
      const w = focusWeekParam as 1 | 2 | 3;
      setSelectedWeekIndex(w);
      setMessage(`Planungsfokus: Schichtzyklus Woche ${w}.`);
    }

    if (params.get("focus") !== "cost-peak") return;
    const weekParam = Number(params.get("week"));
    const targetWeek: 1 | 2 | 3 =
      weekParam === 2 ? 2 : weekParam === 3 ? 3 : 1;
    setSelectedWeekIndex(targetWeek);
    const dayParam = Number(params.get("day"));
    if (Number.isInteger(dayParam) && dayParam >= 0 && dayParam <= 6) {
      setCostPeakFocusDay(dayParam);
      const d = dateForCycleDay(targetWeek, dayParam);
      setTimelineDate(isoFromDate(d));
    }
    setMessage("Kosten-Peak-Fokus: teure Schichten im Plan markiert (Wochenansicht).");
  }, [shiftCycleWeeks]);

  useEffect(() => {
    if (!mobileStartPickerOpen) setMobileStartPickerCustom(false);
  }, [mobileStartPickerOpen]);

  useEffect(() => {
    if (!mobileEndPickerOpen) setMobileEndPickerCustom(false);
  }, [mobileEndPickerOpen]);

  useEffect(() => {
    if (!companyModules.plannerWeather) {
      setWeatherWeek([]);
      setWeatherMondayIso(null);
      setWeatherFetchErr(null);
      return;
    }
    const anchor = planWeekMondayIso;
    let cancelled = false;
    setWeatherFetchErr(null);
    fetch(`/api/planning/weather?anchorDate=${encodeURIComponent(anchor)}`)
      .then((r) => r.json())
      .then((data: { week?: Array<DailyWeatherForecast | null>; mondayIso?: string; error?: string | null }) => {
        if (cancelled) return;
        if (data.error === "no_location") {
          setWeatherFetchErr("Für Wetter bitte PLZ oder Ort in den Einstellungen hinterlegen.");
          setWeatherWeek([]);
          setWeatherMondayIso(null);
          return;
        }
        const week = Array.isArray(data.week) ? data.week : [];
        setWeatherWeek(week);
        setWeatherMondayIso(typeof data.mondayIso === "string" ? data.mondayIso : null);
        if (data.error === "upstream" && week.every((d) => d == null)) {
          setWeatherFetchErr("Wetter gerade nicht verfügbar — bitte später erneut öffnen.");
        } else if (week.some((d) => d != null)) {
          setWeatherFetchErr(null);
        }
      })
      .catch(() => {
        if (!cancelled) setWeatherFetchErr("Wetter gerade nicht verfügbar – bitte später erneut öffnen.");
      });
    return () => {
      cancelled = true;
    };
  }, [planWeekMondayIso, companyModules.plannerWeather]);

  useEffect(() => {
    if (!companyModules.peaks) {
      setStaffingHints([]);
      return;
    }
    let cancelled = false;
    getPlannerStaffingHints(selectedWeekIndex)
      .then((rows) => {
        if (!cancelled) setStaffingHints(rows);
      })
      .catch(() => {
        if (!cancelled) setStaffingHints([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedWeekIndex, companyModules.peaks]);

  const staffingHintByDay = useMemo(() => {
    const m = new Map<number, PlannerStaffingHint>();
    for (const h of staffingHints) m.set(h.dayOfWeek, h);
    return m;
  }, [staffingHints]);

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
  const unavailableForSelected = useMemo(
    () => new Set(unavailableDaysByUserId[selectedUserId] ?? []),
    [selectedUserId, unavailableDaysByUserId],
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
    return end === start;
  }, [startTime, endTime]);
  const crossesMidnight = useMemo(() => {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start === null || end === null) return false;
    return end < start;
  }, [startTime, endTime]);
  const plannedDaysCount = useMemo(() => userPrimaryShiftByDay.size, [userPrimaryShiftByDay]);
  const missingWeekdays = useMemo(
    () => [1, 2, 3, 4, 5].filter((d) => !userPrimaryShiftByDay.has(d)).map((d) => DAY_LABELS[d]),
    [userPrimaryShiftByDay]
  );
  const weeklyMinutes = useMemo(
    () =>
      userShifts.reduce((sum, shift) => {
        return sum + shiftDurationMinutes(shift.startTime, shift.endTime);
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

  useEffect(() => {
    if (members.length === 0) {
      setMemberSaldoById({});
      return;
    }
    let cancelled = false;
    void getPlannerBoardMemberSaldos(members.map((m) => m.id)).then((map) => {
      if (!cancelled) setMemberSaldoById(map);
    });
    return () => {
      cancelled = true;
    };
  }, [members]);

  const saldoMap = useMemo(() => new Map(Object.entries(memberSaldoById)), [memberSaldoById]);

  const criticalOvertimeCount = useMemo(
    () => countCriticalOvertimeMembers(saldoMap),
    [saldoMap],
  );

  const draftShiftsInWeek = useMemo(
    () => shifts.filter((s) => s.weekIndex === selectedWeekIndex && s.isDraft),
    [shifts, selectedWeekIndex]
  );
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
  const timelineHasShifts = useMemo(
    () =>
      members.some((m) => shiftByUserAndDay.has(`${m.id}-${selectedWeekIndex}-${timelineDay}`)),
    [members, shiftByUserAndDay, selectedWeekIndex, timelineDay],
  );
  const timelineRows = useMemo(() => {
    const previousDay = (timelineDay + 6) % 7;
    return members.map((m) => {
      const shift = shiftByUserAndDay.get(`${m.id}-${selectedWeekIndex}-${timelineDay}`);
      const previousShift = shiftByUserAndDay.get(`${m.id}-${selectedWeekIndex}-${previousDay}`);
      const conflict = conflictTypeByCell.get(`${m.id}-${timelineDay}`);
      return { member: m, shift, previousShift, conflict };
    });
  }, [members, shiftByUserAndDay, conflictTypeByCell, timelineDay, selectedWeekIndex]);
  const timelineWxDay = useMemo(() => {
    const idx = monWeekIndexFromTimelineDay(timelineDay);
    return weatherWeek[idx] ?? null;
  }, [timelineDay, weatherWeek]);
  const expensiveShiftIdsByDay = useMemo(() => {
    const byDay = new Map<number, Array<{ id: string; cost: number }>>();
    const wageByUser = new Map(members.map((m) => [m.id, m.hourlyWage ?? null]));
    for (const s of shifts) {
      if (s.weekIndex !== selectedWeekIndex) continue;
      const wage = wageByUser.get(s.userId);
      if (!wage || wage <= 0) continue;
      const cost = (shiftNetDurationMinutes(s.startTime, s.endTime, s.breakDuration ?? 0) / 60) * wage;
      const arr = byDay.get(s.dayOfWeek) ?? [];
      arr.push({ id: s.id, cost });
      byDay.set(s.dayOfWeek, arr);
    }
    const out = new Map<number, Set<string>>();
    for (const [day, items] of byDay) {
      if (items.length === 0) {
        out.set(day, new Set());
        continue;
      }
      const avg = items.reduce((sum, i) => sum + i.cost, 0) / items.length;
      out.set(
        day,
        new Set(items.filter((i) => i.cost > avg * 1.2).map((i) => i.id))
      );
    }
    return out;
  }, [members, shifts, selectedWeekIndex]);
  const mobileWxDay = useMemo(() => {
    const idx = monWeekIndexFromTimelineDay(mobileSelectedDay);
    return weatherWeek[idx] ?? null;
  }, [mobileSelectedDay, weatherWeek]);
  const complianceByShiftId = useMemo(
    () => buildComplianceFlagsByShiftId(shifts, selectedWeekIndex),
    [shifts, selectedWeekIndex]
  );
  const weekCoverageGapSlots = useMemo(() => {
    const shiftRows: ShiftPlanRow[] = shifts
      .filter((s) => s.weekIndex === selectedWeekIndex && !s.isDraft)
      .map((s) => ({
        id: s.id,
        userId: s.userId,
        weekIndex: s.weekIndex,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
    return countWeekCoverageGapSlots({
      members,
      shifts: shiftRows,
      selectedWeekIndex,
      conflictEntries: vacationConflictDays ?? [],
      neededStaff,
      coverageSlotMinutes,
    });
  }, [
    shifts,
    selectedWeekIndex,
    members,
    vacationConflictDays,
    neededStaff,
    coverageSlotMinutes,
  ]);
  const weekMaxCoverageGapSlots = useMemo(
    () => maxWeekCoverageSlots(coverageSlotMinutes),
    [coverageSlotMinutes],
  );
  const weekCoverageGapFillRatio = useMemo(() => {
    if (weekMaxCoverageGapSlots <= 0) return 1;
    return Math.max(0, Math.min(1, 1 - weekCoverageGapSlots / weekMaxCoverageGapSlots));
  }, [weekCoverageGapSlots, weekMaxCoverageGapSlots]);
  const restRiskShiftCount = useMemo(() => {
    let n = 0;
    for (const s of shifts) {
      if (s.weekIndex !== selectedWeekIndex || s.isDraft) continue;
      if (complianceByShiftId.get(s.id)?.restRisk) n += 1;
    }
    return n;
  }, [shifts, selectedWeekIndex, complianceByShiftId]);
  const mobileDayShifts = useMemo(() => {
    return shifts
      .filter((s) => s.weekIndex === selectedWeekIndex && s.dayOfWeek === mobileSelectedDay)
      .slice()
      .sort((a, b) => {
        const aStart = toMinutes(a.startTime) ?? 0;
        const bStart = toMinutes(b.startTime) ?? 0;
        if (aStart !== bStart) return aStart - bStart;
        return (members.find((m) => m.id === a.userId)?.name ?? "").localeCompare(
          members.find((m) => m.id === b.userId)?.name ?? "",
          "de-DE"
        );
      });
  }, [shifts, selectedWeekIndex, mobileSelectedDay, members]);
  const mobileOrderedDays = useMemo(() => [1, 2, 3, 4, 5, 6, 0] as const, []);
  const plannedPayrollWeek = useMemo(() => {
    let euro = 0;
    let coveredMinutes = 0;
    let totalMinutesAll = 0;
    for (const s of shifts) {
      if (s.weekIndex !== selectedWeekIndex) continue;
      const dur = shiftNetDurationMinutes(s.startTime, s.endTime, s.breakDuration ?? 0);
      totalMinutesAll += dur;
      const wage = members.find((m) => m.id === s.userId)?.hourlyWage;
      if (wage != null && wage > 0) {
        euro += (dur / 60) * wage;
        coveredMinutes += dur;
      }
    }
    return { euro, coveredMinutes, totalMinutesAll };
  }, [shifts, selectedWeekIndex, members]);
  const companyDefaultShift = useMemo(() => {
    const counts = new Map<string, { startTime: string; endTime: string; count: number }>();
    for (const shift of shifts) {
      const key = shiftKey(shift.startTime, shift.endTime);
      const current = counts.get(key);
      if (current) current.count += 1;
      else counts.set(key, { startTime: shift.startTime, endTime: shift.endTime, count: 1 });
    }
    const best = Array.from(counts.values()).sort((a, b) => b.count - a.count)[0];
    return best ? { startTime: best.startTime, endTime: best.endTime } : { startTime: "09:00", endTime: "17:00" };
  }, [shifts]);
  const lastUsedShiftByUser = useMemo(() => {
    const map = new Map<string, { startTime: string; endTime: string; weekIndex: number; dayOfWeek: number }>();
    for (const shift of shifts) {
      const existing = map.get(shift.userId);
      if (
        !existing ||
        shift.weekIndex > existing.weekIndex ||
        (shift.weekIndex === existing.weekIndex && shift.dayOfWeek >= existing.dayOfWeek)
      ) {
        map.set(shift.userId, {
          startTime: shift.startTime,
          endTime: shift.endTime,
          weekIndex: shift.weekIndex,
          dayOfWeek: shift.dayOfWeek,
        });
      }
    }
    return map;
  }, [shifts]);
  const getSuggestedShiftForUser = (userId: string) => {
    const last = lastUsedShiftByUser.get(userId);
    if (last) return { startTime: last.startTime, endTime: last.endTime };
    return companyDefaultShift;
  };
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
        if (row.conflict) continue;
        const segments: Array<{ start: number; end: number }> = [];
        if (row.previousShift) {
          const prevStart = toMinutes(row.previousShift.startTime);
          const prevEnd = toMinutes(row.previousShift.endTime);
          if (prevStart !== null && prevEnd !== null && prevEnd < prevStart) {
            segments.push({ start: 0, end: prevEnd });
          }
        }
        if (row.shift) {
          const start = toMinutes(row.shift.startTime);
          const end = toMinutes(row.shift.endTime);
          if (start !== null && end !== null) {
            if (end > start) segments.push({ start, end });
            if (end < start) segments.push({ start, end: 24 * 60 });
          }
        }
        if (segments.some((segment) => segment.start < slotEnd && segment.end > slotStart)) assigned += 1;
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
  const firstGapWindow = useMemo(() => {
    const idx = timelineCoverage.findIndex((slot) => slot.isGap);
    if (idx < 0) return null;
    const slotStart = TIMELINE_START_HOUR * 60 + idx * coverageSlotMinutes;
    const slotEnd = Math.min(TIMELINE_END_HOUR * 60, slotStart + coverageSlotMinutes);
    return {
      startMinutes: slotStart,
      label: `${minutesToHHMM(slotStart)}–${minutesToHHMM(slotEnd)}`,
    };
  }, [timelineCoverage, coverageSlotMinutes]);
  /** Stunden-Grenzen 06:00 … 24:00 — aligned mit TIMELINE_GRID_STYLE. */
  const hourLinePercents = useMemo(
    () => Array.from({ length: TIMELINE_SLOT_COUNT + 1 }, (_, i) => (i / TIMELINE_SLOT_COUNT) * 100),
    [],
  );
  const selectedShifts = useMemo(
    () => shifts.filter((s) => selectedShiftIds.includes(s.id)),
    [shifts, selectedShiftIds]
  );

  useEffect(() => {
    if (!bulkUndo) return;
    const t = window.setTimeout(() => setBulkUndo(null), 5000);
    return () => window.clearTimeout(t);
  }, [bulkUndo]);

  useEffect(() => {
    if (!bulkUndo) return;
    const t = window.setInterval(() => setUndoNowMs(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [bulkUndo]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    const onKey = (e: KeyboardEvent) => {
      const itemCount = enableTaskListActions ? 5 : 4;
      if (e.key === "Escape") {
        setContextMenu(null);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setContextMenuIndex((v) => (v + 1) % itemCount);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setContextMenuIndex((v) => (v - 1 + itemCount) % itemCount);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const idx = contextMenuIndex;
        if (idx === 0) {
          const nextDay = (contextMenu.dayOfWeek + 1) % 7;
          startTransition(async () => {
            await setShiftForDay({
              userId: contextMenu.userId,
              weekIndex: selectedWeekIndex,
              dayOfWeek: nextDay,
              startTime: contextMenu.startTime,
              endTime: contextMenu.endTime,
              breakDuration: contextMenu.breakDuration,
            });
          });
        }
        if (idx === 1) {
          startTransition(async () => {
            await toggleShiftTradeOffer(contextMenu.shiftId, true);
          });
        }
        if (idx === 2) {
          startTransition(async () => {
            await setShiftBreakDuration(contextMenu.shiftId, 30);
          });
        }
        if (idx === 3) {
          startTransition(async () => {
            await setShiftBreakDuration(contextMenu.shiftId, 45);
          });
        }
        if (idx === 4 && enableTaskListActions) {
          startTransition(async () => {
            await generateTaskListForShift(contextMenu.shiftId, contextMenu.occurrenceDateIso);
          });
        }
        setContextMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contextMenu, contextMenuIndex, selectedWeekIndex, enableTaskListActions]);

  useEffect(() => {
    if (!renderDesktopTree) return;
    const onKey = (e: KeyboardEvent) => {
      const accel = e.metaKey || e.ctrlKey;
      if (!accel) {
        if (e.key === "Escape") {
          setSelectedShiftIds([]);
          setBulkMenuOpen(false);
          return;
        }
        if ((e.key === "Delete" || e.key === "Backspace") && selectedShiftIds.length > 0) {
          const targets = shifts.filter((s) => selectedShiftIds.includes(s.id));
          const undoItems = targets.map((s) => ({
            userId: s.userId,
            weekIndex: s.weekIndex,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            breakDuration: s.breakDuration ?? 0,
          }));
          startTransition(async () => {
            const results = await Promise.allSettled(
              targets.map((s) => clearShiftForDay({ userId: s.userId, weekIndex: s.weekIndex, dayOfWeek: s.dayOfWeek }))
            );
            const failed = results.filter((r) => r.status === "rejected").length;
            if (failed > 0) {
              setMessage(
                failed === targets.length
                  ? "Schichten konnten nicht gelöscht werden. Bitte erneut versuchen."
                  : `${failed} von ${targets.length} Schichten konnten nicht gelöscht werden.`
              );
            } else {
              router.refresh();
            }
          });
          setBulkUndo({ label: "Schichten gelöscht", items: undoItems });
          setBulkUndoDeadlineMs(Date.now() + 5000);
          setSelectedShiftIds([]);
          setBulkMenuOpen(false);
          e.preventDefault();
        }
        if ((e.key === "m" || e.key === "M") && selectedShiftIds.length > 0) {
          setBulkMenuOpen(true);
          e.preventDefault();
        }
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "c") {
        if (selectedShifts.length === 0) return;
        const first = selectedShifts[0];
        setCopiedShift({
          startTime: first.startTime,
          endTime: first.endTime,
          breakDuration: first.breakDuration ?? 0,
        });
        setMessage("Schicht kopiert.");
        e.preventDefault();
      }
      if (key === "v") {
        if (!copiedShift || !timelineFocusedUserId) return;
        startTransition(async () => {
        await setShiftForDay({
          userId: timelineFocusedUserId,
          weekIndex: selectedWeekIndex,
          dayOfWeek: timelineDay,
          startTime: copiedShift.startTime,
          endTime: copiedShift.endTime,
          breakDuration: copiedShift.breakDuration,
        });
          router.refresh();
        });
        setFlashAssignedKey(`${timelineFocusedUserId}-${timelineDay}`);
        window.setTimeout(() => setFlashAssignedKey(null), 1200);
        setMessage("Schicht eingefügt.");
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    renderDesktopTree,
    shifts,
    selectedShiftIds,
    copiedShift,
    timelineFocusedUserId,
    selectedShifts,
    selectedWeekIndex,
    timelineDay,
  ]);

  const saveTimelineShift = (userId: string, startMinute: number, endMinute: number) => {
    const conflict = conflictTypeByCell.get(`${userId}-${timelineDay}`);
    if (conflict) {
      setMessage(`Schicht blockiert: ${conflict === "SICK" ? "Krank" : "Urlaub"}.`);
      return;
    }
    const existingShift = shiftsRef.current.find(
      (s) =>
        s.userId === userId &&
        s.weekIndex === selectedWeekIndex &&
        s.dayOfWeek === timelineDay &&
        !s.isDraft,
    );
    const breakDuration = existingShift?.breakDuration ?? 0;
    const clampedStart = Math.max(TIMELINE_START_HOUR * 60, Math.min(endMinute - TIMELINE_SNAP_MINUTES, startMinute));
    const maxEndMinute = TIMELINE_END_HOUR * 60 - TIMELINE_SNAP_MINUTES;
    const clampedEnd = Math.min(maxEndMinute, Math.max(startMinute + TIMELINE_SNAP_MINUTES, endMinute));
    const snappedStart = snapMinutes(clampedStart);
    const snappedEnd = Math.min(
      maxEndMinute,
      Math.max(snappedStart + TIMELINE_SNAP_MINUTES, snapMinutes(clampedEnd)),
    );
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
          breakDuration,
        });
        setMessage(`Schicht gesetzt: ${DAY_LABELS[timelineDay]} (${startTimeValue}-${endTimeValue}).`);
        router.refresh();
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Speichern fehlgeschlagen."));
      }
    });
  };

  const suggestAutofillForFirstGap = () => {
    if (!firstGapWindow) return;
    const slotStart = firstGapWindow.startMinutes;
    const slotEnd = Math.min(TIMELINE_END_HOUR * 60, slotStart + coverageSlotMinutes);
    const roleWeight: Record<string, number> = {
      EMPLOYEE: 3,
      MANAGER: 2,
      COMPANY_OWNER: 1,
      SUPER_ADMIN: 0,
    };

    const suggestions = members
      .map((m) => {
        const shift = shiftByUserAndDay.get(`${m.id}-${selectedWeekIndex}-${timelineDay}`);
        const prevShift = shiftByUserAndDay.get(`${m.id}-${selectedWeekIndex}-${(timelineDay + 6) % 7}`);
        const conflict = conflictTypeByCell.get(`${m.id}-${timelineDay}`);
        if (conflict) return null;

        const start = shift ? toMinutes(shift.startTime) : null;
        const end = shift ? toMinutes(shift.endTime) : null;
        const coversGap = start !== null && end !== null && start < slotEnd && (end > start ? end : TIMELINE_END_HOUR * 60) > slotStart;
        if (coversGap) return null;

        let restOk = true;
        if (prevShift) {
          const ps = toMinutes(prevShift.startTime);
          const pe = toMinutes(prevShift.endTime);
          if (ps !== null && pe !== null) {
            const prevEnd = pe < ps ? pe : pe;
            const gapToSlot = slotStart - prevEnd;
            restOk = gapToSlot >= 11 * 60;
          }
        }
        const role = m.role ?? "EMPLOYEE";
        const weeklyTarget = Math.max(0, Math.round((m.weeklyHours ?? 40) * 60));
        const weeklyIst = shifts
          .filter((s) => s.userId === m.id && s.weekIndex === selectedWeekIndex)
          .reduce((sum, s) => sum + shiftNetDurationMinutes(s.startTime, s.endTime, s.breakDuration ?? 0), 0);
        const deficit = Math.max(0, weeklyTarget - weeklyIst);
        const score = (restOk ? 10 : 0) + (roleWeight[role] ?? 0) + deficit / 60;
        const reason = restOk
          ? `Rolle: ${role}, Defizit: ${(deficit / 60).toFixed(1)}h`
          : `Rolle: ${role}, Ruhezeit prüfen, Defizit: ${(deficit / 60).toFixed(1)}h`;
        return {
          userId: m.id,
          name: m.name ?? m.email,
          role,
          reason,
          score,
          startTime: minutesToHHMM(slotStart),
          endTime: minutesToHHMM(slotEnd),
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ score: _score, ...rest }) => rest);

    setGapSuggestions(suggestions);
  };

  const beginTimelineDrag = (
    clientX: number,
    laneEl: HTMLElement,
    userId: string,
    mode: "create" | "move" | "resize-start" | "resize-end",
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
    const suggestion = getSuggestedShiftForUser(userId);
    const suggestionStart = toMinutes(suggestion.startTime);
    const suggestionEnd = toMinutes(suggestion.endTime);
    const suggestionDuration =
      suggestionStart !== null && suggestionEnd !== null
        ? shiftDurationMinutes(suggestion.startTime, suggestion.endTime)
        : 8 * 60;
    const defaultEnd = originEndMinute ?? Math.min(TIMELINE_END_HOUR * 60, defaultStart + suggestionDuration);
    const initialDraft =
      mode === "create"
        ? { userId, startMinute: minuteAtPointer, endMinute: minuteAtPointer + TIMELINE_SNAP_MINUTES }
        : { userId, startMinute: defaultStart, endMinute: defaultEnd };
    dragSnapshotRef.current = mode !== "create" ? { start: defaultStart, end: defaultEnd } : null;

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
      } else if (activeDrag.mode === "move") {
        const duration = activeDrag.originEndMinute - activeDrag.originStartMinute;
        const delta = pointerMinute - activeDrag.anchorMinute;
        const rawStart = activeDrag.originStartMinute + delta;
        const clampedStart = Math.max(TIMELINE_START_HOUR * 60, Math.min(TIMELINE_END_HOUR * 60 - duration, rawStart));
        next = {
          userId: activeDrag.userId,
          startMinute: clampedStart,
          endMinute: clampedStart + duration,
        };
      } else if (activeDrag.mode === "resize-start") {
        const maxStart = activeDrag.originEndMinute - TIMELINE_SNAP_MINUTES;
        const clampedStart = Math.max(TIMELINE_START_HOUR * 60, Math.min(maxStart, pointerMinute));
        next = {
          userId: activeDrag.userId,
          startMinute: clampedStart,
          endMinute: activeDrag.originEndMinute,
        };
      } else {
        const minEnd = activeDrag.originStartMinute + TIMELINE_SNAP_MINUTES;
        const clampedEnd = Math.min(TIMELINE_END_HOUR * 60, Math.max(minEnd, pointerMinute));
        next = {
          userId: activeDrag.userId,
          startMinute: activeDrag.originStartMinute,
          endMinute: clampedEnd,
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
        const unchangedCreate =
          activeDrag.mode === "create" &&
          draft.endMinute - draft.startMinute <= TIMELINE_SNAP_MINUTES;
        const unchangedMove =
          activeDrag.mode === "move" &&
          snap &&
          draft.startMinute === snap.start &&
          draft.endMinute === snap.end;
        const unchangedResize =
          (activeDrag.mode === "resize-start" || activeDrag.mode === "resize-end") &&
          snap &&
          draft.startMinute === snap.start &&
          draft.endMinute === snap.end;
        if (unchangedMove || unchangedCreate) {
          const member = members.find((m) => m.id === activeDrag.userId);
          const suggested = getSuggestedShiftForUser(activeDrag.userId);
          setShiftEdit({
            userId: activeDrag.userId,
            dayOfWeek: timelineDay,
            label: member?.name ?? member?.email ?? "Mitarbeiter",
            startTime: unchangedCreate ? suggested.startTime : minutesToHHMM(draft.startMinute),
            endTime: unchangedCreate ? suggested.endTime : minutesToHHMM(draft.endMinute),
          });
        } else if (!unchangedResize) {
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
      setMessage("Start- und Endzeit dürfen nicht identisch sein.");
      return;
    }
    if (selectedUserVacationDays.has(dayOfWeek)) {
      const proceed = window.confirm(
        `${DAY_LABELS[dayOfWeek]} liegt in einem genehmigten Urlaubszeitraum. Trotzdem Schicht speichern?`
      );
      if (!proceed) return;
    }
    if (unavailableForSelected.has(dayOfWeek)) {
      const proceed = window.confirm(
        `${selectedMember?.name ?? "Diese Person"} hat ${DAY_LABELS[dayOfWeek]} als nicht verfügbar markiert. Trotzdem einplanen?`
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
          router.refresh();
          return;
        }
        await setShiftForDay({ userId: selectedUserId, weekIndex: selectedWeekIndex, dayOfWeek, startTime, endTime });
        setMessage(`Schicht für ${DAY_LABELS[dayOfWeek]} gesetzt (${startTime}-${endTime}).`);
        setRecentDayAction({ dayOfWeek, action: "saved" });
        router.refresh();
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Speichern fehlgeschlagen."));
      }
    });
  };

  const submitStandardWeek = () => {
    if (!selectedUserId) return;
    if (hasInvalidRange) {
      setMessage("Start- und Endzeit dürfen nicht identisch sein.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        await applyStandardWeek({ userId: selectedUserId, weekIndex: selectedWeekIndex, startTime, endTime });
        setMessage("Standardwoche (Mo-Fr) gespeichert.");
        router.refresh();
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Speichern fehlgeschlagen."));
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
        router.refresh();
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Übertragen fehlgeschlagen."));
      }
    });
  };

  const startAutopilot = () => {
    setAutopilotReport(null);
    setMessage(null);
    setAutopilotBusy(true);
    startTransition(async () => {
      try {
        const anchor =
          new Date();
        const planableCount = members.filter(
          (m) => m.role === "EMPLOYEE" || m.role === "MANAGER",
        ).length;
        const slotTemplates =
          planableCount <= 2
            ? [{ startTime, endTime, breakDuration: 30 }]
            : [
                { startTime, endTime, breakDuration: 30 },
                { startTime: "14:00", endTime: "22:00", breakDuration: 30 },
              ];
        const result = await runAutopilotDraft(selectedWeekIndex, {
          slotTemplates,
          coveragePerDay: planableCount <= 2 ? 1 : Math.min(2, Math.max(1, neededStaff)),
          anchorDate: anchor,
        });
        setAutopilotReport(result.report);
        if (result.shiftsCreated === 0 && result.unfilled.length === 0) {
          setMessage(result.report.headline);
        }
        router.refresh();
      } catch (e: unknown) {
        setAutopilotReport(null);
        setMessage(userErrorMessage(e, "Autopilot fehlgeschlagen."));
      } finally {
        setAutopilotBusy(false);
      }
    });
  };

  const confirmAutopilot = () => {
    if (
      !window.confirm(
        `${draftShiftsInWeek.length} Entwurf${draftShiftsInWeek.length === 1 ? "" : "e"} veröffentlichen? Danach sieht dein Team den Plan.`,
      )
    )
      return;
    setMessage(null);
    startTransition(async () => {
      try {
        await confirmAutopilotDrafts(selectedWeekIndex);
        setAutopilotReport(null);
        router.refresh();
        setMessage("Plan veröffentlicht — Team wurde benachrichtigt.");
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Freigabe fehlgeschlagen."));
      }
    });
  };

  const discardAutopilot = () => {
    if (!window.confirm("Alle Entwurfs-Schichten dieser Planwoche verwerfen?")) return;
    setMessage(null);
    startTransition(async () => {
      try {
        await discardAutopilotDrafts(selectedWeekIndex);
        setAutopilotReport(null);
        router.refresh();
        setMessage("Entwürfe verworfen.");
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Verwerfen fehlgeschlagen."));
      }
    });
  };

  const autopilotAction =
    initialAutopilotAction ??
    (searchParams.get("autopilot") === "suggest"
      ? "suggest"
      : searchParams.get("autopilot") === "1"
        ? "focus"
        : null);
  const autopilotSuggestOnceRef = useRef(false);

  useEffect(() => {
    if (autopilotAction !== "focus") return;
    requestAnimationFrame(() => {
      document.getElementById("planner-autopilot")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [autopilotAction]);

  useEffect(() => {
    if (!enableTaskListActions || autopilotAction !== "suggest") return;
    if (autopilotSuggestOnceRef.current || autopilotBusy) return;
    if (draftShiftsInWeek.length > 0 || members.length === 0) return;
    autopilotSuggestOnceRef.current = true;
    startAutopilot();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- einmaliger Sonntags-Deep-Link
  }, [autopilotAction, enableTaskListActions, draftShiftsInWeek.length, members.length]);

  const scrollToAutopilot = () => {
    document.getElementById("planner-autopilot")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    simpleAddSheetOpen ||
    mobileMemberPickerOpen ||
    mobileStartPickerOpen ||
    mobileEndPickerOpen ||
    aiQuickOpen;

  const openMobileQuickAdd = (dayIdx = 1) => {
    setSimpleSheetDay(dayIdx);
    setSimpleAddSheetOpen(true);
  };

  const moveMobileSelectedDay = (direction: "next" | "prev") => {
    const order = mobileOrderedDays;
    const currentIdx = order.findIndex((d) => d === mobileSelectedDay);
    if (currentIdx < 0) return;
    const targetIdx =
      direction === "next"
        ? Math.min(order.length - 1, currentIdx + 1)
        : Math.max(0, currentIdx - 1);
    setMobileSelectedDay(order[targetIdx]);
  };

  const MobileView = (
    <>
      <div className="flex flex-col gap-4 pb-28">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setMobileMemberPickerOpen(true)}
            className="flex min-h-12 min-w-0 flex-1 flex-col items-start justify-center rounded-2xl border border-border bg-background px-4 py-2 text-left shadow-sm transition-colors active:bg-muted/40"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mitarbeiter</span>
            <span className="truncate text-base font-bold leading-tight text-foreground">
              {selectedMember ? selectedMember.name ?? selectedMember.email : "Auswählen"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowMobilePlannerInfo((v) => !v)}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground active:bg-muted/40"
            aria-label="Planer-Hinweise anzeigen"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {showMobilePlannerInfo ? (
          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Planer-Info</p>
            <p className="mt-1">Schicht antippen = bearbeiten oder löschen. Plus unten rechts = neue Schicht.</p>
            <p className="mt-1">Compliance: Pause bei &gt;6h und Ruhezeit &lt;11h (Hinweis, keine Rechtsberatung).</p>
            <p className="mt-1 font-medium text-foreground">
              Woche {selectedWeekIndex}:{" "}
              {plannedPayrollWeek.coveredMinutes > 0
                ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(plannedPayrollWeek.euro)
                : "—"}
            </p>
          </div>
        ) : null}

        <div className="-mx-1 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex min-w-max gap-2 px-1">
            {mobileOrderedDays.map((idx) => {
              const isActive = idx === mobileSelectedDay;
              const weatherDay = weatherWeek[monWeekIndexFromTimelineDay(idx)] ?? null;
              const shiftCount = mobileDayShifts.length > 0 && idx === mobileSelectedDay
                ? mobileDayShifts.length
                : shifts.filter((s) => s.weekIndex === selectedWeekIndex && s.dayOfWeek === idx).length;
              const staffHint = staffingHintByDay.get(idx);
              const unavailableCount = members.filter((m) =>
                (unavailableDaysByUserId[m.id] ?? []).includes(idx),
              ).length;
              const dateLabel = dateForCycleDay(selectedWeekIndex, idx).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
              });
              return (
                <button
                  key={`mobile-day-pill-${idx}`}
                  type="button"
                  onClick={() => setMobileSelectedDay(idx)}
                  className={`min-h-12 min-w-[4.25rem] rounded-2xl border px-3 py-2 text-left ${
                    isActive ? "border-brand/40 bg-brand-soft text-brand" : "border-border bg-background text-foreground"
                  }`}
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-wide">{DAY_LABELS[idx]}</span>
                  <span className="block text-[11px] font-medium tabular-nums">{dateLabel}</span>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    {weatherIconForDay(weatherDay, "h-3.5 w-3.5")}
                    {weatherDay ? (
                      <span className="tabular-nums">{Math.round(weatherDay.maxTempC)}°</span>
                    ) : (
                      <span>N/A</span>
                    )}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">{shiftCount} Sch.</span>
                  {unavailableCount > 0 ? (
                    <span className="mt-0.5 block text-[10px] font-medium text-amber-800 dark:text-amber-200">
                      {unavailableCount}× nicht verfügbar
                    </span>
                  ) : null}
                  {staffHint ? (
                    <StaffingHintBadge
                      tone={staffHint.tone}
                      label={staffHint.label}
                      tooltip={staffHint.tooltip}
                      className="mt-1 max-w-full"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="space-y-3"
          onTouchStart={(e) => {
            mobileSwipeStartXRef.current = e.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const startX = mobileSwipeStartXRef.current;
            const endX = e.changedTouches[0]?.clientX;
            mobileSwipeStartXRef.current = null;
            if (startX == null || endX == null) return;
            const deltaX = endX - startX;
            if (Math.abs(deltaX) < 50) return;
            if (deltaX < 0) moveMobileSelectedDay("next");
            if (deltaX > 0) moveMobileSelectedDay("prev");
          }}
        >
          {mobileDayShifts.length === 0 ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setAiQuickOpen(true);
                setAiQuickLoading(true);
                setAiQuickError(null);
                void getPlannerQuickSuggest({ weekIndex: selectedWeekIndex, dayOfWeek: mobileSelectedDay })
                  .then((rows) => setAiQuickRows(rows))
                  .catch(() => setAiQuickError("Vorschläge konnten nicht geladen werden."))
                  .finally(() => setAiQuickLoading(false));
              }}
              className="w-full rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground transition-colors active:bg-muted/30"
            >
              <span className="block">Keine Schicht für {MOBILE_DAY_NAMES[mobileSelectedDay]}.</span>
              <span className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">
                <Brain className="h-4 w-4 shrink-0" aria-hidden />
                Vorschläge: passende Kolleg:innen
              </span>
            </button>
          ) : (
            mobileDayShifts.map((shift) => {
              const member = members.find((m) => m.id === shift.userId);
              const compliance = complianceByShiftId.get(shift.id);
              const netMinutes = shiftNetDurationMinutes(shift.startTime, shift.endTime, shift.breakDuration ?? 0);
              const wage = member?.hourlyWage ?? null;
              const cost = wage != null && wage > 0 ? (netMinutes / 60) * wage : null;
              const mobileWeatherConflict =
                Boolean(mobileWxDay && isRainLikeCondition(mobileWxDay.condition)) &&
                (member?.planningWorkArea === "OUTDOOR" || member?.planningWorkArea === "TERRACE");
              return (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() =>
                    setShiftEdit({
                      userId: shift.userId,
                      shiftId: shift.id,
                      dayOfWeek: shift.dayOfWeek,
                      label: member?.name ?? member?.email ?? "Mitarbeiter",
                      startTime: shift.startTime,
                      endTime: shift.endTime,
                    })
                  }
                  title={
                    mobileWeatherConflict
                      ? "Wetter-Konflikt: Hohe Regenwahrscheinlichkeit für Außenbereich."
                      : undefined
                  }
                  className={`w-full rounded-2xl border border-border bg-background px-4 py-4 text-left active:bg-muted/40 ${
                    shift.isDraft
                      ? "border-dashed border-brand/55 bg-[repeating-linear-gradient(-45deg,rgba(22,101,52,0.14)_0px,rgba(22,101,52,0.14)_6px,transparent_6px,transparent_12px)]"
                      : ""
                  } ${mobileWeatherConflict ? "ring-2 ring-warning/75 animate-pulse" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-lg font-bold tabular-nums text-foreground">
                      {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                    </span>
                    <span className="text-sm font-medium text-foreground">{member?.name ?? member?.email ?? "—"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {compliance?.pauseRisk ? (
                      <span className="inline-flex items-center gap-1 text-danger">
                        <Coffee className="h-3.5 w-3.5" /> Pause prüfen (&gt;6h)
                      </span>
                    ) : null}
                    {compliance?.restRisk ? (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <AlarmClock className="h-3.5 w-3.5" /> Ruhezeit &lt;11h
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-foreground">
                      Netto/Kosten: {Math.max(0, netMinutes)} Min ·{" "}
                      {cost != null
                        ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cost)
                        : "—"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-2 hidden">
          {/* Alte Detail-/Preset-Sektionen auf Mobile ausgeblendet, um die UX schlank zu halten */}
          {showDetails && (
            <p className="text-sm font-medium text-warning-foreground">
              Abwesenheit: {Array.from(selectedUserVacationDays).map((d) => DAY_LABELS[d]).join(", ")}
              {selectedUserSickDays.size > 0 ? " (rot = krank)." : "."}
            </p>
          )}
        </div>
        </div>

        {aiQuickOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[51] bg-black/45 backdrop-blur-[2px]"
              aria-label="Schließen"
              onClick={() => {
                setAiQuickOpen(false);
                setAiQuickRows([]);
                setAiQuickError(null);
              }}
            />
            <div
              className="fixed left-3 right-3 z-[52] max-h-[min(52vh,420px)] overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-pop)]"
              style={{ bottom: "max(5.75rem, calc(env(safe-area-inset-bottom, 0px) + 4.5rem))" }}
              role="dialog"
              aria-label="Schichtvorschläge"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-fg">Schichtvorschläge</p>
                <button
                  type="button"
                  className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-fg-muted"
                  onClick={() => {
                    setAiQuickOpen(false);
                    setAiQuickRows([]);
                    setAiQuickError(null);
                  }}
                >
                  Schließen
                </button>
              </div>
              <p className="mb-3 text-xs text-fg-muted">
                Freie Kolleg:innen mit passender Historie — tippen = Schicht anlegen.
              </p>
              {aiQuickLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
                  Analysiere…
                </div>
              ) : aiQuickError ? (
                <p className="py-4 text-sm text-danger">{aiQuickError}</p>
              ) : aiQuickRows.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Keine freien Kolleg:innen mit Historie für diesen Tag – nutze „+“ oder wähle manuell eine Person.
                </p>
              ) : (
                <ul className="space-y-2">
                  {aiQuickRows.map((row) => (
                    <li key={row.userId}>
                      <button
                        type="button"
                        disabled={isPending}
                        className="flex w-full flex-col items-start gap-1 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors active:bg-muted/40"
                        onClick={() => {
                          setMessage(null);
                          startTransition(async () => {
                            try {
                              await setShiftForDay({
                                userId: row.userId,
                                weekIndex: selectedWeekIndex,
                                dayOfWeek: mobileSelectedDay,
                                startTime: row.startTime,
                                endTime: row.endTime,
                              });
                              setSelectedUserId(row.userId);
                              setStartTime(row.startTime);
                              setEndTime(row.endTime);
                              setAiQuickOpen(false);
                              setAiQuickRows([]);
                              router.refresh();
                              setMessage(`Schicht für ${row.displayName} angelegt (${row.startTime}–${row.endTime}).`);
                            } catch (e: unknown) {
                              setMessage(userErrorMessage(e, "Speichern fehlgeschlagen."));
                            }
                          });
                        }}
                      >
                        <span className="text-base font-semibold text-foreground">{row.displayName}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {row.startTime.slice(0, 5)} – {row.endTime.slice(0, 5)} · {row.hint}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {!mobileOverlayOpen && (
        <button
          type="button"
          onClick={() => openMobileQuickAdd(mobileSelectedDay)}
          className="fixed bottom-[max(6.25rem,calc(env(safe-area-inset-bottom,0px)+5.25rem))] right-5 z-[52] inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-[var(--shadow-card-hover)] active:scale-[0.98] md:bottom-5"
          aria-label="Neue Schicht hinzufügen"
        >
          <Plus className="h-6 w-6" />
        </button>
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
                        ? "border-brand/45 bg-brand-soft text-brand"
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
            <Drawer.Description className="px-4 pb-2 text-sm text-muted-foreground">
              Wähle eine Startzeit für die neue Schicht.
            </Drawer.Description>
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
                  {mobileStartPickerCustom ? "Presets anzeigen" : "Eigene Uhrzeit ..."}
                </button>
                {mobileStartPickerCustom && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    onFocus={scrollFieldIntoView}
                    className="min-h-14 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-lg font-semibold tabular-nums text-foreground"
                    disabled={isPending}
                  />
                )}
              </div>
            </div>
            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Drawer.Close className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-line bg-surface text-base font-bold text-fg active:bg-surface-muted">
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
            <Drawer.Description className="px-4 pb-2 text-sm text-muted-foreground">
              Wähle eine Endzeit für die neue Schicht.
            </Drawer.Description>
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
                  {mobileEndPickerCustom ? "Presets anzeigen" : "Eigene Uhrzeit ..."}
                </button>
                {mobileEndPickerCustom && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    onFocus={scrollFieldIntoView}
                    className="min-h-14 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-lg font-semibold tabular-nums text-foreground"
                    disabled={isPending}
                  />
                )}
              </div>
            </div>
            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Drawer.Close className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-line bg-surface text-base font-bold text-fg active:bg-surface-muted">
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
              Mitarbeiter, Tag und Zeit - Aktionen unten in der Daumen-Zone.
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
                            ? "border-brand/45 bg-brand-soft text-brand"
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
                            ? "border-brand/45 bg-brand-soft text-brand"
                            : "border-border bg-background text-foreground active:bg-muted/40"
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
                        <span className="text-lg font-bold text-foreground">{MOBILE_DAY_NAMES[idx]}</span>
                        {userPrimaryShiftByDay.get(idx) ? (
                          <span className="mt-1 text-sm font-semibold tabular-nums text-muted-foreground">
                            {userPrimaryShiftByDay.get(idx)?.startTime?.slice(0, 5)}-
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
                      className="mt-2 min-h-14 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-lg font-semibold tabular-nums text-foreground"
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
                      className="mt-2 min-h-14 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-lg font-semibold tabular-nums text-foreground"
                      disabled={isPending}
                    />
                  </div>
                </div>

                {hasInvalidRange && (
                  <p className="text-sm font-medium text-warning">Start und Ende dürfen nicht gleich sein.</p>
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
                  className="min-h-14 w-full rounded-2xl border border-brand/40 bg-brand-soft px-4 py-3 text-base font-bold text-brand active:bg-brand/15 disabled:opacity-50"
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

  const selectShiftTemplate = (t: ShiftTemplateRow) => {
    setActiveTemplateId(t.id);
    setStartTime(t.startTime.slice(0, 5));
    setEndTime(t.endTime.slice(0, 5));
  };

  useEffect(() => {
    if (shiftTemplates.length === 0) return;
    if (activeTemplateId && shiftTemplates.some((t) => t.id === activeTemplateId)) return;
    selectShiftTemplate(shiftTemplates[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei Template-Liste initialisieren
  }, [shiftTemplates]);

  const plannedMinutesByUser = useMemo(
    () => buildMemberWeekMinutes(displayShifts, selectedWeekIndex, members.map((m) => m.id)),
    [displayShifts, selectedWeekIndex, members],
  );

  const shiftPlanRows: ShiftPlanRow[] = useMemo(
    () =>
      displayShifts.map((s) => ({
        id: s.id,
        userId: s.userId,
        weekIndex: s.weekIndex,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    [displayShifts],
  );

  const executeShiftAssignment = (userId: string, slot: BoardShiftSlot) => {
    const conflict = conflictTypeByCell.get(`${userId}-${slot.dayOfWeek}`);
    if (conflict) {
      setMessage(conflict === "SICK" ? "Krank — keine Schicht möglich." : "Urlaub — keine Schicht möglich.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        await setShiftForDay({
          userId,
          weekIndex: selectedWeekIndex,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
        setSelectedUserId(userId);
        setMessage("Zugewiesen.");
        router.refresh();
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Zuweisen fehlgeschlagen."));
      }
    });
  };

  const requestAssignMemberToSlot = (userId: string, slot: BoardShiftSlot) => {
    const member = members.find((m) => m.id === userId);
    const saldo = memberSaldoById[userId] ?? null;
    const planned = plannedMinutesByUser.get(userId) ?? 0;
    const risk = evaluateMemberAssignmentRisk({
      userId,
      dayOfWeek: slot.dayOfWeek,
      weekIndex: selectedWeekIndex,
      saldo,
      weeklyHours: member?.weeklyHours,
      plannedWeekMinutes: planned,
      shifts: shiftPlanRows,
      proposedStartTime: slot.startTime,
      proposedEndTime: slot.endTime,
    });

    if (risk.level === "ok") {
      executeShiftAssignment(userId, slot);
      return;
    }

    const conflictDays: Record<string, number[]> = {};
    for (const m of members) {
      const days: number[] = [];
      for (let d = 0; d <= 6; d++) {
        if (conflictTypeByCell.has(`${m.id}-${d}`)) days.push(d);
      }
      if (days.length) conflictDays[m.id] = days;
    }

    const alternative = pickAlternativeAssignee({
      slotDayOfWeek: slot.dayOfWeek,
      members,
      saldoByUserId: saldoMap,
      excludeUserId: userId,
      conflictDaysByUserId: conflictDays,
    });

    setAssignmentGuard({
      userId,
      slot,
      risk,
      alternative,
    });
  };

  const saveBoardShift = (dayOfWeek: number, slotStart: string, slotEnd: string) => {
    if (!selectedUserId) {
      setMessage("Zuerst links eine Person wählen.");
      return;
    }
    const slotStartNorm = slotStart.slice(0, 5);
    const slotEndNorm = slotEnd.slice(0, 5);
    const startM = toMinutes(slotStartNorm);
    const endM = toMinutes(slotEndNorm);
    if (startM === null || endM === null || startM === endM) {
      setMessage("Bitte gültige Start- und Endzeit wählen.");
      return;
    }
    const conflict = conflictTypeByCell.get(`${selectedUserId}-${dayOfWeek}`);
    if (conflict) {
      setMessage(conflict === "SICK" ? "Krank — keine Schicht möglich." : "Urlaub — keine Schicht möglich.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        await setShiftForDay({
          userId: selectedUserId,
          weekIndex: selectedWeekIndex,
          dayOfWeek,
          startTime: slotStartNorm,
          endTime: slotEndNorm,
        });
        setStartTime(slotStartNorm);
        setEndTime(slotEndNorm);
        setMessage(`Schicht angelegt (${slotStartNorm}–${slotEndNorm}).`);
        router.refresh();
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Speichern fehlgeschlagen."));
      }
    });
  };

  const DesktopView = (
    <>
      <ShiftCentricBoard
        members={members}
        shifts={displayShifts}
        selectedWeekIndex={selectedWeekIndex}
        neededStaff={neededStaff}
        planWeekRangeLabel={planWeekRangeLabel}
        weatherWeek={companyModules.plannerWeather ? weatherWeek : []}
        weekDayDates={weekDayDates}
        staffingHintByDay={companyModules.peaks ? staffingHintByDay : new Map()}
        shiftTemplates={shiftTemplates}
        activeTemplateId={activeTemplateId}
        selectedMemberId={selectedUserId || null}
        memberSaldoById={memberSaldoById}
        overtimeFilterOnly={overtimeFilterOnly}
        isPending={isPending}
        onSelectTemplate={selectShiftTemplate}
        onNeededStaffChange={setNeededStaff}
        onSelectMember={setSelectedUserId}
        onOpenAddSlot={(dayOfWeek) => {
          setBoardAddDay(dayOfWeek);
          setBoardAddSheetOpen(true);
        }}
        onAssignMemberToSlot={requestAssignMemberToSlot}
        onOvertimeWarningClick={(userId, el) => {
          setOvertimePopover({ userId, rect: el.getBoundingClientRect() });
        }}
        onEditAssignment={(slot, userId, shiftId) => {
          const assignment = slot.assignments.find((a) => a.userId === userId);
          const member = members.find((m) => m.id === userId);
          if (!assignment) return;
          setShiftEdit({
            userId,
            shiftId,
            dayOfWeek: slot.dayOfWeek,
            label: member?.name ?? member?.email ?? "Mitarbeiter",
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }}
        onRemoveAssignment={(userId, dayOfWeek, shiftId, slotStart, slotEnd) => {
          if (!shiftId?.trim()) {
            setMessage("Zuweisung konnte nicht identifiziert werden — bitte Seite neu laden.");
            return;
          }
          setMessage(null);
          startTransition(async () => {
            const result = await removeShiftViaApi(shiftId);
            if (!result.ok) {
              setMessage(result.error);
              return;
            }
            setHiddenShiftIds((prev) => new Set(prev).add(shiftId));
            setMessage("Zuweisung entfernt.");
          });
        }}
        onClearSlot={(slot) => {
          if (slot.assignments.length === 0) return;
          const n = slot.assignments.length;
          if (
            !window.confirm(
              `${slot.title} (${slot.rangeLabel}): ${n} Zuweisung${n === 1 ? "" : "en"} entfernen? Die Schichtkarte wird danach leer.`,
            )
          ) {
            return;
          }
          setMessage(null);
          startTransition(async () => {
            let result: Awaited<ReturnType<typeof clearPlannerShiftSlot>>;
            try {
              result = await clearPlannerShiftSlot({
                weekIndex: selectedWeekIndex,
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
              });
            } catch {
              setMessage("Schichtkarte konnte nicht geleert werden.");
              return;
            }
            if (!result.ok) {
              setMessage(result.error);
              return;
            }
            const idsToHide = slot.assignments.map((a) => a.shiftId);
            setHiddenShiftIds((prev) => {
              const next = new Set(prev);
              for (const id of idsToHide) next.add(id);
              return next;
            });
            setMessage(
              result.removed > 0
                ? `${result.removed} Zuweisung${result.removed === 1 ? "" : "en"} entfernt — offene Lücke im Board.`
                : "Keine Zuweisungen mehr vorhanden.",
            );
          });
        }}
      />
      <OvertimeRecoveryPopover
        open={overtimePopover != null}
        userId={overtimePopover?.userId ?? null}
        weekIndex={selectedWeekIndex}
        anchorRect={overtimePopover?.rect ?? null}
        onClose={() => setOvertimePopover(null)}
        onApplied={() => {
          router.refresh();
          void getPlannerBoardMemberSaldos(members.map((m) => m.id)).then(setMemberSaldoById);
        }}
      />
      <AssignmentGuardDialog
        open={assignmentGuard != null}
        memberName={
          members.find((m) => m.id === assignmentGuard?.userId)?.name ??
          members.find((m) => m.id === assignmentGuard?.userId)?.email ??
          "Mitarbeiter"
        }
        slotLabel={assignmentGuard ? `${assignmentGuard.slot.title} ${assignmentGuard.slot.rangeLabel}` : ""}
        risk={assignmentGuard?.risk ?? null}
        alternative={assignmentGuard?.alternative ?? null}
        isPending={isPending}
        onClose={() => setAssignmentGuard(null)}
        onConfirm={() => {
          if (!assignmentGuard) return;
          executeShiftAssignment(assignmentGuard.userId, assignmentGuard.slot);
          setAssignmentGuard(null);
        }}
        onPickAlternative={() => {
          if (!assignmentGuard?.alternative) return;
          setSelectedUserId(assignmentGuard.alternative.userId);
          executeShiftAssignment(assignmentGuard.alternative.userId, assignmentGuard.slot);
          setAssignmentGuard(null);
        }}
      />
      <ShiftAddSheet
        open={boardAddSheetOpen}
        dayOfWeek={boardAddDay}
        memberLabel={selectedMember?.name ?? selectedMember?.email ?? null}
        templates={shiftTemplates}
        isPending={isPending}
        onClose={() => {
          setBoardAddSheetOpen(false);
          setBoardAddDay(null);
        }}
        onConfirm={(dayOfWeek, slotStart, slotEnd) => {
          saveBoardShift(dayOfWeek, slotStart, slotEnd);
          setBoardAddSheetOpen(false);
          setBoardAddDay(null);
        }}
      />
      {weatherFetchErr ? <p className="mt-2 text-[10px] text-muted-foreground">{weatherFetchErr}</p> : null}
    </>
  );


  const weekPicker =
    shiftCycleWeeks > 1 ? (
      <div className="mt-3 inline-flex max-w-full rounded-lg border border-border bg-background p-1 text-xs">
        {Array.from({ length: shiftCycleWeeks }).map((_, idx) => {
          const week = (idx + 1) as 1 | 2 | 3;
          return (
            <button
              key={week}
              type="button"
              onClick={() => {
                setSelectedWeekIndex(week);
              }}
              className={`min-h-11 touch-manipulation rounded-md px-4 py-2 sm:min-h-0 sm:px-3 sm:py-1.5 ${
                selectedWeekIndex === week ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Woche {week}
            </button>
          );
        })}
      </div>
    ) : null;

  const selectedMemberChip =
    selectedMember ? (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] text-foreground">
        <span>Ausgewählt:</span>
        <span className="font-semibold text-foreground">{selectedMember.name ?? selectedMember.email}</span>
      </div>
    ) : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
      {enableTaskListActions && companyModules.autopilot ? (
        <div className="mb-4">
          <PlannerAutopilotPanel
            weekIndex={selectedWeekIndex}
            draftCount={draftShiftsInWeek.length}
            busy={autopilotBusy}
            report={autopilotReport}
            disabled={isPending}
            onSuggest={startAutopilot}
            onPublish={confirmAutopilot}
            onDiscard={discardAutopilot}
          />
        </div>
      ) : null}
      {enableTaskListActions ? (
        <div className="mb-4 rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/[0.07] to-card px-4 py-3 shadow-sm sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Plan-Status · Zyklus-Woche {selectedWeekIndex}
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <div
                  className={
                    weekCoverageGapSlots === 0
                      ? "inline-flex min-w-0 max-w-full flex-col gap-1.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/90 px-3 py-2 text-emerald-950 shadow-sm dark:border-emerald-500/35 dark:bg-emerald-500/12 dark:text-emerald-50"
                      : "inline-flex min-w-0 max-w-full flex-col gap-1.5 rounded-2xl border border-border bg-background/80 px-3 py-2 text-foreground shadow-sm dark:border-white/[0.08] dark:bg-surface-muted/40"
                  }
                >
                  <span className="inline-flex items-center gap-1.5 font-medium leading-snug">
                    <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {weekCoverageGapSlots === 0 ? (
                      <>Mindestbesetzung erreicht · alle Zeitfenster (Mo–So)</>
                    ) : (
                      <>
                        <span className="min-w-0">
                          Noch{" "}
                          <span className="tabular-nums font-semibold text-foreground">{weekCoverageGapSlots}</span>{" "}
                          von{" "}
                          <span className="tabular-nums text-muted-foreground">{weekMaxCoverageGapSlots}</span>{" "}
                          Fenstern offen
                        </span>
                        <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
                          ({Math.round(weekCoverageGapFillRatio * 100)} % geschlossen)
                        </span>
                      </>
                    )}
                  </span>
                  {weekCoverageGapSlots > 0 ? (
                    <div
                      className="h-1.5 w-full min-w-[10rem] max-w-[14rem] overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-950/40"
                      role="progressbar"
                      aria-valuenow={Math.round(weekCoverageGapFillRatio * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Anteil der Zeitfenster mit ausreichender Mindestbesetzung"
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-300 ease-out"
                        style={{
                          width: `${Math.round(weekCoverageGapFillRatio * 100)}%`,
                          background: "linear-gradient(90deg, #facc15, #22c55e)",
                        }}
                      />
                    </div>
                  ) : null}
                  {weekCoverageGapSlots > 0 ? (
                    <span className="text-[10px] font-normal text-muted-foreground sm:hidden">
                      {Math.round(weekCoverageGapFillRatio * 100)} % der Fenster erfüllen die Mindestbesetzung
                    </span>
                  ) : null}
                </div>
                <span
                  className={
                    restRiskShiftCount > 0
                      ? "inline-flex items-center gap-1.5 rounded-full border border-orange-300/80 bg-orange-50 px-3 py-1 text-orange-950 dark:border-orange-500/40 dark:bg-orange-500/12 dark:text-orange-100"
                      : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-foreground"
                  }
                >
                  <AlarmClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {restRiskShiftCount === 0
                    ? "Keine Ruhezeit-Konflikte"
                    : `${restRiskShiftCount} Ruhezeit-Warnung${restRiskShiftCount === 1 ? "" : "en"} (< 11h)`}
                </span>
                <span
                  className={
                    criticalOvertimeCount > 0
                      ? "inline-flex flex-wrap items-center gap-2 rounded-full border border-warning/50 bg-warning-soft px-3 py-1 text-warning-foreground"
                      : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-foreground"
                  }
                >
                  <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {criticalOvertimeCount > 0 ? (
                    <>
                      <span>
                        {criticalOvertimeCount} Mitarbeitende mit kritischen Überstunden
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOvertimeFilterOnly((v) => !v);
                          setMessage(
                            overtimeFilterOnly
                              ? "Alle Mitarbeitenden im Deck angezeigt."
                              : "Deck zeigt nur kritische Überstunden — Flammen-Icon für Empfehlung.",
                          );
                        }}
                        className="text-xs font-bold underline underline-offset-2"
                      >
                        {overtimeFilterOnly ? "Alle anzeigen" : "Jetzt lösen"}
                      </button>
                    </>
                  ) : (
                    "Keine kritischen Überstunden"
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setPlanStatusMetricsHelpOpen((v) => !v)}
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  aria-expanded={planStatusMetricsHelpOpen}
                  title={planStatusMetricsHelpOpen ? "Legende ausblenden" : "Was bedeuten die Zahlen?"}
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">Zahlen-Legende</span>
                </button>
                {planStatusMetricsHelpOpen ? (
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Offene Fenster: Mo–So in {coverageSlotMinutes}-Minuten-Slots. Ein Slot gilt als besetzt, wenn mindestens
                    so viele parallele Schichten liegen wie die Mindestbesetzung (Zahl oben rechts am Planer).
                    Ruhezeit: weniger als 11 Stunden Pause zwischen zwei Schichten derselben Person in dieser Zykluswoche.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-col lg:items-end">
              {companyModules.autopilot ? (
                <button
                  type="button"
                  disabled={isPending || autopilotBusy}
                  onClick={scrollToAutopilot}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand/35 bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm ring-1 ring-inset ring-white/15 transition-colors hover:bg-brand/90 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                  Zum Autopilot
                </button>
              ) : (
                <Link
                  href="/dashboard/settings"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Autopilot in Einstellungen aktivieren
                </Link>
              )}
              {renderDesktopTree ? (
                <a
                  href="#planner-compliance-radar"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                >
                  Zu Compliance & Budget
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {enableTaskListActions ? (
        <div className="block">
          <h2 className="text-lg font-semibold tracking-tight">Schichtplan</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {renderDesktopTree
              ? "Team links · Schichtkarten in der Woche · Zuweisen per Drag oder Antippen."
              : "Gleicher Plan wie am Desktop: Team wählen, Karten horizontal wischen, + für neue Schicht."}
          </p>
          {!renderDesktopTree ? (
            <p className="mt-2 rounded-xl border border-brand/25 bg-brand-soft/40 px-3 py-2 text-[11px] text-foreground">
              <strong className="font-semibold">Tipp:</strong> Wische über die Tages-Spalten. X entfernt eine Person, „Schicht leeren“
              die ganze Karte.
            </p>
          ) : null}
          {weekPicker}
          {DesktopView}
        </div>
      ) : (
        <div className="block">
          <h2 className="text-lg font-semibold tracking-tight">Einfach-Planer</h2>
          <p className="mt-1 text-xs text-muted-foreground">Mitarbeiter wählen, dann Schichten pro Tag pflegen.</p>
          {weekPicker}
          {selectedMemberChip}
          {MobileView}
        </div>
      )}

      {message && <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">{message}</p>}

      {shiftEdit ? (
        <div
          className={`fixed inset-0 z-[100] flex justify-center bg-black/45 ${
            renderDesktopTree ? "items-end p-0 md:items-center md:bg-surface/70 md:p-4" : "items-stretch p-0"
          }`}
          role="dialog"
          aria-modal="true"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setShiftEdit(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              let s = toMinutes(shiftEdit.startTime);
              let en = toMinutes(shiftEdit.endTime);
              if (s === null || en === null || en === s) {
                setMessage("Ungültige Zeitspanne.");
                return;
              }
              s = snapMinutes(s);
              const rawEnd = en < s ? en + 24 * 60 : en;
              const snappedEnd = Math.max(s + TIMELINE_SNAP_MINUTES, snapMinutes(rawEnd));
              const endTimeValue = minutesToHHMM(snappedEnd >= 24 * 60 ? snappedEnd - 24 * 60 : snappedEnd);
              setMessage(null);
              startTransition(async () => {
                try {
                  await setShiftForDay({
                    userId: shiftEdit.userId,
                    weekIndex: selectedWeekIndex,
                    dayOfWeek: shiftEdit.dayOfWeek,
                    startTime: minutesToHHMM(s),
                    endTime: endTimeValue,
                  });
                  setShiftEdit(null);
                  setMessage("Schicht gespeichert.");
                  router.refresh();
                } catch (err: unknown) {
                  setMessage(userErrorMessage(err, "Speichern fehlgeschlagen."));
                }
              });
            }
          }}
        >
          <div
            className={`w-full max-w-full overflow-y-auto border border-border bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 ${
              renderDesktopTree
                ? "max-h-[min(88dvh,640px)] rounded-t-3xl border-b-0 sm:max-h-[90vh] md:max-h-none md:max-w-sm md:rounded-2xl md:border md:pb-5 md:shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
                : "h-[100dvh] rounded-none border-0"
            }`}
          >
            <h3 className="text-base font-semibold text-foreground md:text-sm">Schicht bearbeiten</h3>
            <p className="mt-1 text-xs text-muted-foreground">{DAY_LABELS[shiftEdit.dayOfWeek]} · {shiftEdit.label}</p>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Start</label>
                <input
                  type="time"
                  step={900}
                  value={shiftEdit.startTime.slice(0, 5)}
                  onChange={(e) => setShiftEdit({ ...shiftEdit, startTime: e.target.value })}
                  className="mt-1 min-h-12 w-full touch-manipulation rounded-lg border border-border bg-surface px-3 py-3 text-base text-foreground md:min-h-0 md:py-2 md:text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Ende</label>
                <input
                  type="time"
                  step={900}
                  value={shiftEdit.endTime.slice(0, 5)}
                  onChange={(e) => setShiftEdit({ ...shiftEdit, endTime: e.target.value })}
                  className="mt-1 min-h-12 w-full touch-manipulation rounded-lg border border-border bg-surface px-3 py-3 text-base text-foreground md:min-h-0 md:py-2 md:text-sm"
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
                        dayOfWeek: shiftEdit.dayOfWeek,
                        startTime: minutesToHHMM(s),
                        endTime: minutesToHHMM(e),
                      });
                      setShiftEdit(null);
                      setMessage("Schicht gespeichert.");
                      router.refresh();
                    } catch (err: unknown) {
                      setMessage(userErrorMessage(err, "Speichern fehlgeschlagen."));
                    }
                  });
                }}
                className="min-h-12 w-full touch-manipulation rounded-lg border border-brand/35 bg-brand-soft px-4 py-3 text-sm font-semibold text-brand transition-all hover:bg-brand/15 hover:shadow-md disabled:opacity-50 sm:w-auto sm:py-2"
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
                      if (shiftEdit.shiftId) {
                        const removed = await removeShiftViaApi(shiftEdit.shiftId);
                        if (!removed.ok) {
                          setMessage(removed.error);
                          return;
                        }
                        setHiddenShiftIds((prev) => new Set(prev).add(shiftEdit.shiftId!));
                      } else {
                        await clearShiftForDay({
                          userId: shiftEdit.userId,
                          weekIndex: selectedWeekIndex,
                          dayOfWeek: shiftEdit.dayOfWeek,
                        });
                      }
                      setShiftEdit(null);
                      setMessage("Schicht gelöscht.");
                      router.refresh();
                    } catch (err: unknown) {
                      setMessage(userErrorMessage(err, "Löschen fehlgeschlagen."));
                    }
                  });
                }}
                className="min-h-12 w-full touch-manipulation rounded-lg border border-danger/35 bg-danger-soft px-4 py-3 text-sm text-danger-foreground transition-colors hover:bg-danger-soft/90 disabled:opacity-50 sm:w-auto sm:py-2"
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
      ) : null}

      {renderDesktopTree ? (
        <div
          id="planner-compliance-radar"
          className="sticky bottom-0 z-20 mt-4 space-y-2 rounded-xl border border-border bg-background/95 px-3 py-3 text-[11px] text-muted-foreground shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-sm"
        >
        <p className="font-semibold text-foreground">Compliance-Radar · Budget</p>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1">
            <Coffee className="h-3.5 w-3.5 text-danger" aria-hidden />
            Schicht &gt;6h: 30-Min-Pause prüfen (nur Sollzeit im Plan)
          </span>
          <span className="inline-flex items-center gap-1">
            <AlarmClock className="h-3.5 w-3.5 text-warning" aria-hidden />
            &lt;11h Ruhe zwischen aufeinanderfolgenden Schichten (Mo–So, Zykluswoche {selectedWeekIndex})
          </span>
        </div>
        <p className="text-[10px] text-warning-foreground/90">Hinweis: keine Rechtsberatung – vor Veröffentlichung prüfen.</p>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-2">
          <span className="text-foreground">Geplante Brutto-Lohnkosten (Woche {selectedWeekIndex})</span>
          <span className="font-sans tabular-nums font-semibold text-foreground">
            {plannedPayrollWeek.coveredMinutes > 0
              ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(plannedPayrollWeek.euro)
              : "—"}
          </span>
        </div>
        {plannedPayrollWeek.totalMinutesAll > 0 && plannedPayrollWeek.coveredMinutes < plannedPayrollWeek.totalMinutesAll ? (
          <p className="text-[10px]">Es werden nur Schichten mit hinterlegtem Stundenlohn summiert (Team · €/Std).</p>
        ) : null}
        </div>
      ) : null}
    </section>
  );
}
