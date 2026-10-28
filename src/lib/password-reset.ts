/**
 * Password recovery: /forgot-password sends the email (always the same answer, so it never reveals
 * whether an account exists), /auth/callback recognises the recovery link and /reset-password sets
 * the new password on the recovery session.
 */

export const MIN_PASSWORD_LENGTH = 6;
/** Set when a reset is requested in this browser; tells the callback that a ?code= link is a recovery. */
export const RECOVERY_FLAG = "ekaya.recovery";

export type ResetRequestError = "rate" | "email" | "network" | "generic";
export type NewPasswordError =
  | "short"
  | "mismatch"
  | "weak"
  | "same"
  | "expired"
  | "network"
  | "generic";

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

type AuthErr = { message?: string; status?: number; code?: string } | null | undefined;

export function resetRequestError(error: AuthErr): ResetRequestError | null {
  if (!error) return null;
  const m = (error.message ?? "").toLowerCase();
  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    /rate limit|security purposes/.test(m)
  )
    return "rate";
  if (/valid email|invalid email|email address/.test(m)) return "email";
  if (/fetch|network/.test(m)) return "network";
  return "generic";
}

export function newPasswordProblem(password: string, confirm: string): NewPasswordError | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "short";
  if (password !== confirm) return "mismatch";
  return null;
}

export function newPasswordError(error: AuthErr): NewPasswordError | null {
  if (!error) return null;
  const m = (error.message ?? "").toLowerCase();
  if (error.code === "same_password" || /different from the old|should be different/.test(m))
    return "same";
  if (
    error.code === "weak_password" ||
    /weak|pwned|easy to guess|known to be|at least \d+ characters/.test(m)
  )
    return "weak";
  if (error.status === 401 || /session|jwt|expired|not authenticated/.test(m)) return "expired";
  if (/fetch|network/.test(m)) return "network";
  return "generic";
}

/** Recovery links arrive as #...&type=recovery (implicit), ?type=recovery (token hash) or ?code= after a request here. */
export function isRecoveryReturn(
  search: URLSearchParams,
  hash: URLSearchParams,
  flagged: boolean,
): boolean {
  if (search.get("type") === "recovery" || hash.get("type") === "recovery") return true;
  return flagged && search.has("code");
}
