import { z } from "zod";

const text = z.string().trim().min(1).max(500);

/**
 * Business fields only. The owner is always the authenticated caller (server-side context.userId);
 * account fields (email, password, redirect) and approval fields are not part of this schema and
 * are stripped if sent.
 */
export const businessRegistrationSchema = z.object({
  businessName: z.string().trim().min(2).max(500),
  businessType: z.enum(["small", "large"]),
  /** business_categories.code — must be an active category. */
  category: text,
  /** provinces.code — must be an active province. */
  provinceCode: text,
  location: text,
  description: z.string().trim().min(1).max(5000),
  contact: z.string().trim().min(1).max(80),
});

export type BusinessRegistrationInput = z.infer<typeof businessRegistrationSchema>;

export type BusinessRegistrationError =
  | "UNAVAILABLE"
  | "ADMIN_ACCOUNT"
  | "ALREADY_HAS_BUSINESS"
  | "INVALID_PROVINCE"
  | "INVALID_CATEGORY"
  | "BUSINESS_FAILED"
  | "ROLE_FAILED";

export type BusinessRegistrationResult =
  | { ok: true }
  | { ok: false; error: BusinessRegistrationError };

/**
 * Error of the business insert. Two simultaneous registrations can both pass the eligibility read;
 * the unique index businesses_owner_id_key (one business per account) then refuses the second.
 */
export function businessInsertError(
  error: { code?: string | null; message?: string | null } | null,
): BusinessRegistrationError {
  if (error?.code === "23505" && (error.message ?? "").includes("businesses_owner_id_key"))
    return "ALREADY_HAS_BUSINESS";
  return "BUSINESS_FAILED";
}
