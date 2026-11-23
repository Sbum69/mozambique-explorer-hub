import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { NEWS_CACHE_MS, NEWS_STALE_MS, fetchNewsFeed, type NewsFeed } from "./news";
import { createUpstreamGuard } from "./upstream-guard";

// One cached feed per language and server instance. Failures are never cached, but after one the
// feed is not asked again for a couple of minutes, and concurrent visitors share one request.
const cache = new Map<"pt" | "en", { at: number; feed: NewsFeed }>();
const guards = {
  pt: createUpstreamGuard<NewsFeed>((f) => f.status === "ok"),
  en: createUpstreamGuard<NewsFeed>((f) => f.status === "ok"),
};

/** Public: latest Mozambique headlines (Google News RSS), cached for 30 minutes. */
export const getLiveNews = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lang: z.enum(["pt", "en"]) }).parse(input))
  .handler(async ({ data }): Promise<NewsFeed> => {
    const hit = cache.get(data.lang);
    if (hit && Date.now() - hit.at < NEWS_CACHE_MS) return hit.feed;
    const feed = await guards[data.lang].run(
      () => fetchNewsFeed(data.lang),
      (): NewsFeed => ({ status: "unavailable" }),
    );
    if (feed.status === "ok") {
      cache.set(data.lang, { at: Date.now(), feed });
      return feed;
    }
    // A real but older feed (it carries its own fetch time) beats nothing; after 24 h it is dropped.
    return hit && Date.now() - hit.at < NEWS_STALE_MS ? hit.feed : feed;
  });
