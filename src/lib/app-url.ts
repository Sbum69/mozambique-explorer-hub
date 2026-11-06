/**
 * Single source for the public base URL used in auth emails (confirmation, resend).
 * Configure VITE_PUBLIC_APP_URL (browser) and SITE_URL (server) with the definitive
 * public address once EKAYA is published. Private Lovable preview hosts are never
 * used as email destinations: without a configured URL we omit the redirect and the
 * backend falls back to its configured Site URL.
 */
import { CANONICAL_HOST, CANONICAL_ORIGIN } from "@/lib/app-info";

export const AUTH_CALLBACK_PATH = "/auth/callback";

const PRIVATE_HOST =
  /(^id-preview--|^preview--|\.lovableproject\.com$|^localhost$|^127\.0\.0\.1$)/i;

export function isPrivateHost(host: string) {
  return PRIVATE_HOST.test(host);
}

function normalizeBase(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || isPrivateHost(url.hostname)) return null;
    // www.exploreekaya.com redirects to the root: emails always point at the root domain.
    if (url.hostname === `www.${CANONICAL_HOST}`) return CANONICAL_ORIGIN;
    return url.origin;
  } catch {
    return null;
  }
}

/** Browser-side base URL, or null when no safe public URL is known. */
export function getAppBaseUrl(): string | null {
  const configured = normalizeBase(import.meta.env.VITE_PUBLIC_APP_URL as string | undefined);
  if (configured) return configured;
  if (typeof window === "undefined") return null;
  return normalizeBase(window.location.origin);
}

/** Full callback URL for confirmation emails, or undefined (backend Site URL is used). */
export function getAuthCallbackUrl(): string | undefined {
  const base = getAppBaseUrl();
  return base ? `${base}${AUTH_CALLBACK_PATH}` : undefined;
}
