import { supabase } from "@/integrations/supabase/client";

/**
 * M6 — highlights and campaigns ("Patrocinado"), paid manually by M-Pesa for now. The rules live
 * in the database (0054): the price comes from commercial_configs, the reference, status and dates
 * are set only by the RPCs, and only the admin approves and confirms payments.
 */

export type PlacementKind = "highlight" | "campaign";
export type CampaignType = "dish" | "product" | "event" | "experience";
export type PlacementScope = "home" | "province" | "category";
export type PlacementDuration = "week" | "month";
export type PlacementStatus =
  | "requested"
  | "awaiting_payment"
  | "paid"
  | "active"
  | "expired"
  | "rejected"
  | "cancelled";

export const PLACEMENT_STATUSES: PlacementStatus[] = [
  "requested",
  "awaiting_payment",
  "paid",
  "active",
  "expired",
  "rejected",
  "cancelled",
];
export const CAMPAIGN_TYPES: CampaignType[] = ["dish", "product", "event", "experience"];

export interface Placement {
  id: string;
  reference: string;
  businessId: string;
  experienceId: string | null;
  kind: PlacementKind;
  campaignType: CampaignType | null;
  titlePt: string | null;
  titleEn: string | null;
  bodyPt: string | null;
  bodyEn: string | null;
  scope: PlacementScope;
  provinceId: string | null;
  categoryCode: string | null;
  duration: PlacementDuration;
  startsOn: string;
  endsOn: string;
  priceCents: number;
  free: boolean;
  configVersion: number;
  status: PlacementStatus;
  decisionReason: string | null;
  paymentNote: string | null;
  paidAt: string | null;
  createdAt: string;
}

type PlacementRow = {
  id: string;
  reference: string;
  business_id: string;
  experience_id: string | null;
  kind: string;
  campaign_type: string | null;
  title_pt: string | null;
  title_en: string | null;
  body_pt: string | null;
  body_en: string | null;
  scope: string;
  province_id: string | null;
  category_code: string | null;
  duration: string;
  starts_on: string;
  ends_on: string;
  price_cents: number;
  free: boolean;
  config_version: number;
  status: string;
  decision_reason: string | null;
  payment_note: string | null;
  paid_at: string | null;
  created_at: string;
};

export const placementFromRow = (r: PlacementRow): Placement => ({
  id: r.id,
  reference: r.reference,
  businessId: r.business_id,
  experienceId: r.experience_id,
  kind: r.kind as PlacementKind,
  campaignType: r.campaign_type as CampaignType | null,
  titlePt: r.title_pt,
  titleEn: r.title_en,
  bodyPt: r.body_pt,
  bodyEn: r.body_en,
  scope: r.scope as PlacementScope,
  provinceId: r.province_id,
  categoryCode: r.category_code,
  duration: r.duration as PlacementDuration,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  priceCents: Number(r.price_cents),
  free: r.free,
  configVersion: r.config_version,
  status: r.status as PlacementStatus,
  decisionReason: r.decision_reason,
  paymentNote: r.payment_note,
  paidAt: r.paid_at,
  createdAt: r.created_at,
});

/** Today in Mozambique (YYYY-MM-DD), the date the database uses for starts and expiry. */
export function maputoToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo" }).format(now);
}

/** End date shown before the request (the database computes the real one the same way). */
export function placementEnd(startsOn: string, duration: PlacementDuration): string {
  const [y, m, d] = startsOn.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (duration === "week") date.setUTCDate(date.getUTCDate() + 7);
  else {
    // Same as Postgres date + interval '1 month': clamps to the last day of the next month.
    const target = new Date(Date.UTC(y, m, 1));
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, last));
    return target.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

/** "4 nov. 2026" / "4 Nov 2026" from YYYY-MM-DD (read at noon UTC so no time zone moves the day). */
export const formatDay = (iso: string, lang: "pt" | "en") =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** The owner can cancel only before payment. */
export const ownerCanCancel = (s: PlacementStatus) => s === "requested" || s === "awaiting_payment";

/** Statuses the admin still has to act on. */
export const needsAdmin = (s: PlacementStatus) => s === "requested" || s === "awaiting_payment";

/** A receipt exists once the payment is confirmed (or the placement was free). */
export const hasReceipt = (p: Pick<Placement, "status" | "paidAt">) =>
  !!p.paidAt && (p.status === "paid" || p.status === "active" || p.status === "expired");

/** Error code from a database message (FORBIDDEN, NO_SLOTS…), or "generic". */
export function placementError(message: string): string {
  const m = message.match(
    /\b(FORBIDDEN|NO_SLOTS|INVALID_START|INVALID_DURATION|INVALID_EXPERIENCE|INVALID_TRANSITION|BUSINESS_NOT_APPROVED|REASON_REQUIRED|PAYMENT_NOTE_REQUIRED|NOT_AUTHENTICATED)\b/,
  );
  if (m) return m[1];
  if (/check constraint/i.test(message)) return "INVALID_INPUT";
  return "generic";
}

