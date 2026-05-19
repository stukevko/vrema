import type { DailyWeatherForecast, WeatherConditionKind } from "@/lib/weather/shared";

type GeoResult = { lat: number; lon: number };

function wmoToCondition(code: number): WeatherConditionKind {
  if (code === 0) return "CLEAR";
  if (code <= 3) return "CLOUDS";
  if (code <= 48) return "CLOUDS";
  if (code <= 67) return "RAIN";
  if (code <= 77) return "SNOW";
  if (code <= 82) return "RAIN";
  return "OTHER";
}

function wmoToIcon(code: number): string {
  if (code === 0) return "01d";
  if (code <= 3) return "02d";
  if (code <= 48) return "03d";
  if (code <= 67) return "10d";
  if (code <= 77) return "13d";
  return "09d";
}

/** PLZ oder Ort → Koordinaten (kostenlos, kein API-Key). */
export async function geocodeForOpenMeteo(
  zip: string | null | undefined,
  city: string | null | undefined,
): Promise<GeoResult | null> {
  const z = zip?.trim();
  const c = city?.trim();
  const q = z && /^\d{5}$/.test(z) ? z : c;
  if (!q) return null;

  const params = new URLSearchParams({
    name: q,
    count: "1",
    language: "de",
    format: "json",
  });
  if (z && /^\d{5}$/.test(z)) params.set("countryCode", "DE");

  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { results?: Array<{ latitude: number; longitude: number }> };
  const hit = json.results?.[0];
  if (!hit || typeof hit.latitude !== "number" || typeof hit.longitude !== "number") return null;
  return { lat: hit.latitude, lon: hit.longitude };
}

/** Bis zu 16 Tage Tagesprognose — deckt 2–3 Planwochen ab. */
export async function fetchOpenMeteoDaily(
  lat: number,
  lon: number,
  forecastDays = 16,
): Promise<DailyWeatherForecast[]> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: "weathercode,temperature_2m_max",
    timezone: "Europe/Berlin",
    forecast_days: String(Math.min(16, Math.max(1, forecastDays))),
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    daily?: {
      time?: string[];
      weathercode?: number[];
      temperature_2m_max?: number[];
    };
  };
  const times = json.daily?.time ?? [];
  const codes = json.daily?.weathercode ?? [];
  const temps = json.daily?.temperature_2m_max ?? [];

  const out: DailyWeatherForecast[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const date = times[i]?.slice(0, 10);
    if (!date) continue;
    const code = codes[i] ?? 3;
    const cond = wmoToCondition(code);
    out.push({
      date,
      maxTempC: Math.round((temps[i] ?? 0) * 10) / 10,
      condition: cond,
      openWeatherMain: cond === "RAIN" ? "Rain" : cond === "CLEAR" ? "Clear" : "Clouds",
      iconCode: wmoToIcon(code),
    });
  }
  return out;
}

/** `prefer` überschreibt gleiche Tage in `base` (z. B. OpenWeather präziser für die ersten Tage). */
export function mergeDailyForecasts(
  base: DailyWeatherForecast[],
  prefer: DailyWeatherForecast[],
): DailyWeatherForecast[] {
  const map = new Map<string, DailyWeatherForecast>();
  for (const d of base) map.set(d.date, d);
  for (const d of prefer) map.set(d.date, d);
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
