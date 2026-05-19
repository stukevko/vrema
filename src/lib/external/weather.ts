import { db } from "@/lib/db";
import type { DailyWeatherForecast, WeatherConditionKind } from "@/lib/weather/shared";
import { getBerlinDateKey } from "@/lib/time/timezone";
import {
  fetchOpenMeteoDaily,
  geocodeForOpenMeteo,
  mergeDailyForecasts,
} from "@/lib/external/open-meteo-weather";

const CACHE_MS = 3 * 60 * 60 * 1000;

type OwmListItem = {
  dt: number;
  main: { temp_max?: number; temp?: number };
  weather: Array<{ main: string; icon: string }>;
};

type CachedPayload = {
  daily: DailyWeatherForecast[];
  queryKey: string;
};
type WeeklyWeatherResult = {
  daily: DailyWeatherForecast[];
  queryKey: string | null;
  stale: boolean;
  error?: "no_location" | "upstream";
};
const weatherInFlightByCompany = new Map<string, Promise<WeeklyWeatherResult>>();

function berlinDateKeyFromUnix(sec: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(sec * 1000));
}

function mapMainToCondition(main: string): WeatherConditionKind {
  const m = main.toLowerCase();
  if (m === "rain" || m === "drizzle" || m === "thunderstorm") return "RAIN";
  if (m === "snow") return "SNOW";
  if (m === "clear") return "CLEAR";
  if (m === "clouds") return "CLOUDS";
  return "OTHER";
}

function rankCondition(a: WeatherConditionKind, b: WeatherConditionKind): WeatherConditionKind {
  const order: WeatherConditionKind[] = ["RAIN", "SNOW", "OTHER", "CLOUDS", "CLEAR"];
  return order.indexOf(a) <= order.indexOf(b) ? a : b;
}

function aggregateForecast(list: OwmListItem[]): DailyWeatherForecast[] {
  const byDay = new Map<
    string,
    { maxT: number; condition: WeatherConditionKind; main: string; icon: string }
  >();

  for (const item of list) {
    const key = berlinDateKeyFromUnix(item.dt);
    const t = item.main.temp_max ?? item.main.temp ?? 0;
    const main = item.weather[0]?.main ?? "Clear";
    const icon = item.weather[0]?.icon ?? "01d";
    const cond = mapMainToCondition(main);
    const prev = byDay.get(key);
    if (!prev) {
      byDay.set(key, { maxT: t, condition: cond, main, icon });
    } else {
      byDay.set(key, {
        maxT: Math.max(prev.maxT, t),
        condition: rankCondition(cond, prev.condition),
        main: rankCondition(cond, prev.condition) === cond ? main : prev.main,
        icon: rankCondition(cond, prev.condition) === cond ? icon : prev.icon,
      });
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      maxTempC: Math.round(v.maxT * 10) / 10,
      condition: v.condition,
      openWeatherMain: v.main,
      iconCode: v.icon,
    }));
}

function buildQueryKey(zip: string | null | undefined, city: string | null | undefined): string | null {
  const z = zip?.trim();
  const c = city?.trim();
  if (z) return `zip:${z}`;
  if (c) return `city:${c}`;
  return null;
}

async function geocode(queryKey: string): Promise<{ lat: number; lon: number } | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;

  let url: string;
  if (queryKey.startsWith("zip:")) {
    const zip = encodeURIComponent(queryKey.slice(4));
    url = `https://api.openweathermap.org/geo/1.0/zip?zip=${zip},DE&appid=${key}`;
  } else if (queryKey.startsWith("city:")) {
    const q = encodeURIComponent(`${queryKey.slice(5)},DE`);
    url = `https://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=1&appid=${key}`;
  } else {
    return null;
  }

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = (await res.json()) as
    | { lat: number; lon: number }
    | Array<{ lat: number; lon: number }>;

  if (Array.isArray(data)) {
    const first = data[0];
    return first ? { lat: first.lat, lon: first.lon } : null;
  }
  if (data && typeof data.lat === "number" && typeof data.lon === "number") {
    return { lat: data.lat, lon: data.lon };
  }
  return null;
}

