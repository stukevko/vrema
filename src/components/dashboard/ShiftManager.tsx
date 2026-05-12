"use client";

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
import { generateTaskListForShift } from "@/lib/actions/shift-tasks";
import { confirmAutopilotDrafts, discardAutopilotDrafts, runAutopilotDraft } from "@/lib/actions/autopilot";
import { useRouter } from "next/navigation";
import { buildComplianceFlagsByShiftId } from "@/lib/planning/compliance";
import {
  AlarmClock,
  Coffee,
  CornerDownRight,
  Info,
  Plus,
  CloudSun,
  CloudRain,
  Cloud,
  Sun,
  HelpCircle,
  Sparkles,
} from "lucide-react";
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
  /** OUTDOOR | TERRACE für Regen-Hinweise */
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
const TIMELINE_START_HOUR = 0;
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

function weatherIconForDay(day: DailyWeatherForecast | null, className: string) {
  if (!day) return <HelpCircle className={className} aria-hidden />;
  if (day.condition === "RAIN" || day.condition === "SNOW") return <CloudRain className={className} aria-hidden />;
  if (day.condition === "CLEAR") return <Sun className={className} aria-hidden />;
  if (day.condition === "CLOUDS") return <Cloud className={className} aria-hidden />;
  return <CloudSun className={className} aria-hidden />;
}

function dateForCycleDay(weekIndex: number, dayOfWeek: number) {
  const now = new Date();
  const monday = new Date(now);
  const mondayOffset = dayOrderMonFirst(now.getDay());
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(12, 0, 0, 0);
  const d = new Date(monday);
  d.setDate(monday.getDate() + (weekIndex - 1) * 7 + dayOrderMonFirst(dayOfWeek));
  return d;
}

