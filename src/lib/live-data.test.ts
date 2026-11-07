import { describe, expect, it, vi } from "vitest";

import { fetchNewsFeed, parseGoogleNewsRss } from "./news";
import {
  MET_USER_AGENT,
  fetchWeatherReport,
  metKind,
  metUrl,
  parseMet,
  type WeatherPlace,
} from "./weather";

const NOW = () => new Date("2026-10-24T12:00:00Z");
const places: WeatherPlace[] = [
  { slug: "maputo", name: "Maputo", lat: -25.9692, lng: 32.5732 },
  { slug: "pemba", name: "Pemba", lat: -12.974, lng: 40.5178 },
];
// MET Norway Locationforecast "compact": times in UTC; Maputo is UTC+2.
const met = (temp: number, symbol = "partlycloudy_day") => ({
  properties: {
    meta: { updated_at: "2026-10-24T11:00:00Z" },
    timeseries: [
      {
        time: "2026-10-24T12:00:00Z",
        data: {
          instant: { details: { air_temperature: temp, wind_speed: 4.1 } },
          next_1_hours: { summary: { symbol_code: symbol } },
          next_6_hours: { summary: { symbol_code: symbol } },
        },
      },
      {
        time: "2026-10-24T18:00:00Z",
        data: {
          instant: { details: { air_temperature: temp - 5 } },
          next_6_hours: { summary: { symbol_code: "clearsky_night" } },
        },
      },
      {
        time: "2026-10-25T10:00:00Z",
        data: {
          instant: { details: { air_temperature: 27.6 } },
          next_6_hours: { summary: { symbol_code: "lightrainshowers_day" } },
        },
      },
      {
        time: "2026-10-25T23:00:00Z",
        data: {
          instant: { details: { air_temperature: 20.5 } },
          next_6_hours: { summary: { symbol_code: "rain" } },
        },
      },
    ],
  },
});
const json = (body: unknown, status = 200) =>
  vi.fn(
    async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;

describe("weather (MET Norway)", () => {
  it("maps MET Norway symbol codes to the icons shown", () => {
    expect(
      [
        "clearsky_day",
        "fair_night",
        "partlycloudy_polartwilight",
        "cloudy",
        "fog",
        "lightrain",
        "heavyrainshowers_day",
        "rainandthunder",
        "snow",
      ].map(metKind),
    ).toEqual(["clear", "clear", "cloud", "cloud", "fog", "rain", "rain", "storm", "rain"]);
  });

  it("asks for at most 4 decimals and identifies the app", () => {
    expect(metUrl(places[0])).toBe(
      "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-25.9692&lon=32.5732",
    );
    expect(metUrl({ ...places[1], lat: -12.97456789, lng: 40.51789 })).toContain(
      "lat=-12.9745&lon=40.5178",
    );
    expect(MET_USER_AGENT).toMatch(/^EkayaExplore\/[\d.]+ https:\/\/exploreekaya\.com$/);
  });

  it("parses current conditions (wind in km/h) and local days with max/min", () => {
    const city = parseMet(met(24.1), places[0]);
    expect(city).toMatchObject({ slug: "maputo", tempC: 24, windKmh: 15, kind: "cloud" });
    expect(city.days[0]).toEqual({ date: "2026-10-24", kind: "cloud", maxC: 24, minC: 19 });
    // 23:00 UTC on the 25th is already the 26th in Maputo, so the 25th has one value only.
    expect(city.days.map((d) => d.date)).toEqual(["2026-10-24"]);
  });

  it("returns ok with the fetch time and source, and respects Expires", async () => {
    const later = "Sat, 24 Oct 2026 14:30:00 GMT";
    const f = vi.fn(
      async () =>
        new Response(JSON.stringify(met(24)), { status: 200, headers: { expires: later } }),
    ) as unknown as typeof fetch;
    const r = await fetchWeatherReport(places, f, NOW);
    expect(r.report).toMatchObject({
      status: "ok",
      source: "MET Norway",
      fetchedAt: "2026-10-24T12:00:00.000Z",
    });
    expect(r.notBefore).toBe(Date.parse(later));
    const call = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect((call[1].headers as Record<string, string>)["User-Agent"]).toBe(MET_USER_AGENT);
  });

  it("keeps the cache at least one hour when Expires is sooner", async () => {
    const r = await fetchWeatherReport(places, json(met(24)), NOW);
    expect(r.notBefore).toBe(NOW().getTime() + 60 * 60 * 1000);
  });

  it("never invents numbers: errors and malformed bodies are left out or unavailable", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await fetchWeatherReport(places, json({ error: true }, 503), NOW)).report.status).toBe(
      "unavailable",
    );
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect((await fetchWeatherReport(places, down, NOW)).report.status).toBe("unavailable");
    const noTemp = met(24);
    (
      noTemp.properties.timeseries[0].data.instant.details as { air_temperature: unknown }
    ).air_temperature = null;
    expect((await fetchWeatherReport(places, json(noTemp), NOW)).report.status).toBe("unavailable");
    // One destination fails, the other answers: only the real one is shown.
    let n = 0;
    const half = vi.fn(async () =>
      n++ === 0
        ? new Response("x", { status: 500 })
        : new Response(JSON.stringify(met(30)), { status: 200 }),
    ) as unknown as typeof fetch;
    const r = await fetchWeatherReport(places, half, NOW);
    expect(r.report.status === "ok" && r.report.cities.map((c) => c.tempC)).toEqual([30]);
    expect((await fetchWeatherReport([], json({}), NOW)).report.status).toBe("unavailable");
    err.mockRestore();
  });
});

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Google News</title>
<item><title>Academia deve encontrar soluções locais - aimnews.org</title><link>https://news.google.com/rss/articles/abc?oc=5</link><pubDate>Fri, 23 Oct 2026 08:00:00 GMT</pubDate><source url="https://aimnews.org">aimnews.org</source></item>
<item><title>Mais recente &amp; importante - Jornal Notícias</title><link>https://news.google.com/rss/articles/def</link><pubDate>Sat, 24 Oct 2026 07:30:00 GMT</pubDate><source url="https://jornalnoticias.co.mz">Jornal Notícias</source></item>
<item><title>Sem data - X</title><link>https://news.google.com/rss/articles/ghi</link><pubDate>ontem</pubDate><source url="https://x">X</source></item>
<item><title>Link inválido</title><link>javascript:alert(1)</link><pubDate>Sat, 24 Oct 2026 07:30:00 GMT</pubDate></item>
</channel></rss>`;

describe("DADOS-1 news (Google News RSS)", () => {
  it("parses items, strips the source suffix, decodes entities and sorts newest first", () => {
    const items = parseGoogleNewsRss(RSS);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: "Mais recente & importante",
      link: "https://news.google.com/rss/articles/def",
      source: "Jornal Notícias",
      pubDate: "2026-10-24T07:30:00.000Z",
    });
    expect(items[1].title).toBe("Academia deve encontrar soluções locais");
  });

  it("drops items without a valid date or an http(s) link instead of patching them", () => {
    const titles = parseGoogleNewsRss(RSS).map((i) => i.title);
    expect(titles).not.toContain("Sem data");
    expect(titles).not.toContain("Link inválido");
  });

  it("returns ok with the fetch time when the feed answers", async () => {
    const f = await fetchNewsFeed("pt", json(RSS), NOW);
    expect(f).toMatchObject({ status: "ok", fetchedAt: "2026-10-24T12:00:00.000Z" });
  });

  it("HTTP error, network error, HTML page or empty feed → unavailable", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await fetchNewsFeed("en", json("", 502), NOW)).status).toBe("unavailable");
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect((await fetchNewsFeed("en", down, NOW)).status).toBe("unavailable");
    expect((await fetchNewsFeed("en", json("<html>consent</html>"), NOW)).status).toBe(
      "unavailable",
    );
    expect(
      (await fetchNewsFeed("en", json('<rss version="2.0"><channel></channel></rss>'), NOW)).status,
    ).toBe("unavailable");
    err.mockRestore();
  });
});
