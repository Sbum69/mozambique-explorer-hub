import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createUpstreamGuard } from "./upstream-guard";
import { WEATHER_SOURCE, fetchWeatherReport, type WeatherReport } from "./weather";

// One cached report per server instance, kept at least an hour and never less than MET Norway's
// Expires header (its terms forbid asking again earlier). Failures are never cached, but after one
// MET Norway is not asked again for a couple of minutes, and concurrent visitors share one request.
let cache: { until: number; report: WeatherReport } | null = null;
const guard = createUpstreamGuard<WeatherReport>((r) => r.status === "ok");
const unavailable = (): WeatherReport => ({ status: "unavailable", source: WEATHER_SOURCE });

async function loadReport(): Promise<WeatherReport> {
  const { data, error } = await supabase
    .from("destinations")
    .select("slug, name, lat, lng")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("name");
  if (error) {
    console.error("[weather] destinations:", error.message);
    return unavailable();
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
}

/** Public: current weather and short forecast for every destination with real coordinates. */
export const getDestinationWeather = createServerFn({ method: "GET" }).handler(
  async (): Promise<WeatherReport> => {
    if (cache && Date.now() < cache.until) return cache.report;
    return guard.run(loadReport, unavailable);
  },
);
