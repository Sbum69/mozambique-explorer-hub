/**
 * Live weather from MET Norway (api.met.no, Locationforecast 2.0 "compact") for the real
 * coordinates of the destinations. Free, commercial use allowed under CC BY 4.0 / NLOD 2.0 with
 * attribution ("Data from MET Norway"). Terms: identify the app in the User-Agent, coordinates with
 * at most 4 decimals, never repeat a request before its Expires time, stay far below 20 requests/s
 * (https://api.met.no/doc/TermsOfService). Only the server calls it (weather.functions.ts), with a
 * cache, so visitors' IP addresses never reach MET Norway.
 * Pure helpers here. Malformed data is rejected, never filled in: the UI then shows "unavailable".
 */
import { APP_VERSION, CANONICAL_ORIGIN } from "@/lib/app-info";

export const WEATHER_SOURCE = "MET Norway";
export const WEATHER_SOURCE_URL = "https://www.met.no/en";
export const WEATHER_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
/** Minimum time between two reports; MET Norway's Expires header can make it longer. */
export const WEATHER_CACHE_MS = 60 * 60 * 1000;
/** Requests in flight at the same time (one per destination). */
const PARALLEL = 3;
/** Africa/Maputo is UTC+2 all year (no daylight saving). */
const MAPUTO_OFFSET_MS = 2 * 60 * 60 * 1000;
export const MET_USER_AGENT = `EkayaExplore/${APP_VERSION} ${CANONICAL_ORIGIN}`;

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

/** MET Norway symbol codes (e.g. "partlycloudy_day", "lightrainshowers_night") → app icons. */
export function metKind(symbol: string): WeatherKind {
  const s = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (s.includes("thunder")) return "storm";
  if (s === "clearsky" || s === "fair") return "clear";
  if (s === "partlycloudy" || s === "cloudy") return "cloud";
  if (s === "fog") return "fog";
  return "rain";
}

export const WEATHER_LABEL: Record<WeatherKind, { pt: string; en: string }> = {
  clear: { pt: "Céu limpo", en: "Clear sky" },
  cloud: { pt: "Nublado", en: "Cloudy" },
  fog: { pt: "Nevoeiro", en: "Fog" },
  rain: { pt: "Chuva", en: "Rain" },
  storm: { pt: "Trovoada", en: "Thunderstorm" },
};

/** Coordinates truncated to 4 decimals, as the terms require (more decimals get 403). */
export function metUrl(place: WeatherPlace): string {
  const t = (n: number) => (Math.trunc(n * 1e4) / 1e4).toString();
  return `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${t(place.lat)}&lon=${t(place.lng)}`;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const symbolOf = (v: unknown): string | null =>
  typeof v === "string" && /^[a-z_]+$/.test(v) ? v : null;

interface MetStep {
  time?: unknown;
  data?: {
    instant?: { details?: { air_temperature?: unknown; wind_speed?: unknown } };
    next_1_hours?: { summary?: { symbol_code?: unknown } };
    next_6_hours?: { summary?: { symbol_code?: unknown } };
  };
}

/** Local calendar day (Maputo) of an ISO instant. */
const maputoDay = (iso: string) =>
  new Date(Date.parse(iso) + MAPUTO_OFFSET_MS).toISOString().slice(0, 10);
const maputoHour = (iso: string) => new Date(Date.parse(iso) + MAPUTO_OFFSET_MS).getUTCHours();

/** One Locationforecast "compact" response → current conditions and up to 4 local days. */
export function parseMet(json: unknown, place: WeatherPlace): WeatherCity {
  const steps = ((json as { properties?: { timeseries?: unknown } })?.properties?.timeseries ??
    []) as MetStep[];
  if (!Array.isArray(steps) || !steps.length) throw new Error("WEATHER_SHAPE");
  const first = steps[0];
  const temp = first.data?.instant?.details?.air_temperature;
  const wind = first.data?.instant?.details?.wind_speed;
  const symbol =
    symbolOf(first.data?.next_1_hours?.summary?.symbol_code) ??
    symbolOf(first.data?.next_6_hours?.summary?.symbol_code);
  if (typeof first.time !== "string" || !isNum(temp) || !isNum(wind) || !symbol)
    throw new Error("WEATHER_SHAPE");

  // Daily max/min from the hourly (then 6-hourly) temperatures of each local day; the icon is the
  // 6-hour symbol closest to midday.
  const byDay = new Map<string, { temps: number[]; symbol: string | null; dist: number }>();
  for (const s of steps) {
    const t = s.data?.instant?.details?.air_temperature;
    if (typeof s.time !== "string" || !isNum(t)) continue;
    const day = maputoDay(s.time);
    const entry = byDay.get(day) ?? { temps: [], symbol: null, dist: 99 };
    entry.temps.push(t);
    const six = symbolOf(s.data?.next_6_hours?.summary?.symbol_code);
    const dist = Math.abs(maputoHour(s.time) - 12);
    if (six && dist < entry.dist) {
      entry.symbol = six;
      entry.dist = dist;
    }
    byDay.set(day, entry);
  }
  const days: WeatherDay[] = [...byDay.entries()]
    .filter(([, e]) => e.symbol && e.temps.length >= 2)
    .slice(0, 4)
    .map(([date, e]) => ({
      date,
      kind: metKind(e.symbol as string),
      maxC: Math.round(Math.max(...e.temps)),
      minC: Math.round(Math.min(...e.temps)),
    }));

  return {
    slug: place.slug,
    name: place.name,
    tempC: Math.round(temp),
    windKmh: Math.round(wind * 3.6),
    kind: metKind(symbol),
    observedAt: first.time,
    days,
  };
}

/** Expires header as a timestamp, or null. */
export function expiresAt(res: Response): number | null {
  const v = Date.parse(res.headers.get("expires") ?? "");
  return Number.isFinite(v) ? v : null;
}

export interface WeatherFetchResult {
  report: WeatherReport;
  /** Do not ask MET Norway again before this time (latest Expires of the responses). */
  notBefore: number;
}

/**
 * Fetches every destination (a few at a time) and validates each answer. A destination that fails
 * is left out; if none answers, the report is "unavailable".
 */
export async function fetchWeatherReport(
  places: WeatherPlace[],
  fetchImpl: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<WeatherFetchResult> {
  const start = now().getTime();
  const unavailable = (): WeatherFetchResult => ({
    report: { status: "unavailable", source: WEATHER_SOURCE },
    notBefore: start,
  });
  if (!places.length) return unavailable();
  const cities: (WeatherCity | null)[] = new Array(places.length).fill(null);
  let notBefore = start + WEATHER_CACHE_MS;
  let next = 0;
  const worker = async () => {
    while (next < places.length) {
      const i = next++;
      try {
        const res = await fetchImpl(metUrl(places[i]), {
          headers: { "User-Agent": MET_USER_AGENT, Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const exp = expiresAt(res);
        if (exp && exp > notBefore) notBefore = exp;
        cities[i] = parseMet(await res.json(), places[i]);
      } catch (e) {
        console.error(
          "[weather] unavailable:",
          places[i].slug,
          e instanceof Error ? e.message : String(e),
        );
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, places.length) }, worker));
  const ok = cities.filter((c): c is WeatherCity => c !== null);
  if (!ok.length) return unavailable();
  return {
    report: {
      status: "ok",
      fetchedAt: now().toISOString(),
      source: WEATHER_SOURCE,
      cities: ok,
    },
    notBefore,
  };
}
