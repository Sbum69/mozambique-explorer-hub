import { supabase } from "@/integrations/supabase/client";
import type { BookingStatus } from "@/lib/bookings";

/**
 * Admin actions. Every one is enforced on the server: SECURITY DEFINER RPCs that check has_role
 * admin, or admin-only RLS policies and the bookings_guard_update trigger — hiding a button is
 * never the protection.
 */

export const MIN_REASON_LENGTH = 3;

export function isValidReason(reason: string): boolean {
  return reason.trim().length >= MIN_REASON_LENGTH;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ---------- Businesses ----------
export async function setBusinessStatus(
  businessId: string,
  status: "suspended" | "approved",
  reason?: string,
): Promise<{ status: string; open_bookings: number }> {
  const { data, error } = await supabase.rpc("admin_set_business_status", {
    _business_id: businessId,
    _status: status,
    _reason: reason?.trim() || undefined,
  });
  if (error) throw new Error(error.message);
  return data as unknown as { status: string; open_bookings: number };
}

export async function assignBusinessOwner(businessId: string, email: string): Promise<void> {
  const { error } = await supabase.rpc("admin_assign_business_owner", {
    _business_id: businessId,
    _email: email.trim(),
  });
  if (error) throw new Error(error.message);
}

/** Pending or confirmed bookings of a business (shown before suspending it). */
export async function countOpenBookings(businessId: string): Promise<number> {
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .in("status", ["pending", "confirmed"]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ---------- Roles ----------
export type ManagedRole = "business_small" | "business_large" | "admin";

export async function setUserRole(
  userId: string,
  role: ManagedRole,
  grant: boolean,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("admin_set_user_role", {
    _user_id: userId,
    _role: role,
    _grant: grant,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as string[];
}

/** Marks a test/staff account as internal (left out of the metrics) or clears it. */
export async function setUserInternal(userId: string, internal: boolean): Promise<void> {
  const { error } = await supabase.rpc("admin_set_internal", {
    _user_id: userId,
    _internal: internal,
  });
  if (error) throw new Error(error.message);
}

// ---------- Bookings ----------
export interface AdminBooking {
  id: string;
  code: string;
  status: BookingStatus;
  date: string;
  time: string;
  people: number;
  customerName: string;
  decisionReason: string | null;
  experienceTitle: string;
  businessName: string;
  businessStatus: string;
}

export async function fetchAdminBookings(): Promise<AdminBooking[]> {
  const rows: AdminBooking[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, code, status, date, time, people, customer_name, decision_reason, experiences(title_pt), businesses(name, status)",
      )
      .order("date", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      const exp = r.experiences as { title_pt: string } | null;
      const biz = r.businesses as { name: string; status: string } | null;
      rows.push({
        id: r.id,
        code: r.code,
        status: r.status as BookingStatus,
        date: r.date,
        time: String(r.time).slice(0, 5),
        people: r.people,
        customerName: r.customer_name,
        decisionReason: r.decision_reason,
        experienceTitle: exp?.title_pt ?? "—",
        businessName: biz?.name ?? "—",
        businessStatus: biz?.status ?? "—",
      });
    }
    if ((data?.length ?? 0) < 500) break;
  }
  return rows;
}

/** bookings_guard_update lets an admin cancel a pending/confirmed booking only with a reason. */
export async function adminCancelBooking(id: string, reason: string): Promise<void> {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", decision_reason: reason.trim() })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("NOT_FOUND");
}

// ---------- Commercial activities ----------
export interface AdminExperience {
  id: string;
  titlePt: string;
  titleEn: string | null;
  active: boolean;
  priceMzn: number;
  businessName: string;
  businessStatus: string;
}

export async function fetchAdminExperiences(): Promise<AdminExperience[]> {
  const { data, error } = await supabase
    .from("experiences")
    .select("id, title_pt, title_en, active, price_mzn, businesses(name, status)")
    .order("title_pt");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const biz = r.businesses as { name: string; status: string } | null;
    return {
      id: r.id,
      titlePt: r.title_pt,
      titleEn: r.title_en,
      active: r.active,
      priceMzn: Number(r.price_mzn),
      businessName: biz?.name ?? "—",
      businessStatus: biz?.status ?? "—",
    };
  });
}

/** Admin-only RLS ("Admins can update any experience"). */
export async function setExperienceActive(id: string, active: boolean): Promise<void> {
  const { data, error } = await supabase
    .from("experiences")
    .update({ active })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("NOT_FOUND");
}

// ---------- Notices (admin_send_notification / admin_list_broadcasts, migration 0042) ----------
export type BroadcastAudience = "user" | "business_owners" | "all";

export interface BroadcastInput {
  audience: BroadcastAudience;
  userId: string | null;
  titlePt: string;
  titleEn: string;
  bodyPt: string;
  bodyEn: string;
  link: string;
}

export const BROADCAST_LIMITS = { title: 160, body: 2000, min: 2 } as const;

export type BroadcastProblem = "user" | "titlePt" | "titleEn" | "bodyPt" | "bodyEn" | "link";

/** Same rules as the admin_broadcasts CHECKs, so the admin sees the problem before sending. */
export function broadcastProblems(input: BroadcastInput): BroadcastProblem[] {
  const len = (s: string) => s.trim().length;
  const out: BroadcastProblem[] = [];
  if (input.audience === "user" && !input.userId) out.push("user");
  const { title, body, min } = BROADCAST_LIMITS;
  if (len(input.titlePt) < min || len(input.titlePt) > title) out.push("titlePt");
  if (len(input.titleEn) < min || len(input.titleEn) > title) out.push("titleEn");
  if (len(input.bodyPt) < min || len(input.bodyPt) > body) out.push("bodyPt");
  if (len(input.bodyEn) < min || len(input.bodyEn) > body) out.push("bodyEn");
  const link = input.link.trim();
  if (link && (!link.startsWith("/") || link.startsWith("//"))) out.push("link");
  return out;
}

export async function sendBroadcast(input: BroadcastInput): Promise<number> {
  const { data, error } = await supabase.rpc("admin_send_notification", {
    _audience: input.audience,
    _user_id: input.audience === "user" ? input.userId : null,
    _title_pt: input.titlePt.trim(),
    _title_en: input.titleEn.trim(),
    _body_pt: input.bodyPt.trim(),
    _body_en: input.bodyEn.trim(),
    _link: input.link.trim() || undefined,
  });
  if (error) throw new Error(error.message);
  return Number((data as { recipients?: number } | null)?.recipients ?? 0);
}

export interface BroadcastRecord {
  id: string;
  createdAt: string;
  sender: string | null;
  audience: BroadcastAudience;
  target: string | null;
  titlePt: string;
  titleEn: string;
  bodyPt: string;
  bodyEn: string;
  link: string | null;
  recipients: number;
}

export async function fetchBroadcasts(): Promise<BroadcastRecord[]> {
  const { data, error } = await supabase.rpc("admin_list_broadcasts", { _limit: 50 });
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    id: b.id,
    createdAt: b.created_at,
    sender: b.sender,
    audience: b.audience as BroadcastAudience,
    target: b.target,
    titlePt: b.title_pt,
    titleEn: b.title_en,
    bodyPt: b.body_pt,
    bodyEn: b.body_en,
    link: b.link,
    recipients: b.recipients,
  }));
}

