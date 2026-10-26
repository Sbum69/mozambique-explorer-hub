/**
 * Live weather from Open-Meteo (free, no key) for the real coordinates of the destinations.
 * Pure helpers here; the network call lives in weather.functions.ts. Malformed data is rejected,
 * never filled in: the UI then shows "unavailable" instead of invented numbers.
 */

export const WEATHER_SOURCE = "Open-Meteo";
export const WEATHER_CACHE_MS = 60 * 60 * 1000;

export type WeatherKind = "clear" | "cloud" | "fog" | "rain" | "storm";

export interface WeatherPlace {
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

export interface WeatherDay {
  date: string;
  kind: WeatherKind;
  maxC: number;
  minC: number;
}

export interface WeatherCity {
  slug: string;
  name: string;
  tempC: number;
  windKmh: number;
  kind: WeatherKind;
  observedAt: string;
  days: WeatherDay[];
}

export type WeatherReport =
  | { status: "ok"; fetchedAt: string; source: string; cities: WeatherCity[] }
  | { status: "unavailable"; source: string };

/** WMO weather interpretation codes (Open-Meteo docs) grouped into the icons the app shows. */
export function weatherKind(code: number): WeatherKind {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  return "rain";
}

export const WEATHER_LABEL: Record<WeatherKind, { pt: string; en: string }> = {
  clear: { pt: "Céu limpo", en: "Clear sky" },
  cloud: { pt: "Nublado", en: "Cloudy" },
  fog: { pt: "Nevoeiro", en: "Fog" },
  rain: { pt: "Chuva", en: "Rain" },
  storm: { pt: "Trovoada", en: "Thunderstorm" },
};

export function openMeteoUrl(places: WeatherPlace[]): string {
  const p = new URLSearchParams({
    latitude: places.map((x) => x.lat).join(","),
    longitude: places.map((x) => x.lng).join(","),
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "Africa/Maputo",
    forecast_days: "4",
  });
  return `https://api.open-meteo.com/v1/forecast?${p.toString()}`;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

interface OpenMeteoLocation {
  current?: {
    time?: unknown;
    temperature_2m?: unknown;
    weather_code?: unknown;
    wind_speed_10m?: unknown;
  };
  daily?: {
    time?: unknown;
    weather_code?: unknown;
    temperature_2m_max?: unknown;
    temperature_2m_min?: unknown;
  };
}

/** Maps an Open-Meteo response (one object, or an array for several coordinates) onto the places. */
export function parseOpenMeteo(json: unknown, places: WeatherPlace[]): WeatherCity[] {
  const list = (Array.isArray(json) ? json : [json]) as OpenMeteoLocation[];
  if (list.length !== places.length) throw new Error("WEATHER_SHAPE");
  return places.map((place, i) => {
    const { current: c, daily: d } = list[i] ?? {};
    if (
      !c ||
      !isNum(c.temperature_2m) ||
      !isNum(c.weather_code) ||
      !isNum(c.wind_speed_10m) ||
      typeof c.time !== "string"
    ) {
      throw new Error("WEATHER_SHAPE");
    }
    const times = Array.isArray(d?.time) ? (d.time as unknown[]) : [];
    const codes = (d?.weather_code ?? []) as unknown[];
    const max = (d?.temperature_2m_max ?? []) as unknown[];
    const min = (d?.temperature_2m_min ?? []) as unknown[];
    const days: WeatherDay[] = [];
    times.forEach((t, k) => {
      if (typeof t === "string" && isNum(codes[k]) && isNum(max[k]) && isNum(min[k])) {
        days.push({
          date: t,
          kind: weatherKind(codes[k] as number),
          maxC: Math.round(max[k] as number),
          minC: Math.round(min[k] as number),
        });
      }
    });
    return {
      slug: place.slug,
      name: place.name,
      tempC: Math.round(c.temperature_2m),
      windKmh: Math.round(c.wind_speed_10m),
      kind: weatherKind(c.weather_code),
      observedAt: c.time,
      days,
    };
  });
}

/** Fetches and validates the report; any failure (network, HTTP, malformed body) becomes "unavailable". */
export async function fetchWeatherReport(
  places: WeatherPlace[],
  fetchImpl: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<WeatherReport> {
  if (!places.length) return { status: "unavailable", source: WEATHER_SOURCE };
  try {
    const res = await fetchImpl(openMeteoUrl(places), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cities = parseOpenMeteo(await res.json(), places);
    return { status: "ok", fetchedAt: now().toISOString(), source: WEATHER_SOURCE, cities };
  } catch (e) {
    console.error("[weather] unavailable:", e instanceof Error ? e.message : e);
    return { status: "unavailable", source: WEATHER_SOURCE };
  }
}
