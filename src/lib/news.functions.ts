import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { NEWS_CACHE_MS, NEWS_STALE_MS, fetchNewsFeed, type NewsFeed } from "./news";

// One cached feed per language and server instance. Failures are never cached.
const cache = new Map<"pt" | "en", { at: number; feed: NewsFeed }>();

/** Public: latest Mozambique headlines (Google News RSS), cached for 30 minutes. */
export const getLiveNews = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lang: z.enum(["pt", "en"]) }).parse(input))
  .handler(async ({ data }): Promise<NewsFeed> => {
    const hit = cache.get(data.lang);
    if (hit && Date.now() - hit.at < NEWS_CACHE_MS) return hit.feed;
    const feed = await fetchNewsFeed(data.lang);
    if (feed.status === "ok") {
      cache.set(data.lang, { at: Date.now(), feed });
      return feed;
    }
    // A real but older feed (it carries its own fetch time) beats nothing; after 24 h it is dropped.
    return hit && Date.now() - hit.at < NEWS_STALE_MS ? hit.feed : feed;
  });
