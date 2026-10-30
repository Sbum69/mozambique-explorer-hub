/** App version shown in Settings → About. Change it with each release. */
export const APP_VERSION = "0.9.0";

/** Support contact published in the app and in the legal texts (temporary, until there is a domain). */
export const SUPPORT_EMAIL = "sheldonesmad@gmail.com";

/**
 * Who runs EKAYA, as shown in the Terms and the Privacy Policy. `nuit: null` = registration in progress;
 * `phone: null` = not published. The responsible person's name is added when it is supplied.
 */
export const LEGAL_ENTITY = {
  name: "EKAYA",
  /** false = the company is still being incorporated (shown as "em constituição"). */
  incorporated: false,
  responsible: null as string | null,
  nuit: null as string | null,
  phone: null as string | null,
};