// ---------- Errors ----------
const ERRORS: Record<string, [string, string]> = {
  forbidden: ["Só administradores podem fazer isto.", "Only administrators can do this."],
  reason_required: ["Indica um motivo (mín. 3 caracteres).", "Enter a reason (min. 3 characters)."],
  not_approved: [
    "Só negócios aprovados podem ser suspensos.",
    "Only approved businesses can be suspended.",
  ],
  not_suspended: ["Este negócio não está suspenso.", "This business is not suspended."],
  already_owned: ["Este negócio já tem dono.", "This business already has an owner."],
  user_not_found: [
    "Não existe nenhuma conta com esse email.",
    "No account exists with that email.",
  ],
  user_not_confirmed: [
    "Essa conta ainda não confirmou o email.",
    "That account has not confirmed its email yet.",
  ],
  user_is_admin: [
    "Contas de administrador não podem ser donas de negócios.",
    "Administrator accounts cannot own businesses.",
  ],
  user_has_business: ["Essa conta já tem um negócio.", "That account already has a business."],
  cannot_revoke_own_admin: [
    "Não podes retirar o teu próprio papel de administrador.",
    "You can't remove your own administrator role.",
  ],
  last_admin: [
    "Tem de existir pelo menos um administrador.",
    "There must be at least one administrator.",
  ],
  owns_business: [
    "Esta conta é dona de um negócio: o papel de negócio não pode ser retirado.",
    "This account owns a business: its business role can't be removed.",
  ],
  "final state": ["Esta reserva já está encerrada.", "This booking is already closed."],
  rate_limited: [
    "Limite atingido: no máximo 10 avisos por hora.",
    "Limit reached: at most 10 notices per hour.",
  ],
  invalid_audience: ["Público inválido.", "Invalid audience."],
  "check constraint": [
    "Texto ou ligação inválidos (títulos 2–160, textos 2–2000, ligação interna a começar por /).",
    "Invalid text or link (titles 2–160, texts 2–2000, internal link starting with /).",
  ],
  not_found: ["Registo não encontrado ou sem permissão.", "Record not found or not allowed."],
};

export function adminErrorText(message: string, lang: "pt" | "en"): string {
  const m = message.toLowerCase();
  const hit = Object.keys(ERRORS).find((k) => m.includes(k));
  if (hit) return ERRORS[hit][lang === "pt" ? 0 : 1];
  return lang === "pt"
    ? "Não foi possível concluir. Tenta novamente."
    : "Could not complete. Please try again.";
}
