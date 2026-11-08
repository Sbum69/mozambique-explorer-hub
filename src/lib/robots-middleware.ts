import { createMiddleware } from "@tanstack/react-start";

import { CANONICAL_HOST } from "@/lib/app-info";

/** True when a response for this host must stay out of search (anything but exploreekaya.com). */
export function noindexHost(hostname: string): boolean {
  return hostname.toLowerCase() !== CANONICAL_HOST;
}

/**
 * Every response served on another host (*.lovable.app preview, www before its redirect, local)
 * gets X-Robots-Tag: noindex, so search engines only index exploreekaya.com. robots.txt is the same
 * everywhere (public/robots.txt), so crawlers can see this header; canonical links point to
 * exploreekaya.com.
 */
export const noindexOffCanonical = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const result = await next();
    if (!noindexHost(new URL(request.url).hostname)) return result;
    try {
      result.response.headers.set("X-Robots-Tag", "noindex");
      return result;
    } catch {
      // Immutable headers: copy the response (the body stream is passed through, not read).
      const response = new Response(result.response.body, result.response);
      response.headers.set("X-Robots-Tag", "noindex");
      return response;
    }
  },
);
