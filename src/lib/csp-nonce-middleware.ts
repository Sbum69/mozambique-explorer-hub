import { createMiddleware } from "@tanstack/react-start";

import { createCspNonce, reportOnlyContentSecurityPolicy } from "@/lib/security-headers";

export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";

/** True for page responses (the only ones whose inline scripts the policy is about). */
export function isHtmlResponse(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").toLowerCase().includes("text/html");
}

/**
 * CSP test mode (docs/security/CSP-INLINE.md): one nonce per request, given to the router (src/router.tsx
 * reads it through the request context and puts it on every inline script and on
 * <meta property="csp-nonce">, which the browser router reads when it hydrates). HTML responses
 * get a Content-Security-Policy-Report-Only header with that nonce. The enforced CSP (root route)
 * does not change.
 */
export const cspNonceReportOnly = createMiddleware({ type: "request" }).server(async ({ next }) => {
  const nonce = createCspNonce();
  const result = await next({ context: { nonce } });
  if (!isHtmlResponse(result.response)) return result;
  const policy = reportOnlyContentSecurityPolicy(import.meta.env.VITE_SUPABASE_URL, nonce);
  try {
    result.response.headers.set(CSP_REPORT_ONLY_HEADER, policy);
    return result;
  } catch {
    // Immutable headers: copy the response (the body stream is passed through, not read).
    const response = new Response(result.response.body, result.response);
    response.headers.set(CSP_REPORT_ONLY_HEADER, policy);
    return response;
  }
});
