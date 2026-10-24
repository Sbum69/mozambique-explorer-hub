import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  WEATHER_CACHE_MS,
  WEATHER_SOURCE,
  fetchWeatherReport,
  type WeatherReport,
} from "./weather";

// One cached report per server instance; Open-Meteo updates hourly. Failures are never cached.
let cache: { at: number; report: WeatherReport } | null = null;

/** Public: current weather and short forecast for every destination with real coordinates. */
export const getDestinationWeather = createServerFn({ method: "GET" }).handler(
  async (): Promise<WeatherReport> => {
    if (cache && Date.now() - cache.at < WEATHER_CACHE_MS) return cache.report;
    const { data, error } = await supabase
      .from("destinations")
      .select("slug, name, lat, lng")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .order("name");
    if (error) {
      console.error("[weather] destinations:", error.message);
      return { status: "unavailable", source: WEATHER_SOURCE };
    }
    const report = await fetchWeatherReport(
      (data ?? []).map((d) => ({
        slug: d.slug,
        name: d.name,
        lat: Number(d.lat),
        lng: Number(d.lng),
      })),
    );
    if (report.status === "ok") cache = { at: Date.now(), report };
    return report;
  },
);