function getRoleShiftBarTone(role?: string | null) {
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
  shiftCycleWeeks = 1,
  vacationConflictDays,
  enableTaskListActions = false,
}: {
  members: Member[];
  shifts: ShiftRow[];
  shiftCycleWeeks?: 1 | 2 | 3;
  vacationConflictDays?: Array<{ userId: string; dayOfWeek: number; type?: "VACATION" | "SICK" }>;
  /** Manager: Schicht-Checkliste für den sichtbaren Tag im Timeline erzeugen */
  enableTaskListActions?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autopilotBusy, setAutopilotBusy] = useState(false);
  const [autopilotReport, setAutopilotReport] = useState<string[] | null>(null);
  const [selectedUserId, setSelectedUserId] = useState(members[0]?.id ?? "");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [message, setMessage] = useState<string | null>(null);
  /** Mobil: nur Einfach-Planer. Desktop: Einfach-Planer oder Timeline. */
  const [viewMode, setViewMode] = useState<"simple" | "timeline">("simple");
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<1 | 2 | 3>(1);
  const [timelineDate, setTimelineDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [neededStaff, setNeededStaff] = useState(2);
  const timelineDay = useMemo(() => {
    const parsed = new Date(`${timelineDate}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? 1 : parsed.getDay();
  }, [timelineDate]);
  const [coverageSlotMinutes] = useState<60>(60);
  const [dragDraft, setDragDraft] = useState<{
    userId: string;
    startMinute: number;
    endMinute: number;
  } | null>(null);
  const [shiftEdit, setShiftEdit] = useState<{
    userId: string;
    dayOfWeek: number;
    label: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const dragDraftRef = useRef<{ userId: string; startMinute: number; endMinute: number } | null>(null);
  const dragSnapshotRef = useRef<{ start: number; end: number } | null>(null);
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
  const [weatherMondayIso, setWeatherMondayIso] = useState<string | null>(null);
  const [weatherFetchErr, setWeatherFetchErr] = useState<string | null>(null);
  const [costPeakFocusDay, setCostPeakFocusDay] = useState<number | null>(null);
  const [gapSuggestions, setGapSuggestions] = useState<
    Array<{ userId: string; name: string; role: string; reason: string; startTime: string; endTime: string }>
  >([]);
  /** Mobil: „+“ öffnet Bottom-Sheet statt nur Mini-Zellen. */
  const [simpleAddSheetOpen, setSimpleAddSheetOpen] = useState(false);
  const [simpleSheetDay, setSimpleSheetDay] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [showPlannerInfo, setShowPlannerInfo] = useState(false);
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
  const mobileSwipeStartXRef = useRef<number | null>(null);
  const mobileDayLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileDayLongPressFiredRef = useRef(false);
  /**
   * Desktop-Baum (Tabs + Timeline) nur bei echtem Desktop: breit **und** feiner Zeiger.
   * Verhindert u. a. iPhone „Desktop-Website“ / falsche Viewport-Breite → ohne Timeline-DOM auf Touch.
   */
  const [renderDesktopTree, setRenderDesktopTree] = useState(false);

  useEffect(() => {
    if (viewMode !== "simple") setSimpleAddSheetOpen(false);
  }, [viewMode]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      const desktop = mq.matches;
      setRenderDesktopTree(desktop);
      if (!desktop) {
        setViewMode("simple");
        setShiftEdit(null);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
    setViewMode("timeline");
    setMessage("Kosten-Peak-Fokus aktiv: betroffene Schichten werden hervorgehoben.");
  }, []);

  useEffect(() => {
    if (!mobileStartPickerOpen) setMobileStartPickerCustom(false);
  }, [mobileStartPickerOpen]);

  useEffect(() => {
    if (!mobileEndPickerOpen) setMobileEndPickerCustom(false);
  }, [mobileEndPickerOpen]);

  useEffect(() => {
    const anchor =
      viewMode === "timeline"
        ? timelineDate.slice(0, 10)
        : isoFromDate(dateForCycleDay(selectedWeekIndex, mobileSelectedDay));
    let cancelled = false;
    setWeatherFetchErr(null);
    fetch(`/api/planning/weather?anchorDate=${encodeURIComponent(anchor)}`)
      .then((r) => r.json())
      .then((data: { week?: Array<DailyWeatherForecast | null>; mondayIso?: string; error?: string | null }) => {
        if (cancelled) return;
        if (data.error === "no_api_key") {
          setWeatherFetchErr("Wetter: OPENWEATHER_API_KEY fehlt.");
          setWeatherWeek([]);
          setWeatherMondayIso(null);
          return;
        }
        if (data.error === "no_location") {
          setWeatherFetchErr(null);
          setWeatherWeek([]);
          setWeatherMondayIso(null);
          return;
        }
        setWeatherWeek(Array.isArray(data.week) ? data.week : []);
        setWeatherMondayIso(typeof data.mondayIso === "string" ? data.mondayIso : null);
      })
      .catch(() => {
        if (!cancelled) setWeatherFetchErr("Wetter: Abruf fehlgeschlagen.");
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, timelineDate, selectedWeekIndex, mobileSelectedDay]);

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
  const firstCriticalSlot = useMemo(
    () => timelineCoverage.find((slot) => slot.isGap)?.label ?? null,
    [timelineCoverage]
  );
  const hourMarkers = useMemo(
    () => Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR }, (_, i) => TIMELINE_START_HOUR + i + 1),
    []
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
    if (!(renderDesktopTree && viewMode === "timeline")) return;
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
    viewMode,
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

  const suggestAutofillForFirstGap = () => {
    if (!firstCriticalSlot) return;
    const slotStart = toMinutes(firstCriticalSlot);
    if (slotStart === null) return;
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
      setMessage("Start- und Endzeit dürfen nicht identisch sein.");
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

  const startAutopilot = () => {
    setAutopilotReport(null);
    setMessage(null);
    setAutopilotBusy(true);
    startTransition(async () => {
      try {
        const anchor =
          viewMode === "timeline" ? new Date(`${timelineDate.slice(0, 10)}T12:00:00`) : new Date();
        const result = await runAutopilotDraft(selectedWeekIndex, {
          slotTemplates: [
            { startTime, endTime, breakDuration: 30 },
            { startTime: "14:00", endTime: "22:00", breakDuration: 30 },
          ],
          coveragePerDay: Math.min(6, Math.max(1, neededStaff)),
          anchorDate: anchor,
        });
        const lines = [
          ...result.infoLines,
          ...result.unfilled.map(
            (u) =>
              `Offen: ${u.dayLabel} ${u.startTime}–${u.endTime}${u.staffingRole ? ` – Rolle „${u.staffingRole}“` : ""}: ${u.reason}`
          ),
        ];
        setAutopilotReport(lines);
        if (result.shiftsCreated === 0 && result.unfilled.length === 0) {
          setMessage("Autopilot: Alle vorgesehenen Schichten sind bereits besetzt.");
        }
        router.refresh();
      } catch (e: unknown) {
        setAutopilotReport(null);
        setMessage(e instanceof Error ? e.message : "Autopilot fehlgeschlagen.");
      } finally {
        setAutopilotBusy(false);
      }
    });
  };

  const confirmAutopilot = () => {
    if (!window.confirm("Alle Entwurfs-Schichten dieser Planwoche veröffentlichen?")) return;
    setMessage(null);
    startTransition(async () => {
      try {
        await confirmAutopilotDrafts(selectedWeekIndex);
        setAutopilotReport(null);
        router.refresh();
        setMessage("Autopilot-Entwürfe übernommen.");
      } catch (e: unknown) {
        setMessage(e instanceof Error ? e.message : "Freigabe fehlgeschlagen.");
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
        setMessage(e instanceof Error ? e.message : "Verwerfen fehlgeschlagen.");
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
            <p className="mt-1">Schichtkarte antippen zum Bearbeiten, Plus unten rechts für neue Schicht.</p>
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
            <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
              Keine Schicht für {MOBILE_DAY_NAMES[mobileSelectedDay]}.
            </div>
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

      {!mobileOverlayOpen && (
        <button
          type="button"
          onClick={() => openMobileQuickAdd(mobileSelectedDay)}
          className="fixed bottom-5 right-5 z-[50] inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-[var(--shadow-card-hover)] active:scale-[0.98]"
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

        {enableTaskListActions ? (
          <div className="glass-card mt-4 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="brand"
                size="md"
                hero
                disabled={isPending || autopilotBusy}
                onClick={startAutopilot}
                leadingIcon={<Sparkles className="h-4 w-4 shrink-0" aria-hidden />}
              >
                Autopilot starten
              </Button>
              {draftShiftsInWeek.length > 0 ? (
                <>
                  <Button type="button" variant="subtle" size="md" disabled={isPending} onClick={confirmAutopilot}>
                    Alle bestätigen ({draftShiftsInWeek.length})
                  </Button>
                  <Button type="button" variant="outline" size="md" disabled={isPending} onClick={discardAutopilot}>
                    Entwurf verwerfen
                  </Button>
                </>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] text-fg-muted">
              Füllt freie Schicht-Slots (Woche {selectedWeekIndex}) mit KI-Logik: Ruhezeit, Abwesenheit, Soll-Stunden,
              Wochenend-Fairness. Entwürfe: gestrichelte Petrol-Balken – erst nach Bestätigung fest.
            </p>
            {autopilotBusy ? (
              <div className="mt-3 space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-brand-soft">
                  <div className="h-full w-[55%] animate-pulse rounded-full bg-brand/70" />
                </div>
                <p className="text-center text-xs font-semibold text-brand">KI optimiert Besetzung…</p>
              </div>
            ) : null}
            {autopilotReport && autopilotReport.length > 0 ? (
              <ul className="mt-3 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-[11px] text-foreground">
                {autopilotReport.map((line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {viewMode === "simple" && (
        <>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-5 md:items-end">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="min-h-11 w-full touch-manipulation rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fg sm:min-h-0 sm:py-2"
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
          className="min-h-11 w-full touch-manipulation rounded-lg border border-line bg-surface px-3 py-2.5 text-sm tabular-nums text-fg shadow-sm transition-shadow focus:border-brand sm:min-h-0 sm:py-2"
          disabled={isPending}
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="min-h-11 w-full touch-manipulation rounded-lg border border-line bg-surface px-3 py-2.5 text-sm tabular-nums text-fg shadow-sm transition-shadow focus:border-brand sm:min-h-0 sm:py-2"
          disabled={isPending}
        />
        <Button
          type="button"
          variant="outline"
          size="md"
          className="w-full sm:w-auto"
          onClick={submitStandardWeek}
          disabled={isPending || !selectedUserId}
        >
          Standardwoche (Mo-Fr)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="md"
          className="w-full sm:w-auto"
          onClick={submitCopyToAll}
          disabled={isPending || !selectedUserId}
        >
          Auf alle übertragen
        </Button>
      </div>
      {crossesMidnight ? (
        <p className="mt-2 text-xs font-medium text-brand">Hinweis: Schicht endet am Folgetag (+1 Tag).</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-[11px] text-muted-foreground">Tipp: Zeit oben einstellen und Tage direkt antippen. Erneuter Klick mit gleicher Zeit löscht den Tag.</p>
        {selectedUserVacationDays.size > 0 && (
          <p className="text-[11px] text-warning-foreground">
            Abwesenheit: {Array.from(selectedUserVacationDays).map((d) => DAY_LABELS[d]).join(", ")}
            {selectedUserSickDays.size > 0 ? " (krank = Rot)." : "."}
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
        <p className="mt-2 text-xs text-warning-foreground">Bitte gültige Zeit wählen: Start und Ende dürfen nicht gleich sein.</p>
      )}

      <div className="mt-3 flex flex-wrap items-stretch gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setStartTime("08:00");
            setEndTime("16:00");
          }}
          className="min-h-11 min-w-0 flex-1 touch-manipulation rounded-lg border border-line bg-surface px-2 py-2.5 text-fg shadow-sm transition-colors sm:flex-none sm:px-2.5 sm:py-1 md:hover:bg-surface-muted"
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
          className="min-h-11 min-w-0 flex-1 touch-manipulation rounded-lg border border-line bg-surface px-2 py-2.5 text-fg shadow-sm transition-colors sm:flex-none sm:px-2.5 sm:py-1 md:hover:bg-surface-muted"
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
          className="min-h-11 min-w-0 flex-[1_1_100%] touch-manipulation rounded-lg border border-line bg-surface px-2 py-2.5 text-fg shadow-sm transition-colors sm:flex-none sm:px-2.5 sm:py-1 md:hover:bg-surface-muted"
          disabled={isPending}
        >
          Spät: 14:00-22:00
        </button>
      </div>

      <div className="mt-4 min-w-0 overflow-x-auto pb-1 scrollbar-hide">
        <div className="grid min-w-max grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-0 lg:w-full lg:grid-cols-7">
        {DAY_LABELS.map((label, idx) => {
          const dayMeta = simplePlannerDayState({
            dayIdx: idx,
            usedDays,
            vacationDays: selectedUserVacationDays,
            sickDays: selectedUserSickDays,
          });
          return (
            <button
              key={`desktop-day-${label}`}
              type="button"
              onClick={() => applyDayFromInputs(idx)}
              disabled={isPending || !selectedUserId}
              className={`touch-manipulation rounded-xl border px-3 py-3 text-left text-sm transition-colors disabled:opacity-60 sm:rounded-lg sm:text-xs min-h-[4.5rem] sm:min-h-0 sm:py-2 ${dayMeta.cellClass} ${recentDayAction?.dayOfWeek === idx ? "ring-2 ring-brand/45" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="block text-xs font-semibold">{label}</span>
                <StatusBadge tone={dayMeta.tone} size="sm" glass withDot={false} className="max-w-[min(100%,5.5rem)]">
                  {dayMeta.label}
                </StatusBadge>
              </div>
              <span className="mt-0.5 block text-[10px] font-sans opacity-85">
                {userPrimaryShiftByDay.get(idx)
                  ? `${userPrimaryShiftByDay.get(idx)?.startTime}-${userPrimaryShiftByDay.get(idx)?.endTime}`
                  : "—"}
              </span>
              {(() => {
                const pl = userPrimaryShiftByDay.get(idx);
                if (!pl) return null;
                const cf = complianceByShiftId.get(pl.id);
                if (!cf || (!cf.pauseRisk && !cf.restRisk)) return null;
                return (
                  <span className="mt-1 flex items-center gap-1">
                    {cf.pauseRisk ? (
                      <span title="Über 6h: Pause prüfen">
                        <Coffee className="h-3 w-3 text-danger" aria-hidden />
                      </span>
                    ) : null}
                    {cf.restRisk ? (
                      <span title="Ruhezeit unter 11 Stunden">
                        <AlarmClock className="h-3 w-3 text-warning" aria-hidden />
                      </span>
                    ) : null}
                  </span>
                );
              })()}
              {recentDayAction?.dayOfWeek === idx && (
                <span
                  className={`mt-1 block text-[10px] ${recentDayAction.action === "saved" ? "text-brand" : "text-danger"}`}
                >
                  {recentDayAction.action === "saved" ? "Gespeichert" : "Gelöscht"}
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-[11px] text-muted-foreground">Legende:</p>
        <StatusBadge tone="neutral" size="sm" glass withDot={false}>
          Frei
        </StatusBadge>
        <StatusBadge tone="brand" size="sm" glass withDot={false}>
          Schicht
        </StatusBadge>
        <StatusBadge tone="warning" size="sm" glass withDot={false}>
          Urlaub
        </StatusBadge>
        <StatusBadge tone="danger" size="sm" glass withDot={false}>
          Krank
        </StatusBadge>
        <span className="text-[11px] text-muted-foreground">· Klick übernimmt die oben gewählte Zeit für den Tag.</span>
      </div>

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
              <div key={s.id} className={`grid grid-cols-3 items-center px-3 py-2 text-sm ${idx % 2 === 0 ? "bg-surface-muted/35" : ""}`}>
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
        <div className="mt-4 min-w-0 max-w-full overflow-x-auto rounded-xl border border-border bg-background p-3 scrollbar-hide sm:p-4">
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
            <div className="mb-3 rounded-xl border border-border bg-surface px-3 py-2">
              <p className="text-[11px] text-foreground">
                Wochenstatus: <span className="text-foreground/85">{plannedDaysCount}/7</span> · Sollstunden:{" "}
                <span className="text-brand">{formatHours(weeklyMinutes)}</span> · Lücken Mo-Fr:{" "}
                <span className="text-warning">{missingWeekdays.length === 0 ? "Keine" : missingWeekdays.join(", ")}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Datum
              </span>
              <input
                type="date"
                value={timelineDate}
                onChange={(e) => setTimelineDate(e.target.value)}
                className="min-h-12 w-full touch-manipulation rounded-lg border border-border bg-surface px-3 py-2.5 text-base sm:min-h-11 sm:text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Wochentag: {DAY_LABELS[timelineDay]}</p>
              {selectedShiftIds.length > 1 ? (
                <span className="mt-1 inline-flex items-center rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">
                  {selectedShiftIds.length} Schichten ausgewählt
                </span>
              ) : null}
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
                className="min-h-12 w-full touch-manipulation rounded-lg border border-border bg-surface px-3 py-2.5 text-base tabular-nums sm:min-h-11 sm:text-sm"
                title="Benötigte Mitarbeiter pro Zeitfenster"
              />
            </div>
            <p className="hidden items-center text-[11px] text-muted-foreground leading-snug md:flex">
              15-Minuten-Raster · Hilfslinien · Balken ziehen oder anklicken zum Bearbeiten
            </p>
          </div>
          <div className="mt-2 flex justify-end">
            {firstCriticalSlot ? (
              <button
                type="button"
                onClick={suggestAutofillForFirstGap}
                className="inline-flex items-center rounded-full border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger-foreground underline-offset-2 hover:underline sm:text-[11px]"
              >
                Erste Lücke ab {firstCriticalSlot}
              </button>
            ) : null}
          </div>
          {gapSuggestions.length > 0 ? (
            <div className="mt-2 rounded-xl border border-border bg-background px-3 py-2">
              <p className="text-[11px] font-semibold text-foreground">Autofill-Vorschläge (Top 3)</p>
              <div className="mt-2 space-y-1.5">
                {gapSuggestions.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-muted-foreground">{s.startTime}-{s.endTime} · {s.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(async () => {
                          await setShiftForDay({
                            userId: s.userId,
                            weekIndex: selectedWeekIndex,
                            dayOfWeek: timelineDay,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            breakDuration: 0,
                          });
                        });
                        setFlashAssignedKey(`${s.userId}-${timelineDay}`);
                        window.setTimeout(() => setFlashAssignedKey(null), 1200);
                      }}
                      className="rounded-md border border-brand/30 bg-brand-soft px-2 py-1 font-medium text-brand"
                    >
                      Einplanen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {weatherMondayIso ? (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr] md:items-end">
              <div className="hidden md:block" />
              <div className="flex flex-wrap justify-end gap-1.5">
                {WEEK_SHORT_MON.map((label, i) => {
                  const d = addDaysToDate(new Date(`${weatherMondayIso}T12:00:00`), i);
                  const iso = isoFromDate(d);
                  const w = weatherWeek[i] ?? null;
                  const active = iso === timelineDate.slice(0, 10);
                  return (
                    <button
                      key={`wx-${iso}`}
                      type="button"
                      onClick={() => setTimelineDate(iso)}
                      className={`flex min-w-[3.25rem] flex-col items-center rounded-xl border px-1.5 py-1 text-[10px] transition-colors ${
                        active ? "border-brand/45 bg-brand-soft text-brand" : "border-line bg-surface/80 text-fg"
                      }`}
                    >
                      <span className="font-semibold">{label}</span>
                      {w ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://openweathermap.org/img/wn/${w.iconCode}@2x.png`}
                            alt=""
                            className="h-7 w-7"
                          />
                          <span className="tabular-nums font-medium">{w.maxTempC}°</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle className="mt-0.5 h-6 w-6 text-muted-foreground/50" aria-hidden />
                          <span className="font-medium text-muted-foreground">N/A</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {weatherFetchErr ? (
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{weatherFetchErr}</p>
          ) : null}
          {costPeakFocusDay != null && timelineDay === costPeakFocusDay ? (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-warning/25 bg-warning-soft px-3 py-2 text-[11px] text-warning-foreground">
              <span>Kosten-Peak-Fokus aktiv: Betroffene Schichten sind hervorgehoben.</span>
              <button
                type="button"
                onClick={() => setCostPeakFocusDay(null)}
                className="rounded-md border border-warning/35 bg-surface px-2 py-0.5 font-semibold text-warning-foreground"
              >
                Filter aus
              </button>
            </div>
          ) : null}

          <div className="mt-3 max-h-[75vh] min-w-0 max-w-full overflow-x-auto overflow-y-auto overscroll-contain scrollbar-hide">
            <div className="w-full min-w-[1200px] space-y-4 py-1 lg:min-w-[1400px]">
              <div className="sticky top-0 z-30 grid grid-cols-1 gap-2 border-b border-border bg-background py-2 text-[11px] text-muted-foreground md:grid-cols-[220px_1fr] md:items-center">
                <div className="hidden font-medium text-foreground md:block">Mitarbeiter</div>
                <div className="grid grid-cols-12 font-sans">
                  {Array.from({ length: 12 }).map((_, idx) => {
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
                const weatherConflict =
                  Boolean(timelineWxDay && isRainLikeCondition(timelineWxDay.condition)) &&
                  (row.member.planningWorkArea === "OUTDOOR" || row.member.planningWorkArea === "TERRACE");
                const costPeakFocusActive = costPeakFocusDay != null && timelineDay === costPeakFocusDay;
                const expensiveSet = expensiveShiftIdsByDay.get(timelineDay) ?? new Set<string>();
                const costPeakAffected = Boolean(row.shift && expensiveSet.has(row.shift.id));

                const shiftStart = row.shift ? toMinutes(row.shift.startTime) : null;
                const shiftEnd = row.shift ? toMinutes(row.shift.endTime) : null;
                const overnightCurrent = shiftStart !== null && shiftEnd !== null && shiftEnd < shiftStart;
                const previousStart = row.previousShift ? toMinutes(row.previousShift.startTime) : null;
                const previousEnd = row.previousShift ? toMinutes(row.previousShift.endTime) : null;
                const overnightCarry =
                  previousStart !== null && previousEnd !== null && previousEnd < previousStart ? previousEnd : null;
                const draftForRow = dragDraft?.userId === row.member.id ? dragDraft : null;
                const visualStart =
                  draftForRow?.startMinute ??
                  (shiftStart ?? (overnightCarry !== null ? 0 : null));
                const visualEnd =
                  draftForRow?.endMinute ??
                  (shiftStart !== null && shiftEnd !== null
                    ? overnightCurrent
                      ? TIMELINE_END_HOUR * 60
                      : shiftEnd
                    : overnightCarry);
                const leftPct =
                  visualStart === null
                    ? 0
                    : ((Math.max(visualStart, TIMELINE_START_HOUR * 60) - TIMELINE_START_HOUR * 60) / TIMELINE_TOTAL_MINUTES) * 100;
                const widthPct =
                  visualStart === null || visualEnd === null
                    ? 0
                    : (Math.max(0, Math.min(visualEnd, TIMELINE_END_HOUR * 60) - Math.max(visualStart, TIMELINE_START_HOUR * 60)) / TIMELINE_TOTAL_MINUTES) * 100;
                const initials = (row.member.name ?? row.member.email).slice(0, 2).toUpperCase();
                const barLabel =
                  visualStart !== null && visualEnd !== null
                    ? `${minutesToHHMM(visualStart)}-${minutesToHHMM(visualEnd)}${
                        draftForRow ? "" : overnightCurrent ? " (+1 Tag)" : row.shift ? "" : " (vom Vortag)"
                      }`
                    : "Frei";
                const tradeOpen = Boolean(row.shift?.isOpenForTrade && row.shift?.tradeStatus !== "NONE");
                const rowCompliance = row.shift ? complianceByShiftId.get(row.shift.id) : null;
                const liveDuration =
                  draftForRow && draftForRow.endMinute > draftForRow.startMinute
                    ? draftForRow.endMinute - draftForRow.startMinute
                    : null;
                const livePauseRisk = liveDuration !== null ? liveDuration > 6 * 60 : Boolean(rowCompliance?.pauseRisk);
                const roleTone = getRoleShiftBarTone(row.member.role);
                return (
                  <div
                    key={row.member.id}
                    className="grid grid-cols-1 items-stretch gap-2 md:grid-cols-[220px_1fr] md:items-center md:gap-3"
                  >
                    <div className="flex min-h-12 items-center rounded-2xl border border-border bg-surface px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)] md:min-h-0 md:px-4 md:py-4">
                      <span className="inline-flex min-w-0 items-center gap-2 text-sm text-foreground">
                        <Avatar
                          src={row.member.image}
                          fallback={initials}
                          alt={row.member.name ?? row.member.email}
                          className="h-9 w-9 md:h-7 md:w-7"
                          fallbackClassName="text-[10px] md:text-[9px]"
                        />
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
                              className="absolute top-0 bottom-0 bg-danger/10"
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
                              className="pointer-events-none absolute top-0 bottom-0 w-px bg-surface/[0.08]"
                              style={{ left: `${left}%` }}
                            />
                          );
                        })}
                      </div>
                      {row.conflict ? (
                        <div
                          className={`absolute inset-1 rounded-lg flex items-center justify-center text-xs font-semibold ${
                            row.conflict === "SICK"
                              ? "bg-danger-soft text-danger-foreground"
                              : "bg-warning-soft text-warning-foreground"
                          }`}
                        >
                          {row.conflict === "SICK" ? "Krank (gesperrt)" : "Urlaub (gesperrt)"}
                        </div>
                      ) : widthPct > 0 ? (
                        <>
                          {!draftForRow && overnightCurrent && shiftEnd !== null ? (
                            <div
                              className="absolute top-1.5 bottom-1.5 z-[9] flex items-center gap-1 rounded-lg border border-brand/35 bg-brand-soft px-2 text-[10px] font-semibold text-brand"
                              style={{ left: "0%", width: `${(shiftEnd / TIMELINE_TOTAL_MINUTES) * 100}%` }}
                              title={`Next Day ${minutesToHHMM(0)}-${minutesToHHMM(shiftEnd)}`}
                            >
                              <CornerDownRight className="h-3 w-3" />
                              <span>Next Day</span>
                            </div>
                          ) : null}
                          <div
                            className={`group absolute top-1.5 bottom-1.5 z-10 flex cursor-grab touch-manipulation items-center rounded-lg border px-2 text-[11px] active:cursor-grabbing ${
                              row.shift?.isDraft
                                ? "border-dashed border-brand/60 bg-[repeating-linear-gradient(-45deg,rgba(22,101,52,0.28)_0px,rgba(22,101,52,0.28)_6px,transparent_6px,transparent_12px)] text-brand"
                                : tradeOpen
                                  ? "border-warning/40 bg-warning-soft text-warning-foreground"
                                  : roleTone
                            } ${
                              activeDrag?.userId === row.member.id
                                ? "shadow-lg shadow-black/40 transition-none"
                                : "transition-[left,width] duration-100 ease-out"
                            } ${flashAssignedKey === `${row.member.id}-${timelineDay}` ? "ring-2 ring-brand/55 animate-pulse" : ""} ${
                              row.shift && selectedShiftIds.includes(row.shift.id) ? "ring-2 ring-brand/75" : ""
                            } ${weatherConflict ? "ring-2 ring-warning/80 animate-pulse" : ""} ${
                              costPeakFocusActive && !costPeakAffected ? "opacity-30 [filter:grayscale(35%)]" : ""
                            } ${costPeakFocusActive && costPeakAffected ? "ring-2 ring-warning/85 animate-pulse" : ""}`}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            title={
                              row.shift?.isDraft
                                ? `${barLabel} — Autopilot-Entwurf (noch nicht veröffentlicht)`
                                : weatherConflict
                                  ? `${barLabel} — Wetter-Konflikt: Hohe Regenwahrscheinlichkeit für Außenbereich.`
                                  : costPeakFocusActive && costPeakAffected
                                    ? `${barLabel} — Kosten-Peak: überdurchschnittliche Lohnkosten.`
                                    : barLabel
                            }
                            onPointerDown={(e) => {
                              if (e.pointerType === "mouse" && e.button !== 0) return;
                              if (!row.shift || row.conflict) return;
                              if (row.shift.isDraft) return;
                              setTimelineFocusedUserId(row.member.id);
                              const shiftStartAbs = row.shift.dayOfWeek * 24 * 60 + (toMinutes(row.shift.startTime) ?? 0);
                              if (e.shiftKey) {
                                if (bulkAnchor && bulkAnchor.userId === row.member.id) {
                                  const [minAbs, maxAbs] = [Math.min(bulkAnchor.absoluteStart, shiftStartAbs), Math.max(bulkAnchor.absoluteStart, shiftStartAbs)];
                                  const rangeIds = shifts
                                    .filter((s) => s.userId === row.member.id && s.weekIndex === selectedWeekIndex)
                                    .filter((s) => {
                                      const abs = s.dayOfWeek * 24 * 60 + (toMinutes(s.startTime) ?? 0);
                                      return abs >= minAbs && abs <= maxAbs;
                                    })
                                    .map((s) => s.id);
                                  setSelectedShiftIds(rangeIds);
                                } else {
                                  const rowIds = shifts
                                    .filter((s) => s.userId === row.member.id && s.weekIndex === selectedWeekIndex)
                                    .map((s) => s.id);
                                  setSelectedShiftIds(rowIds);
                                }
                                setBulkAnchor({ userId: row.member.id, absoluteStart: shiftStartAbs });
                                e.stopPropagation();
                                return;
                              }
                              if (e.metaKey || e.ctrlKey) {
                                e.stopPropagation();
                                setSelectedShiftIds((prev) =>
                                  prev.includes(row.shift!.id) ? prev.filter((id) => id !== row.shift!.id) : [...prev, row.shift!.id]
                                );
                                setBulkAnchor({ userId: row.member.id, absoluteStart: shiftStartAbs });
                                return;
                              }
                              setSelectedShiftIds([row.shift.id]);
                              setBulkAnchor({ userId: row.member.id, absoluteStart: shiftStartAbs });
                              const lane = (e.currentTarget as HTMLElement).closest("[data-timeline-lane]");
                              if (!(lane instanceof HTMLElement)) return;
                              const sm = toMinutes(row.shift.startTime);
                              const em = toMinutes(row.shift.endTime);
                              if (sm === null || em === null) return;
                              const target = e.target as HTMLElement;
                              const isResizeStart = Boolean(target.closest("[data-resize-handle='start']"));
                              const isResizeEnd = Boolean(target.closest("[data-resize-handle='end']"));
                              const mode = isResizeStart ? "resize-start" : isResizeEnd ? "resize-end" : "move";
                              e.stopPropagation();
                              beginTimelineDrag(e.clientX, lane, row.member.id, mode, sm, em, e.pointerId);
                            }}
                            onContextMenu={(e) => {
                              if (!row.shift) return;
                              e.preventDefault();
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                shiftId: row.shift.id,
                                userId: row.member.id,
                                dayOfWeek: timelineDay,
                                startTime: row.shift.startTime,
                                endTime: row.shift.endTime,
                                breakDuration: row.shift.breakDuration ?? 0,
                                occurrenceDateIso: timelineDate,
                              });
                              setContextMenuIndex(0);
                            }}
                          >
                            <span
                              data-resize-handle="start"
                              className="absolute left-0 top-0 bottom-0 hidden w-3 cursor-ew-resize items-center justify-center md:flex"
                            >
                              <span className="pointer-events-none grid-cols-1 gap-0.5 md:grid opacity-0 transition-opacity group-hover:opacity-90">
                                <span className="h-1 w-0.5 rounded bg-current/80" />
                                <span className="h-1 w-0.5 rounded bg-current/80" />
                                <span className="h-1 w-0.5 rounded bg-current/80" />
                              </span>
                            </span>
                            <span
                              data-resize-handle="end"
                              className="absolute right-0 top-0 bottom-0 hidden w-3 cursor-ew-resize items-center justify-center md:flex"
                            >
                              <span className="pointer-events-none grid-cols-1 gap-0.5 md:grid opacity-0 transition-opacity group-hover:opacity-90">
                                <span className="h-1 w-0.5 rounded bg-current/80" />
                                <span className="h-1 w-0.5 rounded bg-current/80" />
                                <span className="h-1 w-0.5 rounded bg-current/80" />
                              </span>
                            </span>
                            {tradeOpen ? <span className="mr-1 text-[10px]">🔄</span> : null}
                            {livePauseRisk ? (
                              <span className="mr-0.5 inline-flex shrink-0" title="Über 6h Soll: Pause prüfen">
                                <Coffee className="h-3.5 w-3.5 text-danger" aria-hidden />
                              </span>
                            ) : null}
                            {rowCompliance?.restRisk ? (
                              <span className="mr-0.5 inline-flex shrink-0" title="Ruhezeit unter 11 Stunden">
                                <AlarmClock className="h-3.5 w-3.5 text-warning" aria-hidden />
                              </span>
                            ) : null}
                            {!activeDrag && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMessage(null);
                                  startTransition(async () => {
                                    try {
                                      await clearShiftForDay({
                                        userId: row.member.id,
                                        weekIndex: selectedWeekIndex,
                                        dayOfWeek: timelineDay,
                                      });
                                    } catch (err: unknown) {
                                      setMessage(
                                        err instanceof Error
                                          ? err.message
                                          : "Schicht konnte nicht gelöscht werden. Bitte erneut versuchen."
                                      );
                                    }
                                  });
                                }}
                                aria-label="Schicht löschen"
                                className="absolute -right-1 -top-1 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-danger/40 bg-danger px-2 text-sm text-brand-foreground opacity-100 md:h-7 md:w-7 md:text-xs md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                                title="Schicht löschen"
                              >
                                ×
                              </button>
                            )}
                            <span className="font-semibold drop-shadow-[0_1px_1px_rgba(255,255,255,0.25)]">{barLabel}</span>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-1 flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/35 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                          Frei
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {contextMenu ? (
            <div
              className="fixed z-[160] min-w-[170px] rounded-lg border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                type="button"
                className={`block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-muted ${contextMenuIndex === 0 ? "bg-muted" : ""}`}
                onClick={() => {
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
                  setContextMenu(null);
                }}
              >
                Duplizieren
              </button>
              <button
                type="button"
                className={`block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-muted ${contextMenuIndex === 1 ? "bg-muted" : ""}`}
                onClick={() => {
                  startTransition(async () => {
                    await toggleShiftTradeOffer(contextMenu.shiftId, true);
                  });
                  setContextMenu(null);
                }}
              >
                Tausch anfragen
              </button>
              <button
                type="button"
                className={`block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-muted ${contextMenuIndex === 2 ? "bg-muted" : ""}`}
                onClick={() => {
                  startTransition(async () => {
                    await setShiftBreakDuration(contextMenu.shiftId, 30);
                  });
                  setContextMenu(null);
                }}
              >
                30 Min Pause
              </button>
              <button
                type="button"
                className={`block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-muted ${contextMenuIndex === 3 ? "bg-muted" : ""}`}
                onClick={() => {
                  startTransition(async () => {
                    await setShiftBreakDuration(contextMenu.shiftId, 45);
                  });
                  setContextMenu(null);
                }}
              >
                45 Min Pause
              </button>
              {enableTaskListActions ? (
                <button
                  type="button"
                  className={`block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-muted ${contextMenuIndex === 4 ? "bg-muted" : ""}`}
                  onClick={() => {
                    startTransition(async () => {
                      await generateTaskListForShift(contextMenu.shiftId, contextMenu.occurrenceDateIso);
                    });
                    setContextMenu(null);
                  }}
                >
                  Checkliste für diesen Tag
                </button>
              ) : null}
            </div>
          ) : null}
          {selectedShiftIds.length > 0 && (bulkMenuOpen || selectedShiftIds.length > 1) ? (
            <div className="fixed bottom-24 right-6 z-[160] min-w-[220px] rounded-xl border border-border bg-surface/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur">
              <p className="px-2 py-1 text-[11px] font-semibold text-foreground">{selectedShiftIds.length} Schichten gewählt</p>
              <button
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
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
                      targets.map((s) =>
                        clearShiftForDay({ userId: s.userId, weekIndex: s.weekIndex, dayOfWeek: s.dayOfWeek })
                      )
                    );
                    const failed = results.filter((r) => r.status === "rejected").length;
                    if (failed > 0) {
                      setMessage(
                        failed === targets.length
                          ? "Schichten konnten nicht gelöscht werden. Bitte erneut versuchen."
                          : `${failed} von ${targets.length} Schichten konnten nicht gelöscht werden.`
                      );
                    }
                  });
                  setBulkUndo({ label: "Schichten gelöscht", items: undoItems });
                  setBulkUndoDeadlineMs(Date.now() + 5000);
                  setSelectedShiftIds([]);
                  setBulkMenuOpen(false);
                }}
              >
                Alle löschen
              </button>
              <button
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
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
                    await Promise.all(
                      targets.map((s) =>
                        setShiftForDay({
                          userId: s.userId,
                          weekIndex: s.weekIndex,
                          dayOfWeek: s.dayOfWeek,
                          startTime: addMinutesToHHMM(s.startTime, 60),
                          endTime: addMinutesToHHMM(s.endTime, 60),
                          breakDuration: s.breakDuration ?? 0,
                        })
                      )
                    );
                  });
                  setBulkUndo({ label: "Schichten verschoben", items: undoItems });
                  setBulkUndoDeadlineMs(Date.now() + 5000);
                  setSelectedShiftIds([]);
                  setBulkMenuOpen(false);
                }}
              >
                Alle um 1 Std verschieben
              </button>
              <button
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
                  const targets = shifts.filter((s) => selectedShiftIds.includes(s.id));
                  startTransition(async () => {
                    await Promise.all(targets.map((s) => setShiftBreakDuration(s.id, 30)));
                  });
                  setSelectedShiftIds([]);
                  setBulkMenuOpen(false);
                }}
              >
                Allen 30 Min Pause hinzufügen
              </button>
            </div>
          ) : null}
          {bulkUndo ? (
            <div className="fixed bottom-7 right-6 z-[170] rounded-xl border border-border bg-surface/95 px-3 py-2 text-xs shadow-[0_14px_36px_rgba(0,0,0,0.2)] backdrop-blur">
              <span className="mr-3 text-foreground">{bulkUndo.label}</span>
              <button
                type="button"
                className="font-semibold text-brand underline underline-offset-2"
                onClick={() => {
                  const restore = bulkUndo.items;
                  startTransition(async () => {
                    await Promise.all(
                      restore.map((s) =>
                        setShiftForDay({
                          userId: s.userId,
                          weekIndex: s.weekIndex,
                          dayOfWeek: s.dayOfWeek,
                          startTime: s.startTime,
                          endTime: s.endTime,
                          breakDuration: s.breakDuration,
                        })
                      )
                    );
                  });
                  setBulkUndo(null);
                  setBulkUndoDeadlineMs(null);
                }}
              >
                Aktion rückgängig machen
              </button>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-100"
                  style={{
                    width: `${
                      bulkUndoDeadlineMs
                        ? Math.max(0, Math.min(100, ((bulkUndoDeadlineMs - undoNowMs) / 5000) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
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
      {!renderDesktopTree ? (
        <div className="block">
          <h2 className="text-lg font-semibold tracking-tight">Einfach-Planer</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Mitarbeiter, Zeiten und Wochentage – nur diese Planung, kein Timeline-Modus.
          </p>
          {weekPicker}
          {selectedMemberChip}
          {MobileView}
        </div>
      ) : null}

      {renderDesktopTree ? (
        <div className="block">
          <h2 className="text-lg font-semibold tracking-tight">Arbeitsplan (Soll-Zeiten)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Starter+: Leitung plant Mitarbeiter, System macht Soll/Ist beim Stempeln.
          </p>
          {weekPicker}
          {selectedMemberChip}
          {DesktopView}
        </div>
      ) : null}

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
                    dayOfWeek: timelineDay,
                    startTime: minutesToHHMM(s),
                    endTime: endTimeValue,
                  });
                  setShiftEdit(null);
                  setMessage("Schicht gespeichert.");
                } catch (err: unknown) {
                  setMessage(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
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
                    } catch (err: unknown) {
                      setMessage(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
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
                      await clearShiftForDay({
                        userId: shiftEdit.userId,
                        weekIndex: selectedWeekIndex,
                        dayOfWeek: shiftEdit.dayOfWeek,
                      });
                      setShiftEdit(null);
                      setMessage("Schicht gelöscht.");
                    } catch (err: unknown) {
                      setMessage(err instanceof Error ? err.message : "Löschen fehlgeschlagen.");
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
        <div className="mt-4 space-y-2 rounded-xl border border-border bg-background px-3 py-3 text-[11px] text-muted-foreground">
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
