import { supabase } from "@/integrations/supabase/client";

/**
 * SEG-2 — two-factor authentication (TOTP) through Supabase Auth MFA.
 * Administrators need an aal2 session (password + code); the database enforces it in has_role (0050).
 */

export type Aal = "aal1" | "aal2";
export interface AalState {
  current: Aal | null;
  /** aal2 when the account has a verified factor (so the session can be raised to aal2). */
  next: Aal | null;
}

export interface TotpEnrollment {
  factorId: string;
  /** SVG data URL to show as an image. */
  qr: string;
  /** Base32 secret, for typing into the authenticator app when the QR cannot be scanned. */
  secret: string;
}

const FRIENDLY_NAME = "EKAYA";

/** Codes are six digits; spaces from copy/paste are ignored. */
export function normaliseCode(input: string): string | null {
  const code = input.replace(/\s+/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

export async function getAal(): Promise<AalState> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw new Error(error.message);
  return { current: (data.currentLevel as Aal) ?? null, next: (data.nextLevel as Aal) ?? null };
}

/** True when this session must still enter a code (verified factor, password-only session). */
export function needsCode(s: AalState): boolean {
  return s.current === "aal1" && s.next === "aal2";
}

/** The verified TOTP factor of the signed-in account, if any. */
export async function getVerifiedTotp(): Promise<{ id: string } | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  const f = data.totp.find((x) => x.status === "verified");
  return f ? { id: f.id } : null;
}

/** Starts enrolment. Unfinished earlier attempts are removed first (they block a new one). */
export async function startTotpEnrollment(): Promise<TotpEnrollment> {
  const { data: list, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) throw new Error(listError.message);
  for (const f of list.all.filter((x) => x.factor_type === "totp" && x.status !== "verified")) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: FRIENDLY_NAME,
  });
  if (error) throw new Error(error.message);
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Verifies a code for a factor (finishes enrolment, or raises the session to aal2). */
export async function verifyCode(factorId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw new Error(error.message);
}

/** Removing a verified factor needs an aal2 session (enforced by Supabase Auth). */
export async function removeTotp(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
}
