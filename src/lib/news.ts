/**
 * Live news about Mozambique from the Google News RSS feed (the source /news-alerts already used).
 * Parsed on the server (news.functions.ts) so the browser no longer depends on a third-party proxy.
 */

export const NEWS_SOURCE = "Google News";
export const NEWS_CACHE_MS = 30 * 60 * 1000;
/** A cached feed older than this is not shown when the live fetch fails. */
export const NEWS_STALE_MS = 24 * 60 * 60 * 1000;

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

export type NewsFeed =
  | { status: "ok"; fetchedAt: string; items: NewsItem[] }
  | { status: "unavailable" };

export function googleNewsUrl(lang: "pt" | "en"): string {
  return lang === "pt"
    ? "https://news.google.com/rss/search?q=Mo%C3%A7ambique&hl=pt-PT&gl=MZ&ceid=MZ:pt-150"
    : "https://news.google.com/rss/search?q=Mozambique&hl=en&gl=MZ&ceid=MZ:en";
}

function decode(s: string): string {
  return s
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();
}

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : "";
};

/** Parses RSS items; items without a title, an http(s) link or a valid date are dropped, never patched. */
export function parseGoogleNewsRss(xml: string, limit = 12): NewsItem[] {
  if (!/<rss[\s>]/.test(xml)) throw new Error("NEWS_NOT_RSS");
  const items: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const raw = m[1];
    const source = tag(raw, "source");
    let title = tag(raw, "title");
    // Google appends " - Source" to every title.
    if (source && title.endsWith(` - ${source}`))
      title = title.slice(0, -(source.length + 3)).trim();
    const link = tag(raw, "link");
    const date = new Date(tag(raw, "pubDate"));
    if (!title || !/^https?:\/\//.test(link) || Number.isNaN(date.getTime())) continue;
    items.push({ title, link, source: source || NEWS_SOURCE, pubDate: date.toISOString() });
    if (items.length >= limit) break;
  }
  return items.sort((a, b) => b.pubDate.localeCompare(a.pubDate));
}

/** Fetches and parses the feed; any failure (network, HTTP, not RSS, no valid item) becomes "unavailable". */
export async function fetchNewsFeed(
  lang: "pt" | "en",
  fetchImpl: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<NewsFeed> {
  try {
    const res = await fetchImpl(googleNewsUrl(lang), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseGoogleNewsRss(await res.text());
    if (!items.length) throw new Error("NEWS_EMPTY");
    return { status: "ok", fetchedAt: now().toISOString(), items };
  } catch (e) {
    console.error("[news] live feed failed:", e instanceof Error ? e.message : e);
    return { status: "unavailable" };
  }
}
