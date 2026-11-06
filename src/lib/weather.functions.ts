import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { WEATHER_SOURCE, fetchWeatherReport, type WeatherReport } from "./weather";

// One cached report per server instance, kept at least an hour and never less than MET Norway's
// Expires header (its terms forbid asking again earlier). Failures are never cached.
let cache: { until: number; report: WeatherReport } | null = null;

/** Public: current weather and short forecast for every destination with real coordinates. */
export const getDestinationWeather = createServerFn({ method: "GET" }).handler(
  async (): Promise<WeatherReport> => {
    if (cache && Date.now() < cache.until) return cache.report;
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
    const { report, notBefore } = await fetchWeatherReport(
      (data ?? []).map((d) => ({
        slug: d.slug,
        name: d.name,
        lat: Number(d.lat),
        lng: Number(d.lng),
      })),
    );
    if (report.status === "ok") cache = { until: notBefore, report };
    return report;
  },
);
