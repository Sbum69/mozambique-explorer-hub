/** App version shown in Settings → About. Change it with each release. */
export const APP_VERSION = "0.9.0";

/** Public address of the app: canonical links, sitemap and Open Graph. */
export const CANONICAL_ORIGIN = "https://exploreekaya.com";
export const CANONICAL_HOST = "exploreekaya.com";

/**
 * Turn on only when apoio@exploreekaya.com receives mail (launch/email). The address appears in the
 * Terms and the Privacy Policy: switching it changes their text, so bump LEGAL_VERSIONS and
 * current_legal_versions() in the same change.
 */
export const DOMAIN_EMAIL_LIVE = false;

/** Support contact published in the app and in the legal texts. */
export const SUPPORT_EMAIL = DOMAIN_EMAIL_LIVE
  ? "apoio@exploreekaya.com"
  : "sheldonesmad@gmail.com";

/**
 * Who runs EKAYA, as shown in the Terms and the Privacy Policy. `nuit: null` = registration in progress;
 * `phone: null` = not published.
 */
export const LEGAL_ENTITY = {
  name: "EKAYA",
  /** false = the company is still being incorporated (shown as "em constituição"). */
  incorporated: false,
  responsible: "Sheldon Jasse" as string | null,
  nuit: null as string | null,
  phone: null as string | null,
  /** Country where EKAYA operates and is being incorporated. */
  country: { pt: "Moçambique", en: "Mozambique" },
};
