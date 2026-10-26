import { describe, expect, it, vi } from "vitest";

import { fetchNewsFeed, parseGoogleNewsRss } from "./news";
import { fetchWeatherReport, parseOpenMeteo, weatherKind, type WeatherPlace } from "./weather";

const NOW = () => new Date("2026-10-24T12:00:00Z");
const places: WeatherPlace[] = [
  { slug: "maputo", name: "Maputo", lat: -25.9692, lng: 32.5732 },
  { slug: "pemba", name: "Pemba", lat: -12.974, lng: 40.5178 },
];
const location = (temp: number) => ({
  current: {
    time: "2026-10-24T18:00",
    temperature_2m: temp,
    weather_code: 3,
    wind_speed_10m: 14.6,
  },
  daily: {
    time: ["2026-10-24", "2026-10-25"],
    weather_code: [3, 61],
    temperature_2m_max: [29.4, 27.6],
    temperature_2m_min: [19.2, 20.5],
  },
});
const json = (body: unknown, status = 200) =>
  vi.fn(
    async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;

describe("DADOS-1 weather (Open-Meteo)", () => {
  it("maps WMO codes to the icons shown", () => {
    expect([0, 1, 2, 3, 45, 61, 80, 95].map(weatherKind)).toEqual([
      "clear",
      "clear",
      "cloud",
      "cloud",
      "fog",
      "rain",
      "rain",
      "storm",
    ]);
  });

  it("parses one entry per destination, rounding values", () => {
    const [maputo, pemba] = parseOpenMeteo([location(24.1), location(30.6)], places);
    expect(maputo).toMatchObject({ slug: "maputo", tempC: 24, windKmh: 15, kind: "cloud" });
    expect(pemba.tempC).toBe(31);
    expect(maputo.days[1]).toEqual({ date: "2026-10-25", kind: "rain", maxC: 28, minC: 21 });
  });

  it("returns ok with the fetch time and source when the API answers", async () => {
    const r = await fetchWeatherReport(places, json([location(24), location(30)]), NOW);
    expect(r).toMatchObject({
      status: "ok",
      source: "Open-Meteo",
      fetchedAt: "2026-10-24T12:00:00.000Z",
    });
  });

  it("never invents numbers: HTTP error, network error or malformed body → unavailable", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await fetchWeatherReport(places, json({ error: true }, 503), NOW)).status).toBe(
      "unavailable",
    );
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect((await fetchWeatherReport(places, down, NOW)).status).toBe("unavailable");
    expect((await fetchWeatherReport(places, json([location(24)]), NOW)).status).toBe(
      "unavailable",
    );
    const missingTemp = {
      ...location(24),
      current: { ...location(24).current, temperature_2m: null },
    };
    expect((await fetchWeatherReport(places, json([missingTemp, location(30)]), NOW)).status).toBe(
      "unavailable",
    );
    expect((await fetchWeatherReport([], json([]), NOW)).status).toBe("unavailable");
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