async function fetchForecast(lat: number, lon: number): Promise<OwmListItem[]> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return [];
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  const json = (await res.json()) as { list?: OwmListItem[] };
  return json.list ?? [];
}

/**
 * Liefert bis zu 5–6 Tage (OpenWeather 2.5 Forecast), nach Kalendertag aggregiert.
 * Nutzt WeatherCache (3h TTL) und require keine Session – companyId muss valid sein.
 */
export async function getWeeklyWeatherForCompany(companyId: string): Promise<WeeklyWeatherResult> {
  const company = await db.company.findFirst({
    where: { id: companyId },
    select: {
      locationZip: true,
      locationCity: true,
    },
  });
  if (!company) {
    return { daily: [], queryKey: null, stale: false, error: "no_location" };
  }

  const queryKey = buildQueryKey(company.locationZip, company.locationCity);
  if (!queryKey) {
    return { daily: [], queryKey: null, stale: false, error: "no_location" };
  }

  const cached = await db.weatherCache.findUnique({
    where: { companyId },
  });
  const now = Date.now();
  if (cached && cached.queryKey === queryKey && now - cached.fetchedAt.getTime() < CACHE_MS) {
    const payload = cached.payload as unknown as CachedPayload;
    if (payload?.daily && Array.isArray(payload.daily)) {
      return { daily: payload.daily, queryKey, stale: false };
    }
  }

  let geo = await geocode(queryKey);
  if (!geo) {
    geo = await geocodeForOpenMeteo(company.locationZip, company.locationCity);
  }
  if (!geo) {
    return { daily: [], queryKey, stale: false, error: "upstream" };
  }

  /** Open-Meteo: 16 Tage — für 2–3 Planwochen im Zyklus. */
  const openMeteoDaily = await fetchOpenMeteoDaily(geo.lat, geo.lon, 16);

  let daily = openMeteoDaily;
  if (process.env.OPENWEATHER_API_KEY) {
    const list = await fetchForecast(geo.lat, geo.lon);
    if (list.length > 0) {
      const owmDaily = aggregateForecast(list);
      daily = mergeDailyForecasts(openMeteoDaily, owmDaily);
    }
  }

  if (daily.length === 0) {
    return { daily: [], queryKey, stale: false, error: "upstream" };
  }

  await db.weatherCache.upsert({
    where: { companyId },
    create: {
      companyId,
      queryKey,
      payload: { daily, queryKey } satisfies CachedPayload,
      fetchedAt: new Date(),
    },
    update: {
      queryKey,
      payload: { daily, queryKey },
      fetchedAt: new Date(),
    },
  });

  return { daily, queryKey, stale: false };
}

/**
 * Deduped pro Company für gleichzeitig eintreffende Requests.
 * Verhindert mehrfachen Upstream-/DB-Zugriff im selben Zeitfenster.
 */
export async function getWeeklyWeatherForCompanyMemoized(companyId: string): Promise<WeeklyWeatherResult> {
  const existing = weatherInFlightByCompany.get(companyId);
  if (existing) return existing;
  const next = getWeeklyWeatherForCompany(companyId).finally(() => {
    weatherInFlightByCompany.delete(companyId);
  });
  weatherInFlightByCompany.set(companyId, next);
  return next;
}

/** Kalenderwoche ab Montag (gleiche Logik wie Dashboard-AI: lokales Datum des Servers/Clients). */
export function mondayOfWeekContaining(isoDate: string): string {
  const base = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) {
    return mondayOfWeekContaining(getBerlinDateKey(new Date()));
  }
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dayStr = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayStr}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 7 Tage Mo–So; fehlende Forecast-Tage werden mit Platzhalter aufgefüllt */
export function sliceWeekFromMonday(
  mondayIso: string,
  daily: DailyWeatherForecast[]
): Array<DailyWeatherForecast | null> {
  const map = new Map(daily.map((d) => [d.date, d]));
  const out: Array<DailyWeatherForecast | null> = [];
  for (let i = 0; i < 7; i++) {
    const key = addDaysIso(mondayIso, i);
    out.push(map.get(key) ?? null);
  }
  return out;
}