// ---------------------------------------------------------------------------------------------
// Business owner
// ---------------------------------------------------------------------------------------------

export async function fetchMyPlacements(businessId: string): Promise<Placement[]> {
  const { data, error } = await supabase
    .from("sponsored_placements")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as PlacementRow[]).map(placementFromRow);
}

export interface PlacementRequest {
  businessId: string;
  kind: PlacementKind;
  campaignType: CampaignType | null;
  scope: PlacementScope;
  provinceId: string | null;
  categoryCode: string | null;
  duration: PlacementDuration;
  startsOn: string;
  experienceId: string | null;
  titlePt: string;
  titleEn: string;
  bodyPt: string;
  bodyEn: string;
}

export async function requestPlacement(r: PlacementRequest): Promise<Placement> {
  const { data, error } = await supabase.rpc("request_sponsored_placement", {
    _business_id: r.businessId,
    _kind: r.kind,
    _campaign_type: r.kind === "campaign" ? r.campaignType : null,
    _scope: r.scope,
    _province_id: r.scope === "province" ? r.provinceId : null,
    _category_code: r.scope === "category" ? r.categoryCode : null,
    _duration: r.duration,
    _starts_on: r.startsOn,
    _experience_id: r.experienceId,
    _title_pt: r.titlePt.trim() || null,
    _title_en: r.titleEn.trim() || null,
    _body_pt: r.bodyPt.trim() || null,
    _body_en: r.bodyEn.trim() || null,
  });
  if (error) throw new Error(error.message);
  return placementFromRow(data as unknown as PlacementRow);
}

export async function cancelMyPlacement(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_my_placement", { _id: id, _reason: reason });
  if (error) throw new Error(error.message);
}

export interface PaymentConfig {
  version: number;
  mpesaNumber: string;
  accountName: string;
  instructionsPt: string;
  instructionsEn: string;
  createdAt: string;
}

/** M-Pesa instructions in force (null until the admin sets them). */
export async function fetchPaymentConfig(): Promise<PaymentConfig | null> {
  const { data, error } = await supabase
    .from("manual_payment_configs")
    .select("*")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data
    ? {
        version: data.version,
        mpesaNumber: data.mpesa_number,
        accountName: data.account_name,
        instructionsPt: data.instructions_pt,
        instructionsEn: data.instructions_en,
        createdAt: data.created_at,
      }
    : null;
}

// ---------------------------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------------------------

export interface AdminPlacement extends Placement {
  businessName: string;
}

export async function fetchAllPlacements(): Promise<AdminPlacement[]> {
  const { data, error } = await supabase
    .from("sponsored_placements")
    .select("*, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data as (PlacementRow & { businesses: { name: string } | null })[]).map((r) => ({
    ...placementFromRow(r),
    businessName: r.businesses?.name ?? "",
  }));
}

export type AdminDecision = "approve" | "paid" | "reject" | "cancel";

export async function decidePlacement(
  id: string,
  decision: AdminDecision,
  opts: { reason?: string; paymentNote?: string } = {},
): Promise<Placement> {
  const { data, error } = await supabase.rpc("admin_decide_placement", {
    _id: id,
    _decision: decision,
    _reason: opts.reason,
    _payment_note: opts.paymentNote,
  });
  if (error) throw new Error(error.message);
  return placementFromRow(data as unknown as PlacementRow);
}

export async function savePaymentConfig(c: {
  mpesaNumber: string;
  accountName: string;
  instructionsPt: string;
  instructionsEn: string;
  reason: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc("admin_set_manual_payment", {
    _mpesa_number: c.mpesaNumber,
    _account_name: c.accountName,
    _instructions_pt: c.instructionsPt,
    _instructions_en: c.instructionsEn,
    _reason: c.reason,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function saveSponsoredLimits(
  slotsPerScope: number,
  perPage: number,
  reason: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("admin_set_sponsored_limits", {
    _slots_per_scope: slotsPerScope,
    _per_page: perPage,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

// ---------------------------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------------------------

export interface SponsoredCard {
  id: string;
  businessId: string;
  businessName: string;
  experienceId: string | null;
  kind: PlacementKind;
  campaignType: CampaignType | null;
  titlePt: string | null;
  titleEn: string | null;
  bodyPt: string | null;
  bodyEn: string | null;
  endsOn: string;
}

/** Active placements for one place; the database already applies the per-page limit. */
export async function fetchActiveSponsored(
  scope: PlacementScope,
  target: { provinceId?: string; categoryCode?: string } = {},
): Promise<SponsoredCard[]> {
  const { data, error } = await supabase.rpc("active_sponsored", {
    _scope: scope,
    _province_id: target.provinceId,
    _category_code: target.categoryCode,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    businessId: r.business_id,
    businessName: r.business_name,
    experienceId: r.experience_id,
    kind: r.kind as PlacementKind,
    campaignType: r.campaign_type as CampaignType | null,
    titlePt: r.title_pt,
    titleEn: r.title_en,
    bodyPt: r.body_pt,
    bodyEn: r.body_en,
    endsOn: r.ends_on,
  }));
}
